/* ============================================================
   College Search — global university lookup + per-major deep dive
   Data: Hipolabs (via /api/unisearch) for the worldwide list,
   Wikipedia for photo/summary, College Scorecard (/api/university)
   for US stats, and Llama (callAI) for the major-specific deep dive.
   All globals are cs-prefixed.
   ============================================================ */

function csIsAr() { return (typeof currentLang !== 'undefined' && currentLang === 'ar'); }
let csCurrent = null; // currently selected { name, country, website }

function csEsc(s) {
  return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Search ─────────────────────────────────────────────────── */
async function csSearch(e) {
  if (e && e.preventDefault) e.preventDefault();
  const q = (document.getElementById('csQuery')?.value || '').trim();
  const country = (document.getElementById('csCountry')?.value || '').trim();
  const out = document.getElementById('csResults');
  if (!q && !country) { out.innerHTML = `<p class="cs-hint">${csIsAr()?'اكتب اسم جامعة للبحث':'Type a university name to search'}</p>`; return; }
  out.innerHTML = `<div class="loading-overlay visible" style="position:relative;padding:30px"><div class="spinner"></div><span>${csIsAr()?'جارٍ البحث…':'Searching universities…'}</span></div>`;

  try {
    const params = new URLSearchParams();
    if (q) params.set('name', q);
    if (country) params.set('country', country);
    const res = await fetch('/api/unisearch?' + params.toString());
    const data = await res.json();
    const list = data.results || [];
    if (!list.length) { out.innerHTML = `<p class="cs-hint">${csIsAr()?'لا نتائج. جرّب اسماً آخر.':'No matches. Try a different spelling or add a country.'}</p>`; return; }
    out.innerHTML = `<div class="cs-grid">${list.map(u => `
      <button class="cs-card" onclick='csSelect(${JSON.stringify(u).replace(/'/g, "&#39;")})'>
        <span class="cs-card-flag">${csFlag(u.code)}</span>
        <span class="cs-card-body">
          <span class="cs-card-name">${csEsc(u.name)}</span>
          <span class="cs-card-country">${csEsc(u.country)}</span>
        </span>
        <span class="cs-card-arrow">→</span>
      </button>`).join('')}</div>`;
  } catch (err) {
    out.innerHTML = `<p class="cs-hint" style="color:#c33">${csIsAr()?'خطأ في البحث':'Search error'}: ${csEsc(err.message)}</p>`;
  }
}

function csFlag(code) {
  if (!code || code.length !== 2) return '🏛️';
  const cp = [...code.toUpperCase()].map(c => 0x1F1E6 + (c.charCodeAt(0) - 65));
  try { return String.fromCodePoint(...cp); } catch { return '🏛️'; }
}

/* ── Select a university → detail panel ─────────────────────── */
async function csSelect(u) {
  csCurrent = u;
  const panel = document.getElementById('csDetail');
  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const profMajor = (window.daleelProfile?.get?.().major) || '';
  panel.innerHTML = `
    <div class="cs-detail-hero" id="csHero">
      <div class="cs-hero-overlay"></div>
      <div class="cs-hero-text">
        <h2>${csEsc(u.name)}</h2>
        <p>${csFlag(u.code)} ${csEsc(u.country)}${u.website ? ` · <a href="${csEsc(u.website)}" target="_blank" rel="noopener">${csIsAr()?'الموقع الرسمي':'Official site'} ↗</a>` : ''}</p>
      </div>
    </div>

    <div class="cs-detail-body">
      <div id="csWiki" class="cs-wiki"><div class="loading-overlay visible" style="position:relative;padding:18px"><div class="spinner"></div><span>${csIsAr()?'جارٍ جلب المعلومات…':'Fetching overview…'}</span></div></div>
      <div id="csStats" class="cs-stats"></div>

      <div class="cs-major-box">
        <h3>🎓 ${csIsAr()?'تعمّق حسب تخصصك':'Deep-dive by your major'}</h3>
        <p class="cs-hint">${csIsAr()?'احصل على صفحتين من المعلومات عن دراسة تخصصك في هذه الجامعة — المقررات، التخصصات الدقيقة، الأبحاث، القبول، والمستقبل المهني.':'Get ~2 pages on studying your major here — courses, concentrations, research, admissions, and career outcomes.'}</p>
        <div class="cs-major-row">
          <input type="text" id="csMajor" placeholder="${csIsAr()?'مثال: علوم الحاسب':'e.g., Computer Science'}" value="${csEsc(profMajor)}" />
          <button class="btn btn-primary" onclick="csDeepDive()">✨ ${csIsAr()?'تعمّق':'Generate Deep-Dive'}</button>
        </div>
      </div>
      <div id="csDeepResult" class="cs-result"></div>
    </div>`;

  csLoadWiki(u);
  csLoadStats(u);
}

