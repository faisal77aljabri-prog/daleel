export const config = { runtime: 'edge' };

/* Daleel — Global university search proxy.
   Proxies the keyless Hipolabs Universities API (covers ~10k institutions
   worldwide: name, country, website) so the browser avoids CORS / mixed-
   content issues. Returns a trimmed, de-duplicated, capped list. */

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 's-maxage=86400' },
  });
}

export default async function handler(req) {
  let name = '', country = '';
  try {
    const u = new URL(req.url);
    name = (u.searchParams.get('name') || '').trim();
    country = (u.searchParams.get('country') || '').trim();
  } catch { /* ignore */ }

  if (!name && !country) return json({ results: [], reason: 'no_query' }, 400);

  const params = [];
  if (name) params.push('name=' + encodeURIComponent(name));
  if (country) params.push('country=' + encodeURIComponent(country));
  const url = 'http://universities.hipolabs.com/search?' + params.join('&');

  let data;
  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return json({ results: [], reason: 'upstream_' + res.status });
    data = await res.json();
  } catch {
    return json({ results: [], reason: 'fetch_error' });
  }

  const seen = new Set();
  const results = (Array.isArray(data) ? data : [])
    .map(d => ({
      name: d.name,
      country: d.country,
      code: d.alpha_two_code || '',
      website: (d.web_pages && d.web_pages[0]) || '',
      domain: (d.domains && d.domains[0]) || '',
    }))
    .filter(d => {
      if (!d.name) return false;
      const key = d.name.toLowerCase() + '|' + (d.country || '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 60);

  return json({ results, count: results.length });
}
