export const config = { runtime: 'edge' };

/* Daleel — University enrichment endpoint (hybrid data)
   1. US College Scorecard (official US DOE) for real admissions/cost/location stats
   2. OpenStreetMap Overpass for nearby grocery / food / transit
   Returns { found:false } when the school isn't in Scorecard (e.g. UK/Canada/
   Europe) so the frontend can fall back to the AI-generated notes. */

const SCORECARD_FIELDS = [
  'id', 'school.name', 'school.city', 'school.state',
  'latest.admissions.admission_rate.overall',
  'latest.admissions.sat_scores.overall.midpoint',
  'latest.admissions.act_scores.midpoint.cumulative',
  'latest.student.size',
  'latest.cost.attendance.academic_year',
  'location.lat', 'location.lon',
].join(',');

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 's-maxage=86400' },
  });
}

async function fetchScorecard(name, apiKey) {
  const url = `https://api.data.gov/ed/collegescorecard/v1/schools?api_key=${apiKey}` +
    `&school.name=${encodeURIComponent(name)}&fields=${SCORECARD_FIELDS}&per_page=1`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data?.results?.[0] || null;
}

async function fetchNeighborhood(lat, lon) {
  const q = `[out:json][timeout:18];(` +
    `node["shop"="supermarket"](around:1500,${lat},${lon});` +
    `node["shop"="convenience"](around:1200,${lat},${lon});` +
    `node["amenity"="restaurant"](around:1200,${lat},${lon});` +
    `node["amenity"="cafe"](around:1200,${lat},${lon});` +
    `node["amenity"="fast_food"](around:1200,${lat},${lon});` +
    `node["railway"="station"](around:2200,${lat},${lon});` +
    `node["public_transport"="station"](around:2200,${lat},${lon});` +
    `);out body 80;`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 14000);
  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Daleel/1.0 (Saudi college guidance tool)',
      },
      body: 'data=' + encodeURIComponent(q),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const groceries = [], restaurants = [], transit = [];
    for (const el of (data.elements || [])) {
      const tg = el.tags || {};
      const nm = tg.name;
      if (!nm) continue;
      if (tg.shop === 'supermarket' || tg.shop === 'convenience') {
        if (!groceries.includes(nm)) groceries.push(nm);
      } else if (tg.amenity === 'restaurant' || tg.amenity === 'cafe' || tg.amenity === 'fast_food') {
        if (!restaurants.includes(nm)) restaurants.push(nm);
      } else if (tg.railway === 'station' || tg.public_transport === 'station') {
        if (!transit.includes(nm)) transit.push(nm);
      }
    }
    return {
      groceries: groceries.slice(0, 6),
      restaurants: restaurants.slice(0, 8),
      transit: transit.slice(0, 6),
      counts: { groceries: groceries.length, restaurants: restaurants.length, transit: transit.length },
    };
  } catch {
    return null; // Overpass slow / unavailable — degrade gracefully
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    } });
  }

  // Accept name from query (?name=) or POST body { name }
  let name = '';
  try {
    const u = new URL(req.url);
    name = u.searchParams.get('name') || '';
    if (!name && req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      name = body.name || '';
    }
  } catch { /* ignore */ }

  name = (name || '').trim();
  if (!name) return json({ found: false, reason: 'no_name' }, 400);

  const apiKey = process.env.COLLEGE_SCORECARD_API_KEY;
  if (!apiKey) return json({ found: false, reason: 'no_key' });

  let school;
  try {
    school = await fetchScorecard(name, apiKey);
  } catch {
    return json({ found: false, reason: 'scorecard_error' });
  }
  if (!school) return json({ found: false, reason: 'not_found' });

  const admitRate = school['latest.admissions.admission_rate.overall'];
  const size = school['latest.student.size'];
  const lat = school['location.lat'];
  const lon = school['location.lon'];

  // Scorecard has no raw "# applicants" — estimate from enrollment ÷ admit rate.
  const applicantEstimate = (admitRate && size) ? Math.round(size / admitRate) : null;

  const neighborhood = (lat != null && lon != null) ? await fetchNeighborhood(lat, lon) : null;

  return json({
    found: true,
    source: 'scorecard',
    name: school['school.name'],
    city: school['school.city'],
    state: school['school.state'],
    admissionRate: admitRate != null ? Math.round(admitRate * 1000) / 10 : null, // %
    satMidpoint: school['latest.admissions.sat_scores.overall.midpoint'] ?? null,
    actMidpoint: school['latest.admissions.act_scores.midpoint.cumulative'] ?? null,
    enrollment: size ?? null,
    applicantEstimate,
    annualCost: school['latest.cost.attendance.academic_year'] ?? null,
    lat, lon,
    neighborhood,
  });
}