/* Wikipedia photo + summary (keyless, via app.js helper) */
async function csLoadWiki(u) {
  const wikiEl = document.getElementById('csWiki');
  const hero = document.getElementById('csHero');
  try {
    const vis = (typeof fetchUniVisual === 'function') ? await fetchUniVisual(u.name) : { image: null, extract: null };
    if (vis.image && hero) hero.style.backgroundImage = `url('${vis.image}')`, hero.classList.add('has-photo');
    if (!csCurrent || csCurrent.name !== u.name) return;
    wikiEl.innerHTML = vis.extract
      ? `<p>${csEsc(vis.extract)}</p>`
      : `<p class="cs-hint">${csIsAr()?'لا يوجد ملخص متاح.':'No summary available.'}</p>`;
  } catch {
    wikiEl.innerHTML = `<p class="cs-hint">${csIsAr()?'تعذّر جلب الملخص.':'Could not load summary.'}</p>`;
  }
}

/* US College Scorecard real stats, if available */
async function csLoadStats(u) {
  const el = document.getElementById('csStats');
  try {
    const res = await fetch('/api/university?name=' + encodeURIComponent(u.name));
    const d = await res.json();
    if (!csCurrent || csCurrent.name !== u.name) return;
    if (!d || !d.found) { el.innerHTML = ''; return; }
    const money = v => (v != null ? '$' + Number(v).toLocaleString() : '—');
    const stats = [
      [csIsAr()?'نسبة القبول':'Admit rate', d.admissionRate != null ? d.admissionRate + '%' : '—'],
      ['SAT', d.satMidpoint || '—'],
      ['ACT', d.actMidpoint || '—'],
      [csIsAr()?'عدد الطلاب':'Enrollment', d.enrollment ? Number(d.enrollment).toLocaleString() : '—'],
      [csIsAr()?'التكلفة السنوية':'Annual cost', money(d.annualCost)],
    ];
    el.innerHTML = `<div class="cs-stat-grid">${stats.map(([k,v]) => `<div class="cs-stat"><span class="cs-stat-v">${csEsc(v)}</span><span class="cs-stat-k">${csEsc(k)}</span></div>`).join('')}</div>
      <p class="cs-hint" style="margin-top:6px">${csIsAr()?'مصدر: College Scorecard (وزارة التعليم الأمريكية)':'Source: U.S. College Scorecard'}</p>`;
  } catch { el.innerHTML = ''; }
}

/* ── AI deep-dive on the chosen major ───────────────────────── */
async function csDeepDive() {
  const major = (document.getElementById('csMajor')?.value || '').trim();
  const out = document.getElementById('csDeepResult');
  if (!csCurrent) return;
  if (!major) { out.innerHTML = `<p class="cs-hint" style="color:#c33">${csIsAr()?'أدخل التخصص':'Enter a major first'}</p>`; return; }
  out.innerHTML = `<div class="loading-overlay visible" style="position:relative;padding:30px"><div class="spinner"></div><span>${csIsAr()?'جارٍ إعداد التحليل المفصّل…':'Building your in-depth report…'}</span></div>`;

  const lang = csIsAr() ? 'Respond ENTIRELY in Arabic (keep JSON keys in English).' : 'Respond in English.';
  const sys = `You are a meticulous college advisor for SAUDI students. Produce a DETAILED (~2 pages) report on studying a given major at a specific university. Use accurate, well-known facts; where exact specifics aren't certain, give realistic, clearly-general guidance (do not invent fake course codes). ${lang}
Return ONLY JSON:
{
 "summary":"2-4 sentence overview of studying this major here",
 "whyHere":["4-6 concrete reasons / strengths"],
 "coreCourses":[{"name":"course","desc":"1 line"} x 8-12 foundational courses typical for this major],
 "advancedCourses":[{"name":"course","desc":"1 line"} x 6-10 upper-level/elective courses],
 "specializations":["concentrations / tracks available"],
 "research":"paragraph on research areas, labs, undergrad research options",
 "facilities":"paragraph on relevant facilities / resources",
 "admissions":"what this program looks for, selectivity for THIS major, prerequisites, portfolio/tests",
 "careerOutcomes":"paragraph: typical roles, employers, and salary ranges for graduates",
 "saudiNotes":"Saudi-specific: Aramco CPP fit, Saudi student community, halal/prayer, visa, scholarships (KASP), what Saudi grads do",
 "standOut":["4-6 ways a Saudi applicant can stand out for THIS major here"]
}`;
  const user = `University: ${csCurrent.name} (${csCurrent.country})\nIntended major: ${major}`;

  let full = '';
  try {
    await new Promise((resolve, reject) => {
      callAI([{ role:'system', content: sys }, { role:'user', content: user }],
        (t) => { full += t; }, () => resolve(), (e) => reject(e));
    });
    const d = parseAIJSON(full);
    if (!d || !d.summary) throw new Error(csIsAr()?'تعذّر إنشاء التقرير':'Could not build the report');
    out.innerHTML = csRenderDeepDive(d, major);
    out.scrollIntoView({ behavior:'smooth', block:'nearest' });
  } catch (e) {
    out.innerHTML = `<div class="callout callout-danger"><span class="callout-icon">⚠️</span><div class="callout-content"><p>${csEsc(e.message||e)}</p></div></div>`;
  }
}

function csRenderDeepDive(d, major) {
  const t = (ar, en) => csIsAr() ? ar : en;
  const courseList = arr => (arr||[]).map(c => `<li><strong>${csEsc(c.name)}</strong>${c.desc?` — ${csEsc(c.desc)}`:''}</li>`).join('');
  const bullets = arr => (arr||[]).map(x => `<li>${csEsc(x)}</li>`).join('');
  const chips = arr => (arr||[]).map(x => `<span class="cs-chip">${csEsc(x)}</span>`).join('');
  return `
    <div class="cs-report">
      <h3 class="cs-report-title">${csEsc(major)} @ ${csEsc(csCurrent.name)}</h3>
      <p class="cs-report-summary">${csEsc(d.summary)}</p>

      ${d.whyHere?.length ? `<div class="cs-report-sec"><h4>✅ ${t('لماذا هنا','Why study it here')}</h4><ul>${bullets(d.whyHere)}</ul></div>`:''}
      ${d.specializations?.length ? `<div class="cs-report-sec"><h4>🧭 ${t('التخصصات الدقيقة','Specializations / Tracks')}</h4><div class="cs-chips">${chips(d.specializations)}</div></div>`:''}
      ${d.coreCourses?.length ? `<div class="cs-report-sec"><h4>📘 ${t('المقررات الأساسية','Core Courses')}</h4><ul class="cs-courses">${courseList(d.coreCourses)}</ul></div>`:''}
      ${d.advancedCourses?.length ? `<div class="cs-report-sec"><h4>📗 ${t('مقررات متقدمة / اختيارية','Advanced & Elective Courses')}</h4><ul class="cs-courses">${courseList(d.advancedCourses)}</ul></div>`:''}
      ${d.research ? `<div class="cs-report-sec"><h4>🔬 ${t('الأبحاث والفرص','Research & Opportunities')}</h4><p>${csEsc(d.research)}</p></div>`:''}
      ${d.facilities ? `<div class="cs-report-sec"><h4>🏛️ ${t('المرافق والموارد','Facilities & Resources')}</h4><p>${csEsc(d.facilities)}</p></div>`:''}
      ${d.admissions ? `<div class="cs-report-sec"><h4>📝 ${t('القبول لهذا التخصص','Admissions for this major')}</h4><p>${csEsc(d.admissions)}</p></div>`:''}
      ${d.careerOutcomes ? `<div class="cs-report-sec"><h4>💼 ${t('المستقبل المهني','Career Outcomes')}</h4><p>${csEsc(d.careerOutcomes)}</p></div>`:''}
      ${d.saudiNotes ? `<div class="cs-report-sec cs-saudi"><h4>🇸🇦 ${t('ملاحظات للطلاب السعوديين','For Saudi students')}</h4><p>${csEsc(d.saudiNotes)}</p></div>`:''}
      ${d.standOut?.length ? `<div class="cs-report-sec"><h4>⭐ ${t('كيف تتميّز','How to stand out')}</h4><ul>${bullets(d.standOut)}</ul></div>`:''}
    </div>`;
}

document.addEventListener('DOMContentLoaded', () => {
  const f = document.getElementById('csForm');
  if (f) f.addEventListener('submit', csSearch);
});
