/* Daleel — Core App JS */

let currentLang = localStorage.getItem('daleel_lang') || 'en';

document.addEventListener('DOMContentLoaded', () => {
  applyLanguage(currentLang);
  highlightActiveNav();
  initMobileMenu();
  initScrollAnimations();
  updateListBadge();
  updateFAB();
  updateAuthNav();
  // Results page bootstrap
  if (document.getElementById('resultsOutput')) initResultsPage();
  // Floating countdown widget (countdown.js loaded separately on all pages)
  if (typeof initUrgentWidget === 'function') initUrgentWidget();
});

/* ── Language ──────────────────────────────────────────────── */
function toggleLanguage() {
  currentLang = currentLang === 'en' ? 'ar' : 'en';
  localStorage.setItem('daleel_lang', currentLang);
  applyLanguage(currentLang);
}

function applyLanguage(lang) {
  const html = document.documentElement;
  html.setAttribute('lang', lang);
  html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const text = getTranslation(lang, el.getAttribute('data-i18n'));
    if (text !== undefined) el.textContent = text;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const text = getTranslation(lang, el.getAttribute('data-i18n-placeholder'));
    if (text !== undefined) el.setAttribute('placeholder', text);
  });
  document.querySelectorAll('.lang-toggle').forEach(btn => {
    btn.textContent = lang === 'ar' ? 'English' : 'عربي';
  });
}

function getTranslation(lang, key) {
  const keys = key.split('.');
  let obj = T[lang];
  for (const k of keys) { if (obj === undefined) return undefined; obj = obj[k]; }
  return obj;
}
function t(key) { return getTranslation(currentLang, key) ?? getTranslation('en', key) ?? key; }

/* ── Nav ───────────────────────────────────────────────────── */
function highlightActiveNav() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .mobile-menu a').forEach(link => {
    if (link.getAttribute('href') === path) link.classList.add('active');
  });
}

function initMobileMenu() {
  const hamburger = document.querySelector('.hamburger');
  const menu = document.querySelector('.mobile-menu');
  if (!hamburger || !menu) return;
  hamburger.addEventListener('click', () => menu.classList.toggle('open'));
}

/* ── Scroll animations ─────────────────────────────────────── */
function initScrollAnimations() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('anim-in'); });
  }, { threshold: 0.08 });
  document.querySelectorAll('[data-anim]').forEach(el => obs.observe(el));
}

/* ── Grok/Groq streaming ───────────────────────────────────── */
async function callAI(messages, onToken, onDone, onError) {
  try {
    const res = await fetch('/api/grok', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '', full = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') break;
        try {
          const token = JSON.parse(data).choices?.[0]?.delta?.content;
          if (token) { full += token; onToken(token, full); }
        } catch {}
      }
    }
    onDone(full);
  } catch (err) {
    onError(err);
  }
}

/* ── Robust AI JSON parsing (handles code fences + truncation) ── */
function parseAIJSON(text) {
  if (!text || typeof text !== 'string') return null;
  let s = text.replace(/```json/gi, '').replace(/```/g, '');
  const start = s.indexOf('{');
  if (start < 0) return null;
  s = s.slice(start);
  // 1. straight parse, then 2. trim to last closing brace
  const lastBrace = s.lastIndexOf('}');
  for (const cand of [s, lastBrace > 0 ? s.slice(0, lastBrace + 1) : null]) {
    if (!cand) continue;
    try { return JSON.parse(cand); } catch { /* fall through */ }
  }
  // 3. repair a truncated response: cut to the last complete element, rebalance
  return repairTruncatedJSON(s);
}

function repairTruncatedJSON(s) {
  let inStr = false, esc = false, lastSafe = -1;
  for (let k = 0; k < s.length; k++) {
    const ch = s[k];
    if (inStr) {
      if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') { inStr = true; continue; }
    if (ch === '}' || ch === ']') lastSafe = k; // end of a complete value
  }
  if (lastSafe < 0) return null;
  let prefix = s.slice(0, lastSafe + 1).replace(/,\s*$/, '');
  // recompute open brackets for the prefix and close them
  inStr = false; esc = false; const stack = [];
  for (let k = 0; k < prefix.length; k++) {
    const ch = prefix[k];
    if (inStr) {
      if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') { inStr = true; continue; }
    if (ch === '{' || ch === '[') stack.push(ch === '{' ? '}' : ']');
    else if (ch === '}' || ch === ']') stack.pop();
  }
  let repaired = prefix;
  while (stack.length) repaired += stack.pop();
  try { return JSON.parse(repaired); } catch { return null; }
}

function aiErrorHtml(onRetry) {
  const isAr = currentLang === 'ar';
  return `<div class="callout callout-danger" style="margin-top:16px">
    <span class="callout-icon">⚠️</span>
    <div class="callout-content">
      <h4>${isAr ? 'تعذّرت قراءة رد الذكاء الاصطناعي' : 'Couldn\'t read the AI response'}</h4>
      <p>${isAr ? 'قد يكون الرد قد انقطع. حاول مرة أخرى.' : 'The response may have been interrupted. Please try again.'}</p>
      ${onRetry ? `<button class="btn btn-primary" style="margin-top:10px" onclick="${onRetry}">${isAr ? '↻ إعادة المحاولة' : '↻ Try Again'}</button>` : ''}
    </div>
  </div>`;
}

/* ── University visuals via Wikipedia (keyless, CORS-enabled) ─── */
const _uniVisualCache = {};
// Campus keywords, ranked best → acceptable; we pick the highest-ranked match.
const _UNI_GOOD_KW = ['campus', 'aerial', 'panorama', 'skyline', 'quad', 'tower', 'gate', 'library', 'hall', 'chapel', 'dome', 'court', 'college', 'building', 'university', 'view'];
// Never use as a banner (logos, people, maps, diagrams…)
const _UNI_BAD_KW = ['seal', 'logo', '_coa', 'coat', 'arms', 'crest', 'wordmark', 'map', 'flag', 'portrait', 'signature', 'diagram', 'chart', 'graph', 'icon', 'plaque', 'medal', 'banner', 'football', 'basketball', 'team'];

function _isBadImageName(t) {
  return t.includes('.svg') || t.includes(',') || _UNI_BAD_KW.some(k => t.includes(k));
}

async function fetchUniVisual(name) {
  if (!name) return { image: null, extract: null };
  if (_uniVisualCache[name]) return _uniVisualCache[name];
  const out = { image: null, extract: null };
  const title = encodeURIComponent(name);
  try {
    const s = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`)
      .then(r => r.ok ? r.json() : null);
    if (s) {
      out.extract = s.extract || null;
      // Use the curated lead image only if it's a real raster photo (not a seal/coa)
      const lead = s.originalimage?.source || s.thumbnail?.source;
      if (lead && /\.(jpg|jpeg|png)$/i.test(lead) && !_isBadImageName(lead.toLowerCase())) {
        out.image = lead;
      }
    }
    if (!out.image) {
      const ml = await fetch(`https://en.wikipedia.org/api/rest_v1/page/media-list/${title}`)
        .then(r => r.ok ? r.json() : null);
      const photos = (ml?.items || []).filter(it => {
        const t = (it.title || '').toLowerCase();
        return it.type === 'image' && /\.(jpg|jpeg|png)$/i.test(t) && !_isBadImageName(t);
      });
      // Rank by strongest campus keyword; only accept a clearly campus-like shot.
      let best = null, bestRank = Infinity;
      for (const p of photos) {
        const t = (p.title || '').toLowerCase();
        const rank = _UNI_GOOD_KW.findIndex(k => t.includes(k));
        if (rank >= 0 && rank < bestRank) { bestRank = rank; best = p; }
      }
      const src = best?.srcset?.[0]?.src;
      if (src) out.image = src.startsWith('//') ? 'https:' + src : src;
    }
  } catch { /* offline / no page — leave nulls */ }
  _uniVisualCache[name] = out;
  return out;
}

/* Lazily set campus photos on rendered cards */
function hydrateCardVisuals(container) {
  if (!container) return;
  container.querySelectorAll('.card-photo[data-uni]').forEach(ph => {
    const name = ph.getAttribute('data-uni');
    fetchUniVisual(name).then(v => {
      if (!v.image) return;
      const img = new Image();
      img.onload = () => {
        ph.style.backgroundImage = `url("${v.image}")`;
        ph.classList.add('has-photo');
      };
      img.src = v.image;
    });
  });
}

/* ── College card rendering ────────────────────────────────── */
const COUNTRY_ACCENTS = {
  'USA':'#B22234','UK':'#C8102E','Canada':'#FF0000',
  'Australia':'#FFCD00','Germany':'#FFCE00','Netherlands':'#FF6600',
  'UAE':'#00732F','Singapore':'#EF3340','Japan':'#BC002D',
};

let currentCardSize = localStorage.getItem('daleel_cardSize') || 'md';

function ensureOverlay() {
  if (document.getElementById('hoverOverlay')) return;
  const el = document.createElement('div');
  el.id = 'hoverOverlay';
  el.className = 'hover-overlay';
  document.body.appendChild(el);
}

function ensureModal() {
  if (document.getElementById('cardModalOverlay')) return;
  const el = document.createElement('div');
  el.id = 'cardModalOverlay';
  el.className = 'card-modal-overlay';
  el.innerHTML = '<div class="card-modal" id="cardModalBody"></div>';
  document.body.appendChild(el);
  el.addEventListener('click', e => { if (e.target === el) closeCardModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCardModal(); });
}

function closeCardModal() {
  document.getElementById('cardModalOverlay')?.classList.remove('open');
}

function openCardModal(cardEl) {
  ensureModal();
  const c = JSON.parse(cardEl.dataset.college);
  const accent = COUNTRY_ACCENTS[c.country] || '#B79CE0';
  const isSaved = getMyList().some(s => s.name === c.name);
  const saveLabel = isSaved
    ? (currentLang === 'ar' ? '✓ في قائمتك' : '✓ In Your List')
    : (currentLang === 'ar' ? '+ أضف لقائمتي' : '+ Add to My List');

  const ar = currentLang === 'ar';
  const steps = [
    { icon: '📋', title: ar ? 'الاشتراطات' : 'Requirements',
      desc: [c.acceptanceRate ? `${ar ? 'القبول' : 'Accept'}: ${c.acceptanceRate}` : '',
             c.medianSAT      ? `SAT: ${c.medianSAT}` : ''].filter(Boolean).join(' · ') || '—' },
    { icon: '📅', title: ar ? 'المواعيد' : 'Deadlines',
      desc: [c.earlyDeadline   ? `${ar ? 'مبكر' : 'Early'}: ${c.earlyDeadline}` : '',
             c.regularDeadline ? `${ar ? 'عادي' : 'RD'}: ${c.regularDeadline}` : ''].filter(Boolean).join(' · ') || '—' },
    { icon: '✍️', title: ar ? 'التقديم' : 'Apply',
      desc: c.applyThrough || '—' },
    { icon: '💰', title: ar ? 'التمويل' : 'Funding',
      desc: c.financialAid || '—' },
  ];

  const stepsHtml = steps.map((s, i) => {
    const connector = i < steps.length - 1 ? `<div class="modal-step-connector">→</div>` : '';
    return `<div class="modal-step">
      <div class="modal-step-num">${i + 1}</div>
      <div class="modal-step-icon">${s.icon}</div>
      <div class="modal-step-title">${s.title}</div>
      <div class="modal-step-desc">${s.desc}</div>
    </div>${connector}`;
  }).join('');

  const body = document.getElementById('cardModalBody');
  body.dataset.college = cardEl.dataset.college;
  body.innerHTML = `
    <button class="card-modal-close" onclick="closeCardModal()">✕</button>
    <div class="card-modal-hero" id="modalHero">
      <span class="card-modal-hero-flag">${c.flag || '🎓'}</span>
      <div class="card-modal-hero-overlay">
        <div class="card-modal-title">${c.name}</div>
        <div class="card-modal-sub">${c.location || ''}</div>
      </div>
    </div>
    <div class="modal-section" id="modalAbout" style="display:none"></div>
    <div class="modal-steps" dir="ltr">${stepsHtml}</div>
    <div class="location-banner" style="--loc-accent:${accent}">
      <span class="location-flag">${c.flag || '🌍'}</span>
      <div class="location-info">
        <div class="location-city">${c.location || ''}</div>
        <div class="location-country">${c.country || ''}</div>
      </div>
    </div>
    ${c.annualCost ? `<div class="modal-section"><div class="modal-section-title">${currentLang === 'ar' ? 'التكلفة السنوية' : 'Annual Cost'}</div><div class="ccard-fit-box">${c.annualCost}</div></div>` : ''}
    ${c.bestMajors?.length ? `<div class="modal-section"><div class="modal-section-title">🎯 ${currentLang === 'ar' ? 'أفضل التخصصات' : 'Best Majors'}</div><div class="chips-row">${c.bestMajors.map(m => `<span class="chip">${m}</span>`).join('')}</div></div>` : ''}

    ${c.pros || c.cons ? `<div class="modal-section"><div class="modal-section-title">⚖️ ${ar ? 'الإيجابيات والسلبيات' : 'Strengths & Challenges'}</div><div class="pros-cons">
      ${c.pros ? `<div class="pros">
        <h5>${ar ? '✓ المميزات' : '✓ Strengths'}</h5>
        <ul>${c.pros.map(p => `<li>${p}</li>`).join('')}</ul>
      </div>` : ''}
      ${c.cons ? `<div class="cons">
        <h5>${ar ? '✗ التحديات' : '✗ Challenges'}</h5>
        <ul>${c.cons.map(p => `<li>${p}</li>`).join('')}</ul>
      </div>` : ''}
    </div></div>` : ''}

    ${c.studentLife ? `<div class="detail-section khuzama-bg">
      <h4>🎓 ${ar ? 'حياة الطلاب' : 'Student Life'}</h4>
      <p style="color:var(--text-body);line-height:1.7;margin:0">${c.studentLife}</p>
    </div>` : ''}

    ${c.careerOutcomes ? `<div class="detail-section khuzama-bg">
      <h4>💼 ${ar ? 'مخرجات التوظيف' : 'Career Outcomes'}</h4>
      <p style="color:var(--text-body);line-height:1.7;margin:0">${c.careerOutcomes}</p>
    </div>` : ''}

    ${c.internships ? `<div class="detail-section khuzama-bg">
      <h4>🚀 ${ar ? 'برامج التدريب' : 'Internship Programs'}</h4>
      <p style="color:var(--text-body);line-height:1.7;margin:0">${c.internships}</p>
    </div>` : ''}

    ${c.saudiNotes ? `<div class="modal-section"><div class="modal-section-title">🇸🇦 ${currentLang === 'ar' ? 'ملاحظات سعودية' : 'Saudi Student Life'}</div><p style="font-size:.82rem;color:var(--text-body);line-height:1.6">${c.saudiNotes}</p></div>` : ''}
    ${c.fitReason ? `<div class="modal-section"><div class="modal-section-title">✨ ${currentLang === 'ar' ? 'لماذا تناسبك' : 'Why This Fits You'}</div><div class="ccard-fit-box">${c.fitReason}</div></div>` : ''}
    ${buildFitBreakdown(c)}
    <div class="modal-section" id="uniEnrichment" style="display:none"></div>
    <div style="margin-top:20px">
      <button class="btn btn-primary modal-save-btn ${isSaved ? 'saved' : ''}" onclick="handleModalSave(this)">${saveLabel}</button>
    </div>`;

  document.getElementById('cardModalOverlay').classList.add('open');
  loadModalVisual(c);
  loadUniversityEnrichment(c);
}

/* Hydrate the modal hero photo + "About" blurb from Wikipedia */
async function loadModalVisual(c) {
  const v = await fetchUniVisual(c.name);
  const hero = document.getElementById('modalHero');
  if (hero && v.image) {
    const img = new Image();
    img.onload = () => { hero.style.backgroundImage = `url("${v.image}")`; hero.classList.add('has-photo'); };
    img.src = v.image;
  }
  const about = document.getElementById('modalAbout');
  if (about && v.extract) {
    const isAr = currentLang === 'ar';
    about.style.display = '';
    about.innerHTML = `<div class="modal-section-title">📖 ${isAr ? 'نبذة' : 'About'}</div>
      <p style="font-size:.84rem;color:var(--text-body);line-height:1.7">${escapeHtml(v.extract)}</p>`;
  }
}

/* Render the Right-Fit breakdown bars from c.fitBreakdown */
function buildFitBreakdown(c) {
  const fb = c.fitBreakdown;
  if (!fb || typeof fb !== 'object') return '';
  const isAr = currentLang === 'ar';
  const dims = [
    { k: 'academics', label: isAr ? '🎓 المستوى الأكاديمي' : '🎓 Academics' },
    { k: 'cost',      label: isAr ? '💰 التكلفة'          : '💰 Affordability' },
    { k: 'location',  label: isAr ? '📍 الموقع'           : '📍 Location' },
    { k: 'culture',   label: isAr ? '🕌 المجتمع المسلم'   : '🕌 Muslim community' },
    { k: 'size',      label: isAr ? '🏛️ حجم الحرم'        : '🏛️ Campus size' },
  ];
  const rows = dims.filter(d => fb[d.k] != null).map(d => {
    const v = Math.max(0, Math.min(100, Number(fb[d.k]) || 0));
    return `<div class="fit-bar-row">
      <span class="fit-bar-label">${d.label}</span>
      <span class="fit-bar-track"><span class="fit-bar-fill" style="width:${v}%"></span></span>
      <span class="fit-bar-val">${Math.round(v)}</span>
    </div>`;
  }).join('');
  if (!rows) return '';
  return `<div class="modal-section"><div class="modal-section-title">📊 ${isAr ? 'تحليل الملاءمة' : 'Fit Breakdown'}</div>${rows}</div>`;
}

/* Fetch + render real US university enrichment (Scorecard + OSM neighborhood).
   Falls back silently for non-US schools or when the API has no data. */
async function loadUniversityEnrichment(c) {
  const el = document.getElementById('uniEnrichment');
  if (!el) return;
  const isAr = currentLang === 'ar';
  el.style.display = '';
  el.innerHTML = `<div class="modal-section-title">📍 ${isAr ? 'إحصاءات والحي' : 'Stats & Neighborhood'}</div>
    <div class="uni-enrich-loading">${isAr ? 'جاري جلب البيانات الحقيقية…' : 'Fetching real data…'}</div>`;

  let data;
  try {
    const res = await fetch(`/api/university?name=${encodeURIComponent(c.name)}`);
    data = await res.json();
  } catch { data = { found: false }; }

  // Guard: modal may have closed/changed while awaiting
  const cur = document.getElementById('uniEnrichment');
  if (!cur) return;
  if (!data || !data.found) { cur.style.display = 'none'; cur.innerHTML = ''; return; }

  const stat = (label, val) => val != null && val !== '' ?
    `<div class="uni-stat"><span class="uni-stat-num">${val}</span><span class="uni-stat-label">${label}</span></div>` : '';
  const nb = data.neighborhood;
  const chips = (arr) => (arr && arr.length)
    ? arr.map(n => `<span class="chip">${escapeHtml(n)}</span>`).join('')
    : `<span class="uni-none">${isAr ? '—' : '—'}</span>`;

  cur.innerHTML = `
    <div class="modal-section-title">📍 ${isAr ? 'إحصاءات حقيقية' : 'Real Stats'} <span class="uni-src">${isAr ? 'المصدر: College Scorecard' : 'via College Scorecard'}</span></div>
    <div class="uni-stats-grid">
      ${stat(isAr ? 'نسبة القبول' : 'Admit rate', data.admissionRate != null ? data.admissionRate + '%' : null)}
      ${stat(isAr ? 'عدد الطلاب' : 'Enrollment', data.enrollment != null ? data.enrollment.toLocaleString() : null)}
      ${stat(isAr ? 'متقدمون (تقديري)' : 'Applicants (est.)', data.applicantEstimate != null ? '~' + data.applicantEstimate.toLocaleString() : null)}
      ${stat('SAT', data.satMidpoint)}
      ${stat('ACT', data.actMidpoint)}
      ${stat(isAr ? 'التكلفة/سنة' : 'Cost/yr', data.annualCost != null ? '$' + data.annualCost.toLocaleString() : null)}
    </div>
    ${nb ? `
      <div class="uni-nb">
        <div class="uni-nb-row"><span class="uni-nb-cat">🛒 ${isAr ? 'بقالة قريبة' : 'Groceries nearby'}</span><div class="chips-row">${chips(nb.groceries)}</div></div>
        <div class="uni-nb-row"><span class="uni-nb-cat">🍽️ ${isAr ? 'مطاعم ومقاهٍ' : 'Food & cafes'}</span><div class="chips-row">${chips(nb.restaurants)}</div></div>
        <div class="uni-nb-row"><span class="uni-nb-cat">🚉 ${isAr ? 'محطات نقل' : 'Transit stations'}</span><div class="chips-row">${chips(nb.transit)}</div></div>
        <div class="uni-nb-note">${isAr ? 'الحي عبر OpenStreetMap ضمن ~1.5 كم من الحرم.' : 'Neighborhood via OpenStreetMap, within ~1.5km of campus.'}</div>
      </div>` : ''}
    ${(data.lat != null && data.lon != null) ? `
      <a class="uni-map-link" href="https://www.openstreetmap.org/?mlat=${data.lat}&mlon=${data.lon}#map=15/${data.lat}/${data.lon}" target="_blank" rel="noopener">
        🗺️ ${isAr ? 'افتح الحرم على الخريطة' : 'View campus on the map'} →
      </a>` : ''}`;
}

function handleModalSave(btn) {
  const body = document.getElementById('cardModalBody');
  const college = JSON.parse(body.dataset.college);
  handleSave(college, btn);
  const isSaved = getMyList().some(s => s.name === college.name);
  // Sync card in grid
  document.querySelectorAll('.card').forEach(card => {
    try {
      if (JSON.parse(card.dataset.college).name === college.name) {
        const saveBtn = card.querySelector('.card-save-btn');
        if (saveBtn) {
          saveBtn.textContent = isSaved ? (currentLang === 'ar' ? '✓ محفوظ' : '✓ Saved') : (currentLang === 'ar' ? '+ قائمتي' : '+ My List');
          saveBtn.classList.toggle('saved', isSaved);
        }
      }
    } catch {}
  });
  btn.textContent = isSaved
    ? (currentLang === 'ar' ? '✓ في قائمتك' : '✓ In Your List')
    : (currentLang === 'ar' ? '+ أضف لقائمتي' : '+ Add to My List');
  btn.classList.toggle('saved', isSaved);
}

function setCardSize(size) {
  currentCardSize = size;
  localStorage.setItem('daleel_cardSize', size);
  document.querySelectorAll('.college-cards-grid').forEach(grid => {
    grid.classList.remove('grid--sm', 'grid--lg');
    if (size !== 'md') grid.classList.add(`grid--${size}`);
  });
  document.querySelectorAll('.card').forEach(card => {
    card.classList.remove('card--sm', 'card--md', 'card--lg');
    card.classList.add(`card--${size}`);
  });
  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.size === size);
  });
}

function buildCard(c, saved, i) {
  const isSaved = saved.includes(c.name);
  const saveLabel = isSaved
    ? (currentLang === 'ar' ? '✓ محفوظ' : '✓ Saved')
    : (currentLang === 'ar' ? '+ قائمتي' : '+ My List');

  const isAr = currentLang === 'ar';
  const BADGE_LABELS = {
    reach:  isAr ? 'طموح'  : 'Reach',
    target: isAr ? 'مناسب' : 'Target',
    safety: isAr ? 'آمن'   : 'Safety',
  };
  const statsHtml = [
    c.acceptanceRate ? `${isAr ? 'القبول' : 'Accept'}: ${c.acceptanceRate}` : '',
    c.annualCost     ? `${c.annualCost}` : '',
    c.medianSAT      ? `SAT: ${c.medianSAT}` : '',
  ].filter(Boolean).map(s => `<span class="card-stat-pill">${s}</span>`).join('');
  const moreLabel = isAr ? 'تفاصيل ←' : 'More Info →';
  const fit = Number(c.fitScore);
  const fitHtml = Number.isFinite(fit) ? `<div class="card-fit" title="${isAr ? 'درجة الملاءمة' : 'Fit score'}">
      <span class="card-fit-num">${Math.round(fit)}%</span>
      <span class="card-fit-label">${isAr ? 'ملاءمة' : 'fit'}</span>
    </div>` : '';

  const uniName = (c.name || '').replace(/"/g, '&quot;');

  return `<div class="card card--${currentCardSize} card--photo" style="animation-delay:${i * .06}s" data-college='${JSON.stringify(c).replace(/'/g, "&#39;")}'>
    <div class="card-photo" data-uni="${uniName}">
      <span class="card-photo-flag">${c.flag || '🎓'}</span>
      <div class="card-badge card-badge--${c.type}">${BADGE_LABELS[c.type] || c.type}</div>
      ${fitHtml}
    </div>
    <div class="card-title">${c.name}</div>
    <div class="card-subtitle">${c.location || ''}</div>
    ${statsHtml ? `<div class="card-stats-row">${statsHtml}</div>` : ''}
    ${c.fitReason ? `<div class="card-expand-text">${c.fitReason}</div>` : ''}
    <div class="card-hover-actions">
      <button class="card-more-btn">${moreLabel}</button>
      <button class="card-save-btn ${isSaved ? 'saved' : ''}">${saveLabel}</button>
    </div>
  </div>`;
}

function renderCollegeCards(data, container) {
  ensureOverlay();
  ensureModal();
  const { assessment, colleges } = data;
  const saved = getMyList().map(c => c.name);

  let html = '';
  if (assessment) {
    html += `<div class="college-assessment-box">${assessment}</div>`;
  }

  html += `<div class="card-controls">
    <div class="card-size-toggle">
      <button class="size-btn ${currentCardSize === 'sm' ? 'active' : ''}" data-size="sm" onclick="setCardSize('sm')">S</button>
      <button class="size-btn ${currentCardSize === 'md' ? 'active' : ''}" data-size="md" onclick="setCardSize('md')">M</button>
      <button class="size-btn ${currentCardSize === 'lg' ? 'active' : ''}" data-size="lg" onclick="setCardSize('lg')">L</button>
    </div>
  </div>`;

  const groups = [
    { key: 'reach',  label: currentLang === 'ar' ? '🔴 جامعات الطموح' : '🔴 Reach',  cls: 'cgl-reach' },
    { key: 'target', label: currentLang === 'ar' ? '🟡 جامعات مناسبة' : '🟡 Target', cls: 'cgl-target' },
    { key: 'safety', label: currentLang === 'ar' ? '🟢 جامعات آمنة'  : '🟢 Safety', cls: 'cgl-safety' },
  ];

  for (const g of groups) {
    const list = colleges.filter(c => c.type === g.key);
    if (!list.length) continue;
    html += `<div class="college-group">
      <div class="college-group-label ${g.cls}">${g.label}</div>
      <div class="college-cards-grid${currentCardSize !== 'md' ? ' grid--' + currentCardSize : ''}">`;
    list.forEach((c, i) => { html += buildCard(c, saved, i); });
    html += `</div></div>`;
  }

  container.innerHTML = html;
  _bindCardEvents(container);
  hydrateCardVisuals(container);
}

function _bindCardEvents(container) {
  const overlay = document.getElementById('hoverOverlay');
  container.querySelectorAll('.card').forEach(card => {
    card.addEventListener('mouseenter', () => overlay?.classList.add('active'));
    card.addEventListener('mouseleave', () => overlay?.classList.remove('active'));
    card.addEventListener('click', e => {
      if (e.target.closest('.card-save-btn') || e.target.closest('.card-more-btn')) return;
      openCardModal(card);
    });
  });
  container.querySelectorAll('.card-more-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openCardModal(btn.closest('.card'));
    });
  });
  container.querySelectorAll('.card-save-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const college = JSON.parse(btn.closest('.card').dataset.college);
      handleSave(college, btn);
    });
  });
}

/* ── My List (localStorage) ────────────────────────────────── */
function getMyList() {
  try { return JSON.parse(localStorage.getItem('daleel_mylist') || '[]'); }
  catch { return []; }
}
function saveMyList(list) { localStorage.setItem('daleel_mylist', JSON.stringify(list)); }

function handleSave(college, btn) {
  const list = getMyList();
  const idx = list.findIndex(c => c.name === college.name);
  if (idx === -1) {
    list.push(college);
    btn.textContent = currentLang === 'ar' ? '✓ محفوظ' : '✓ Saved';
    btn.classList.add('saved');
  } else {
    list.splice(idx, 1);
    btn.textContent = currentLang === 'ar' ? '+ قائمتي' : '+ My List';
    btn.classList.remove('saved');
  }
  saveMyList(list);
  updateListBadge();
  updateFAB();
}

function updateListBadge() {
  const count = getMyList().length;
  document.querySelectorAll('.nav-list-badge').forEach(b => {
    b.textContent = count;
    b.classList.toggle('show', count > 0);
  });
}

function updateFAB() {
  const count = getMyList().length;
  const fab = document.getElementById('fabList');
  if (!fab) return;
  fab.classList.toggle('show', count > 0);
  const countEl = fab.querySelector('.fab-count');
  if (countEl) countEl.textContent = count;
}

/**
 * Show "My Profile" link in navbar if user is signed in
 */
function updateAuthNav() {
  const navProfile = document.getElementById('navProfile');
  if (!navProfile) return;

  // Check if user is authenticated via auth.js
  const userEmail = window.daleel?.auth?.getSessionUser?.() || localStorage.getItem('daleel_user_email');

  if (userEmail) {
    navProfile.style.display = 'inline-block';
    navProfile.href = '/profile.html';
    navProfile.textContent = `👤 ${userEmail.split('@')[0]}`;
  } else {
    navProfile.style.display = 'none';
  }
}

// Call updateAuthNav whenever auth state changes
document.addEventListener('DOMContentLoaded', updateAuthNav);
window.addEventListener('storage', updateAuthNav);

/* ── My List page renderer ─────────────────────────────────── */
function renderMyListPage() {
  const list = getMyList();
  const statsEl = document.getElementById('listStats');
  const contentEl = document.getElementById('listContent');
  if (!statsEl || !contentEl) return;

  const reaches  = list.filter(c => c.type === 'reach').length;
  const targets  = list.filter(c => c.type === 'target').length;
  const safeties = list.filter(c => c.type === 'safety').length;

  statsEl.innerHTML = `
    <div class="list-stat-card" data-anim class="s1">
      <span class="list-stat-num">${list.length}</span>
      <span class="list-stat-label">${t('myList.total')}</span>
    </div>
    <div class="list-stat-card" data-anim class="s2">
      <span class="list-stat-num" style="color:#991b1b">${reaches}</span>
      <span class="list-stat-label">${t('myList.reaches')}</span>
    </div>
    <div class="list-stat-card" data-anim class="s3">
      <span class="list-stat-num" style="color:#7a5c1e">${targets}</span>
      <span class="list-stat-label">${t('myList.targets')}</span>
    </div>
    <div class="list-stat-card" data-anim class="s4">
      <span class="list-stat-num" style="color:#065f46">${safeties}</span>
      <span class="list-stat-label">${t('myList.safeties')}</span>
    </div>`;

  if (list.length === 0) {
    contentEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🎓</div>
        <h3>${t('myList.emptyTitle')}</h3>
        <p>${t('myList.emptyDesc')}</p>
        <a href="college-list.html" class="btn btn-primary">${t('myList.emptyCta')}</a>
      </div>`;
    return;
  }

  const saved = list.map(c => c.name);
  const groups = [
    { key: 'reach',  label: currentLang === 'ar' ? '🔴 جامعات الطموح' : '🔴 Reach',  cls: 'cgl-reach' },
    { key: 'target', label: currentLang === 'ar' ? '🟡 جامعات مناسبة' : '🟡 Target', cls: 'cgl-target' },
    { key: 'safety', label: currentLang === 'ar' ? '🟢 جامعات آمنة'  : '🟢 Safety', cls: 'cgl-safety' },
  ];

  let html = '';
  for (const g of groups) {
    const items = list.filter(c => c.type === g.key);
    if (!items.length) continue;
    html += `<div class="college-group"><div class="college-group-label ${g.cls}">${g.label}</div>
      <div class="college-cards-grid${currentCardSize !== 'md' ? ' grid--' + currentCardSize : ''}">`;
    items.forEach((c, i) => { html += buildCard(c, saved, i); });
    html += `</div></div>`;
  }
  contentEl.innerHTML = html;
  ensureOverlay();
  ensureModal();
  _bindCardEvents(contentEl);
  hydrateCardVisuals(contentEl);
  // On My List page, unsaving a card removes it — re-render after save
  contentEl.querySelectorAll('.card-save-btn').forEach(btn => {
    btn.addEventListener('click', () => setTimeout(renderMyListPage, 300), { once: true });
  });
  initScrollAnimations();
}

/* ── College List form ─────────────────────────────────────── */
function submitCollegeList(event) {
  event.preventDefault();
  const form = event.target;
  const get = id => form.querySelector(`#${id}`)?.value?.trim();

  const gpa = get('gpa'), schoolType = get('schoolType'),
        major = get('major'), budget = get('budget'), ec = get('ec');
  if (!gpa || !schoolType || !major || !budget || !ec) {
    alert(currentLang === 'ar' ? 'يرجى ملء الحقول الإلزامية.' : 'Please fill in all required fields.');
    return;
  }

  const profile = [
    `School type: ${schoolType}`,
    `Cumulative GPA: ${gpa}%`,
    get('gpaMath') ? `Math & Science GPA: ${get('gpaMath')}%` : '',
    get('satMath') ? `SAT Math: ${get('satMath')}` : 'SAT Math: not taken',
    get('satTotal') ? `SAT Total: ${get('satTotal')}` : '',
    get('act') ? `ACT Composite: ${get('act')}/36` : '',
    get('qudurat') ? `Qudurat: ${get('qudurat')}/100` : 'Qudurat: not taken',
    get('tahsili') ? `Tahsili: ${get('tahsili')}/100` : '',
    `Major: ${major}`, `Country: ${get('country') || 'No preference'}`,
    `Funding: ${budget}`, `Extracurriculars: ${ec}`,
  ].filter(Boolean).join('\n');

  // Right-Fit priorities (1=low, 5=high)
  const w = id => form.querySelector(`#${id}`)?.value || '3';
  const priorities = `Priorities (1=don't care, 5=critical): Academic prestige=${w('w_academics')}, Affordability=${w('w_cost')}, Location & setting=${w('w_location')}, Saudi/Muslim community=${w('w_culture')}, Campus size=${w('w_size')}`;

  const userMsg = currentLang === 'ar'
    ? `ملفي الأكاديمي:\n${profile}\n\n${priorities}\n\nابنِ قائمة جامعاتي كـ JSON مع درجات الملاءمة.`
    : `My profile:\n${profile}\n\n${priorities}\n\nBuild my college list as JSON with fit scores.`;

  // Save query + metadata to sessionStorage, then navigate to results page
  sessionStorage.setItem('daleel_result_query', JSON.stringify({
    userMsg,
    lang: currentLang,
    major: major || '',
    country: get('country') || '',
  }));
  window.location.href = 'results.html';
}

/* ── Results page bootstrap ────────────────────────────────── */
function initResultsPage() {
  const raw = sessionStorage.getItem('daleel_result_query');
  if (!raw) { window.location.href = 'college-list.html'; return; }

  const { userMsg, lang, major, country } = JSON.parse(raw);

  // Apply saved language
  currentLang = lang || currentLang;
  applyLanguage(currentLang);

  // Populate loading screen labels
  const isAr = currentLang === 'ar';
  const majorEl = document.getElementById('rlMajor');
  const titleEl = document.getElementById('rlTitle');
  if (majorEl) majorEl.textContent = major || (isAr ? 'ملفك الأكاديمي' : 'Your Profile');
  if (titleEl) titleEl.textContent = isAr ? 'نبني قائمة جامعاتك...' : 'Building Your College List';

  // Cycle loading stage text
  const stages = isAr ? [
    'تحليل ملفك الأكاديمي...',
    'المقارنة مع أكثر من 500 جامعة...',
    'فحص أهلية برنامج أرامكو...',
    'بناء قائمتك الشخصية...',
  ] : [
    'Analyzing your academic profile...',
    'Comparing with 500+ universities...',
    'Checking Aramco CPP eligibility...',
    'Building your personalized list...',
  ];

  const stageEl = document.getElementById('rlStage');
  const barEl   = document.getElementById('rlBar');
  if (stageEl) stageEl.textContent = stages[0];
  if (barEl)   barEl.style.width = '18%';

  let stageIdx = 0;
  const stageInterval = setInterval(() => {
    if (stageIdx >= stages.length - 1) return;
    stageIdx++;
    if (stageEl) {
      stageEl.classList.add('fade');
      setTimeout(() => {
        stageEl.textContent = stages[stageIdx];
        stageEl.classList.remove('fade');
      }, 300);
    }
    const pct = [18, 42, 64, 80][stageIdx] || 80;
    if (barEl) barEl.style.width = `${pct}%`;
  }, 2000);

  // Call AI
  callAI(
    [{ role: 'system', content: SYSTEM_PROMPTS.collegeList(currentLang) },
     { role: 'user',   content: userMsg }],
    () => {},
    (full) => {
      clearInterval(stageInterval);
      if (barEl) barEl.style.width = '100%';

      setTimeout(() => {
        // Fade out loading screen
        const loadingEl = document.getElementById('resultsLoading');
        const contentEl = document.getElementById('resultsContent');
        if (loadingEl) loadingEl.classList.add('fade-out');
        if (contentEl) {
          contentEl.style.display = '';
          requestAnimationFrame(() => requestAnimationFrame(() => contentEl.classList.add('visible')));
        }

        // Set timestamp
        const ts = document.getElementById('resultsTimestamp');
        if (ts) ts.textContent = isAr ? `تم الإنشاء للتو · ${major}` : `Generated just now · ${major}`;

        // Render cards
        const outputEl = document.getElementById('resultsOutput');
        const data = parseAIJSON(full);
        if (data && data.colleges) { renderCollegeCards(data, outputEl); }
        else { outputEl.innerHTML = aiErrorHtml("location.href='college-list.html'"); }

        updateListBadge();
        updateFAB();
        initScrollAnimations();
      }, 700);
    },
    (err) => {
      clearInterval(stageInterval);
      const loadingEl = document.getElementById('resultsLoading');
      const contentEl = document.getElementById('resultsContent');
      if (loadingEl) loadingEl.classList.add('fade-out');
      if (contentEl) {
        contentEl.style.display = '';
        requestAnimationFrame(() => requestAnimationFrame(() => contentEl.classList.add('visible')));
      }
      const outputEl = document.getElementById('resultsOutput');
      if (outputEl) outputEl.innerHTML = `
        <div class="callout callout-danger" style="margin-top:24px">
          <span class="callout-icon">❌</span>
          <div class="callout-content">
            <h4>Something went wrong</h4>
            <p>${err.message}</p>
            <a href="college-list.html" class="btn btn-primary" style="margin-top:10px">← Try Again</a>
          </div>
        </div>`;
    }
  );
}

/* ── Scholarship card rendering ────────────────────────────── */
function buildScholarshipCard(s, i) {
  const isAr = currentLang === 'ar';
  const BADGE = {
    eligible:     { cls: 'card-badge--safety', label: isAr ? 'مؤهل'       : 'Eligible' },
    borderline:   { cls: 'card-badge--target', label: isAr ? 'محتمل'      : 'Borderline' },
    not_eligible: { cls: 'card-badge--reach',  label: isAr ? 'غير مؤهل'  : 'Not Eligible' },
  };
  const badge = BADGE[s.eligibility] || BADGE.borderline;
  const moreLabel = isAr ? 'تفاصيل ←' : 'More Info →';

  return `<div class="card card--${currentCardSize}" style="animation-delay:${i * .07}s"
      data-scholarship='${JSON.stringify(s).replace(/'/g, "&#39;")}'>
    <div class="card-badge ${badge.cls}">${badge.label}</div>
    <div class="card-icon">${s.icon || '💰'}</div>
    <div class="card-title">${s.name}</div>
    <div class="card-subtitle">${s.fundingType || ''}</div>
    ${s.amount ? `<div class="card-stats-row"><span class="card-stat-pill">${s.amount}</span></div>` : ''}
    ${s.reason ? `<div class="card-expand-text">${s.reason}</div>` : ''}
    <div class="card-hover-actions">
      <button class="card-more-btn sch-more-btn">${moreLabel}</button>
    </div>
  </div>`;
}

function openScholarshipModal(cardEl) {
  ensureModal();
  const s = JSON.parse(cardEl.dataset.scholarship);
  const isAr = currentLang === 'ar';
  const BADGE = {
    eligible:     { cls: 'card-badge--safety', label: isAr ? 'مؤهل'      : 'Eligible' },
    borderline:   { cls: 'card-badge--target', label: isAr ? 'محتمل'     : 'Borderline' },
    not_eligible: { cls: 'card-badge--reach',  label: isAr ? 'غير مؤهل' : 'Not Eligible' },
  };
  const badge = BADGE[s.eligibility] || BADGE.borderline;

  const steps = [
    { icon: '📋', title: isAr ? 'الشروط'    : 'Requirements', desc: s.requirements || '—' },
    { icon: '📅', title: isAr ? 'الموعد'    : 'Deadline',     desc: s.deadline     || '—' },
    { icon: '📝', title: isAr ? 'التقديم'   : 'Apply Via',    desc: s.applyVia     || '—' },
    { icon: '💰', title: isAr ? 'التمويل'   : 'Funding',      desc: s.amount       || '—' },
  ];

  const stepsHtml = steps.map((st, i) => {
    const connector = i < steps.length - 1 ? `<div class="modal-step-connector">→</div>` : '';
    return `<div class="modal-step">
      <div class="modal-step-num">${i + 1}</div>
      <div class="modal-step-icon">${st.icon}</div>
      <div class="modal-step-title">${st.title}</div>
      <div class="modal-step-desc">${st.desc}</div>
    </div>${connector}`;
  }).join('');

  const body = document.getElementById('cardModalBody');
  const badgeHtml = BADGE[s.eligibility]
    ? `<span class="card-badge ${badge.cls}" style="display:inline-flex;vertical-align:middle;margin-inline-end:6px">${badge.label}</span>`
    : '';
  body.innerHTML = `
    <button class="card-modal-close" onclick="closeCardModal()">✕</button>
    <div class="card-modal-header">
      <div class="card-modal-flag">${s.icon || '💰'}</div>
      <div>
        <div class="card-modal-title">${s.name}</div>
        <div class="card-modal-sub">${badgeHtml}${s.fundingType || ''}</div>
      </div>
    </div>
    <div class="modal-steps" dir="ltr">${stepsHtml}</div>
    ${s.reason ? `<div class="modal-section">
      <div class="modal-section-title">✨ ${isAr ? 'لماذا هذا ينطبق عليك' : 'Why This Applies to You'}</div>
      <div class="ccard-fit-box">${s.reason}</div>
    </div>` : ''}
    ${s.website ? `<div style="margin-top:20px">
      <a href="${s.website}" target="_blank" rel="noopener" class="btn btn-primary" style="text-decoration:none;display:inline-flex;align-items:center;gap:6px">
        🌐 ${isAr ? 'زيارة الموقع الرسمي' : 'Visit Official Website'}
      </a>
    </div>` : ''}`;

  document.getElementById('cardModalOverlay').classList.add('open');
}

function renderScholarshipCards(data, container) {
  ensureOverlay();
  ensureModal();
  const { assessment, scholarships } = data;
  const isAr = currentLang === 'ar';

  let html = '';
  if (assessment) {
    html += `<div class="college-assessment-box">${assessment}</div>`;
  }

  const groups = [
    { key: 'eligible',     label: isAr ? '✅ مؤهل'      : '✅ Eligible',     cls: 'cgl-safety' },
    { key: 'borderline',   label: isAr ? '⚠️ محتمل'    : '⚠️ Borderline',   cls: 'cgl-target' },
    { key: 'not_eligible', label: isAr ? '❌ غير مؤهل' : '❌ Not Eligible',  cls: 'cgl-reach'  },
  ];

  for (const g of groups) {
    const list = scholarships.filter(s => s.eligibility === g.key);
    if (!list.length) continue;
    html += `<div class="college-group">
      <div class="college-group-label ${g.cls}">${g.label}</div>
      <div class="college-cards-grid${currentCardSize !== 'md' ? ' grid--' + currentCardSize : ''}">`;
    list.forEach((s, i) => { html += buildScholarshipCard(s, i); });
    html += `</div></div>`;
  }

  container.innerHTML = html;

  const overlay = document.getElementById('hoverOverlay');
  container.querySelectorAll('.card').forEach(card => {
    card.addEventListener('mouseenter', () => overlay?.classList.add('active'));
    card.addEventListener('mouseleave', () => overlay?.classList.remove('active'));
    card.addEventListener('click', e => {
      if (e.target.closest('.sch-more-btn')) return;
      openScholarshipModal(card);
    });
  });
  container.querySelectorAll('.sch-more-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openScholarshipModal(btn.closest('.card'));
    });
  });
}

/* ── Scholarships form ─────────────────────────────────────── */
function submitScholarships(event) {
  event.preventDefault();
  const form = event.target;
  const get = id => form.querySelector(`#${id}`)?.value?.trim();
  if (!get('schGpa') || !get('schSchoolType')) {
    alert(currentLang === 'ar' ? 'يرجى ملء الحقول الإلزامية.' : 'Please fill in required fields.');
    return;
  }
  const profile = [
    `School type: ${get('schSchoolType')}`,
    `GPA: ${get('schGpa')}%`,
    get('schGpaMath') ? `Math & Science GPA: ${get('schGpaMath')}%` : '',
    get('schSatMath') ? `SAT Math: ${get('schSatMath')}` : '',
    get('schQudurat') ? `Qudurat: ${get('schQudurat')}/100` : '',
    get('schMajor')   ? `Major: ${get('schMajor')}` : '',
  ].filter(Boolean).join('\n');
  const userMsg = currentLang === 'ar'
    ? `ملفي:\n${profile}\n\nقيّم أهليتي لكل منحة متاحة للطلاب السعوديين. أعطني JSON فقط.`
    : `My profile:\n${profile}\n\nAssess my eligibility for every scholarship available to Saudi students. Return JSON only.`;

  const loadingEl = document.getElementById('aiLoading');
  const resultEl  = document.getElementById('aiResult');
  const outputEl  = document.getElementById('aiOutput');

  loadingEl.classList.add('visible');
  resultEl.classList.remove('visible');
  outputEl.innerHTML = '';

  callAI(
    [{ role: 'system', content: SYSTEM_PROMPTS.scholarships(currentLang) },
     { role: 'user',   content: userMsg }],
    () => {},
    (full) => {
      loadingEl.classList.remove('visible');
      resultEl.classList.add('visible');
      outputEl.innerHTML = '';
      const data = parseAIJSON(full);
      if (data && data.scholarships) { renderScholarshipCards(data, outputEl); return; }
      outputEl.innerHTML = aiErrorHtml('document.querySelector(".form-card")?.requestSubmit?.()');
    },
    (err) => {
      loadingEl.classList.remove('visible');
      resultEl.classList.add('visible');
      outputEl.textContent = `❌ ${err.message}`;
    }
  );
}

/* ── SAT Guide form ────────────────────────────────────────── */
function submitSatGuide(event) {
  event.preventDefault();
  const scores = event.target.querySelector('#scores')?.value?.trim();
  if (!scores) return;
  const userMsg = currentLang === 'ar'
    ? `درجاتي وجامعاتي: ${scores}\n\nما الاختبارات التي أحتاجها؟`
    : `My scores and targets: ${scores}\n\nWhat tests do I still need?`;
  streamToElement(
    [{ role: 'system', content: SYSTEM_PROMPTS.satGuide(currentLang) },
     { role: 'user',   content: userMsg }],
    document.getElementById('aiOutput'),
    document.getElementById('aiLoading'),
    document.getElementById('aiResult')
  );
}

/* ── Essay form ────────────────────────────────────────────── */
let selectedPrompt = '';
function selectPrompt(el, promptText) {
  document.querySelectorAll('.prompt-option').forEach(p => p.classList.remove('selected'));
  el.classList.add('selected');
  selectedPrompt = promptText;
}

let _essayLastDraft = '';
function submitEssay(event) {
  event.preventDefault();
  const draft   = event.target.querySelector('#draft')?.value?.trim();
  const context = event.target.querySelector('#essayContext')?.value?.trim();
  if (!draft) return;
  _essayLastDraft = draft;
  const parts = [];
  if (selectedPrompt) parts.push(`Prompt: ${selectedPrompt}`);
  parts.push(`Draft:\n${draft}`);
  if (context) parts.push(`Context: ${context}`);
  const userMsg = currentLang === 'ar'
    ? `${parts.join('\n\n')}\n\nأعطني تقييماً مع ملاحظات مضمّنة كـ JSON فقط.`
    : `${parts.join('\n\n')}\n\nGive feedback with inline highlights as JSON only.`;

  const loadingEl = document.getElementById('aiLoading');
  const resultEl  = document.getElementById('aiResult');
  const outputEl  = document.getElementById('aiOutput');
  resultEl.classList.add('visible');
  loadingEl.classList.add('visible');
  outputEl.innerHTML = '';

  callAI(
    [{ role: 'system', content: SYSTEM_PROMPTS.essayInline(currentLang) },
     { role: 'user',   content: userMsg }],
    () => {},
    (full) => {
      loadingEl.classList.remove('visible');
      const data = parseAIJSON(full);
      if (data && (data.highlights || data.overall)) renderEssayFeedback(data, _essayLastDraft, outputEl);
      else outputEl.innerHTML = aiErrorHtml('document.querySelector(".form-card")?.requestSubmit?.()');
    },
    (err) => {
      loadingEl.classList.remove('visible');
      outputEl.textContent = `❌ ${err.message}`;
    }
  );
}

/* ── Essay feedback renderer (inline highlights) ───────────────── */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function renderEssayFeedback(data, draft, container) {
  const isAr = currentLang === 'ar';
  const highlights = Array.isArray(data.highlights) ? data.highlights : [];
  const strengths  = Array.isArray(data.strengths)  ? data.strengths  : [];

  // Match each highlight quote to a position in the draft (exact substring).
  const matched = [];
  highlights.forEach((h, i) => {
    if (!h || !h.quote) return;
    const idx = draft.indexOf(h.quote);
    matched.push({ ...h, idx, sev: ['high','medium','low'].includes(h.severity) ? h.severity : 'medium', _i: i });
  });
  const placed = matched.filter(m => m.idx >= 0).sort((a, b) => a.idx - b.idx);
  const unplaced = matched.filter(m => m.idx < 0);

  // Build highlighted draft, avoiding overlaps
  let html = '', cursor = 0;
  placed.forEach(m => {
    if (m.idx < cursor) return; // skip overlapping
    html += escapeHtml(draft.slice(cursor, m.idx));
    const payload = encodeURIComponent(JSON.stringify({ quote: m.quote, issue: m.issue || '', fix: m.fix || '', sev: m.sev }));
    html += `<mark class="essay-hl essay-hl--${m.sev}" data-note="${payload}" onclick="openEssayNote(this)">${escapeHtml(draft.slice(m.idx, m.idx + m.quote.length))}</mark>`;
    cursor = m.idx + m.quote.length;
  });
  html += escapeHtml(draft.slice(cursor));

  const sevLabel = s => t('essayFb.sev' + s.charAt(0).toUpperCase() + s.slice(1));

  // Notes list (all highlights, placed + unplaced)
  const allNotes = [...placed, ...unplaced];
  const notesHtml = allNotes.length ? allNotes.map(m => `
    <div class="essay-note-card sev-${m.sev}">
      <span class="essay-sev-pill sev-${m.sev}">${sevLabel(m.sev)}</span>
      <div class="essay-note-quote">“${escapeHtml(m.quote)}”</div>
      ${m.issue ? `<div class="essay-note-row"><b>${t('essayFb.issueLabel')}:</b> ${escapeHtml(m.issue)}</div>` : ''}
      ${m.fix ? `<div class="essay-note-row"><b>${t('essayFb.fixLabel')}:</b> ${escapeHtml(m.fix)}</div>` : ''}
    </div>`).join('') : `<p class="essay-fb-hint">${t('essayFb.noHighlights')}</p>`;

  const strengthsHtml = strengths.length ? `
    <div class="essay-strengths">
      <div class="form-section-title">${t('essayFb.strengthsTitle')}</div>
      ${strengths.map(s => `<div class="essay-strength-item"><span class="es-check">✓</span><span>${escapeHtml(s)}</span></div>`).join('')}
    </div>` : '';

  container.innerHTML = `
    ${data.overall ? `<div class="essay-overall-box"><div class="essay-overall-title">${t('essayFb.overallTitle')}</div>${escapeHtml(data.overall)}</div>` : ''}
    <div class="essay-fb-toggle">
      <button class="active" data-view="hl" onclick="switchEssayView(this,'hl')">${t('essayFb.viewHighlighted')}</button>
      <button data-view="notes" onclick="switchEssayView(this,'notes')">${t('essayFb.viewNotes')}</button>
    </div>
    <p class="essay-fb-hint">${t('essayFb.hint')}</p>
    <div id="essayHlView">
      <div class="form-section-title">${t('essayFb.highlightsTitle')}</div>
      <div class="essay-draft-view" dir="auto">${html}</div>
    </div>
    <div id="essayNotesView" style="display:none">
      <div class="essay-notes-list">${notesHtml}</div>
    </div>
    ${strengthsHtml}`;
}

function switchEssayView(btn, view) {
  document.querySelectorAll('.essay-fb-toggle button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('essayHlView').style.display    = view === 'hl' ? '' : 'none';
  document.getElementById('essayNotesView').style.display = view === 'notes' ? '' : 'none';
}

function openEssayNote(el) {
  ensureModal();
  const n = JSON.parse(decodeURIComponent(el.dataset.note));
  const isAr = currentLang === 'ar';
  const sevLabel = t('essayFb.sev' + n.sev.charAt(0).toUpperCase() + n.sev.slice(1));
  const body = document.getElementById('cardModalBody');
  body.innerHTML = `
    <button class="card-modal-close" onclick="closeCardModal()">✕</button>
    <div class="card-modal-header">
      <div class="card-modal-flag">🖍️</div>
      <div>
        <div class="card-modal-title"><span class="essay-sev-pill sev-${n.sev}">${sevLabel}</span></div>
        <div class="card-modal-sub">${t('essayFb.highlightsTitle')}</div>
      </div>
    </div>
    <div class="essay-note-quote" style="margin-bottom:14px">“${escapeHtml(n.quote)}”</div>
    ${n.issue ? `<div class="modal-section"><div class="modal-section-title">⚠️ ${t('essayFb.issueLabel')}</div><p style="font-size:.88rem;line-height:1.7;color:var(--text-body)">${escapeHtml(n.issue)}</p></div>` : ''}
    ${n.fix ? `<div class="modal-section"><div class="modal-section-title">✨ ${t('essayFb.fixLabel')}</div><div class="ccard-fit-box">${escapeHtml(n.fix)}</div></div>` : ''}`;
  document.getElementById('cardModalOverlay').classList.add('open');
}

/* ── EC Advisor ────────────────────────────────────────────── */
function addECRow() {
  const container = document.getElementById('ecRows');
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'ec-row';
  row.innerHTML = `
    <div class="form-group">
      <label>${t('ec.ecName')}</label>
      <input type="text" class="ec-name" placeholder="${t('ec.ecNameHint')}" />
    </div>
    <div class="form-group">
      <label>${t('ec.ecType')}</label>
      <select class="ec-type">
        <option value="Academic">Academic / Research</option>
        <option value="Leadership">Leadership</option>
        <option value="Community Service">Community Service</option>
        <option value="Sports">Sports / Athletics</option>
        <option value="Arts">Arts / Music / Writing</option>
        <option value="STEM">STEM / Robotics / Coding</option>
        <option value="Work">Work / Internship</option>
        <option value="Religious">Religious / Cultural</option>
        <option value="Other">Other</option>
      </select>
    </div>
    <div class="form-group">
      <label>${t('ec.ecRole')}</label>
      <input type="text" class="ec-role" placeholder="e.g., Founder, Captain" />
    </div>
    <button type="button" class="ec-remove-btn" onclick="removeECRow(this)">✕</button>`;
  container.appendChild(row);
}

function removeECRow(btn) { btn.closest('.ec-row').remove(); }

function addHonorRow() {
  const container = document.getElementById('honorRows');
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'honor-row';
  row.innerHTML = `
    <div class="form-group">
      <label>${t('ec.honorTitleLabel')}</label>
      <input type="text" class="honor-title" placeholder="${t('ec.honorTitleHint')}" />
    </div>
    <div class="form-group">
      <label>${t('ec.honorLevelLabel')}</label>
      <select class="honor-level">
        <option value="International">International</option>
        <option value="National">National</option>
        <option value="Regional">Regional / State</option>
        <option value="School">School</option>
      </select>
    </div>
    <div class="form-group">
      <label>${t('ec.honorGradeLabel')}</label>
      <input type="text" class="honor-grade" placeholder="e.g., Grade 11" />
    </div>
    <button type="button" class="ec-remove-btn" onclick="removeHonorRow(this)">✕</button>`;
  container.appendChild(row);
}

function removeHonorRow(btn) { btn.closest('.honor-row').remove(); }

function submitECAdvisor(event) {
  event.preventDefault();
  const rows = document.querySelectorAll('.ec-row');
  const ecs = [];
  rows.forEach(row => {
    const name = row.querySelector('.ec-name')?.value?.trim();
    const type = row.querySelector('.ec-type')?.value;
    const role = row.querySelector('.ec-role')?.value?.trim();
    if (name) ecs.push({ name, type, role });
  });
  if (!ecs.length) {
    alert(currentLang === 'ar' ? 'أضف نشاطاً واحداً على الأقل.' : 'Add at least one activity.');
    return;
  }
  // Collect honors
  const honors = [];
  document.querySelectorAll('.honor-row').forEach(row => {
    const title = row.querySelector('.honor-title')?.value?.trim();
    const level = row.querySelector('.honor-level')?.value;
    const grade = row.querySelector('.honor-grade')?.value?.trim();
    if (title) honors.push({ title, level, grade });
  });

  const targetColleges = document.getElementById('ecTargetColleges')?.value?.trim();
  const ecList = ecs.map(e => `- ${e.name} (${e.type}${e.role ? ', ' + e.role : ''})`).join('\n');
  const honorsList = honors.length
    ? honors.map(h => `- ${h.title} (${h.level}${h.grade ? ', ' + h.grade : ''})`).join('\n')
    : '(none provided)';
  const userMsg = currentLang === 'ar'
    ? `أنشطتي اللاصفية (${ecs.length}):\n${ecList}\n\nجوائزي (${honors.length}):\n${honorsList}${targetColleges ? '\n\nجامعاتي المستهدفة: ' + targetColleges : ''}\n\nقيّم قوة أنشطتي، ورتّب الأنشطة (أفضل 10 لـ Common App) والجوائز (أفضل 5)، وأخبرني بما يجب حذفه، وأفضل الجامعات المناسبة. أعطني JSON فقط.`
    : `My extracurricular activities (${ecs.length}):\n${ecList}\n\nMy honors (${honors.length}):\n${honorsList}${targetColleges ? '\n\nTarget colleges: ' + targetColleges : ''}\n\nAssess my EC strength, rank my activities (best 10 for Common App) and honors (best 5), tell me what to cut, and best college fits. Return JSON only.`;

  const loadingEl = document.getElementById('ecLoading');
  const resultEl  = document.getElementById('ecResult');
  const outputEl  = document.getElementById('ecOutput');

  if (loadingEl) loadingEl.classList.add('visible');
  if (resultEl)  resultEl.classList.remove('visible');

  callAI(
    [{ role: 'system', content: SYSTEM_PROMPTS.ec(currentLang) },
     { role: 'user',   content: userMsg }],
    () => {},
    (full) => {
      if (loadingEl) loadingEl.classList.remove('visible');
      if (resultEl)  resultEl.classList.add('visible');
      const data = parseAIJSON(full);
      if (data && data.overallStrength) renderECResult(data, outputEl);
      else outputEl.innerHTML = aiErrorHtml('document.querySelector(".form-card")?.requestSubmit?.()');
    },
    (err) => {
      if (loadingEl) loadingEl.classList.remove('visible');
      if (resultEl)  resultEl.classList.add('visible');
      outputEl.textContent = `❌ ${err.message}`;
    }
  );
}

/* Click-to-expand for EC strength/improvement cards */
function toggleECCard(el) {
  el.classList.toggle('expanded');
}

function renderECResult(data, container) {
  const isAr = currentLang === 'ar';
  const SC = {
    exceptional: { pct:100, color:'#059669', badgeCls:'card-badge--safety'  },
    strong:      { pct:80,  color:'#B79CE0', badgeCls:'card-badge--target'  },
    moderate:    { pct:55,  color:'#f59e0b', badgeCls:'card-badge--target'  },
    developing:  { pct:35,  color:'#f97316', badgeCls:'card-badge--reach'   },
    minimal:     { pct:15,  color:'#ef4444', badgeCls:'card-badge--reach'   },
  };
  const s = SC[data.overallStrength] || SC.moderate;

  // ── Assessment header (compact dark box) ──
  let html = `
    <div class="college-assessment-box" style="margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px">
        <span class="card-badge ${s.badgeCls}">⚡ ${data.tier || data.overallStrength}</span>
        <div style="flex:1;min-width:160px">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:.72rem;color:rgba(255,255,255,.6)">
            <span>${isAr ? 'قوة الأنشطة' : 'EC Strength'}</span>
            <span style="color:${s.color};font-weight:700;text-transform:capitalize">${data.overallStrength}</span>
          </div>
          <div style="height:5px;background:rgba(255,255,255,.1);border-radius:99px;overflow:hidden">
            <div id="ecStrengthBar" style="height:100%;width:0%;background:${s.color};border-radius:99px;transition:width 1.1s cubic-bezier(.4,0,.2,1) .2s;box-shadow:0 0 10px ${s.color}88"></div>
          </div>
        </div>
      </div>
      <p style="font-size:.87rem;color:rgba(255,255,255,.75);line-height:1.75;margin:0">${data.summary || ''}</p>
    </div>`;

  // helper: truncate text to N words for card title
  const shortTitle = (text, n = 7) => {
    const words = text.split(' ');
    return words.slice(0, n).join(' ') + (words.length > n ? '…' : '');
  };

  // Click-to-expand card: short headline → fuller explanation on tap.
  // Accepts a string (legacy) or { point, detail }.
  const expandCard = (item, { badgeCls, badgeLabel, icon }, i) => {
    let point, detail;
    if (item && typeof item === 'object') {
      point = item.point || item.title || '';
      detail = item.detail || item.reason || item.point || '';
    } else {
      point = shortTitle(String(item || ''), 6);
      detail = String(item || '');
    }
    const tapHint = isAr ? 'اضغط للتفاصيل' : 'Tap to expand';
    return `<div class="card card--${currentCardSize} ec-expand-card" style="animation-delay:${i * .07}s" onclick="toggleECCard(this)">
      <div class="card-badge ${badgeCls}">${badgeLabel}</div>
      <div class="card-icon">${icon}</div>
      <div class="card-title">${point}</div>
      <div class="ec-detail">${detail}</div>
      <div class="ec-expand-hint"><span class="ec-expand-hint-show">${tapHint}</span><span class="ec-expand-hint-hide">${isAr ? 'إخفاء' : 'Show less'}</span> <span class="ec-chevron">⌄</span></div>
    </div>`;
  };

  // ── Strengths cards ──
  if (data.strengths?.length) {
    html += `<div class="college-group">
      <div class="college-group-label cgl-safety">✅ ${isAr ? 'نقاط القوة' : 'Strengths'}</div>
      <div class="college-cards-grid${currentCardSize !== 'md' ? ' grid--' + currentCardSize : ''}">`;
    data.strengths.forEach((item, i) => {
      html += expandCard(item, { badgeCls: 'card-badge--safety', badgeLabel: isAr ? 'قوة' : 'Strength', icon: '✅' }, i);
    });
    html += `</div></div>`;
  }

  // ── Improvements cards ──
  if (data.improvements?.length) {
    html += `<div class="college-group">
      <div class="college-group-label cgl-target">💡 ${isAr ? 'كيف تحسّن' : 'How to Improve'}</div>
      <div class="college-cards-grid${currentCardSize !== 'md' ? ' grid--' + currentCardSize : ''}">`;
    data.improvements.forEach((item, i) => {
      html += expandCard(item, { badgeCls: 'card-badge--target', badgeLabel: isAr ? 'تحسين' : 'Action', icon: '💡' }, i);
    });
    html += `</div></div>`;
  }

  // ── Activity ranking: Keep 10 vs Cut ──
  const renderRankGroup = (items, labelKey, cls, badgeText, keep, nameKey) => {
    const list = (items || []).filter(x => !!x.keep === keep)
      .sort((a, b) => (a.rank || 99) - (b.rank || 99));
    if (!list.length) return '';
    let g = `<div class="college-group">
      <div class="college-group-label ${cls}">${t('ec.' + labelKey)}</div>
      <div class="college-cards-grid${currentCardSize !== 'md' ? ' grid--' + currentCardSize : ''}">`;
    list.forEach((x, i) => {
      g += `<div class="card card--${currentCardSize} ec-cut-card" style="animation-delay:${i * .06}s">
        <div class="ec-rank-badge">${x.rank || (i + 1)}</div>
        <div class="card-badge ${keep ? 'card-badge--safety' : 'card-badge--reach'}">${badgeText}</div>
        <div class="card-icon">${keep ? '✅' : '✂️'}</div>
        <div class="card-title">${shortTitle(x[nameKey] || '', 6)}</div>
        ${x.reason ? `<div class="card-expand-text">${x.reason}</div>` : ''}
      </div>`;
    });
    return g + `</div></div>`;
  };

  if (data.activityRanking?.length) {
    const kept = data.activityRanking.filter(x => x.keep).length;
    html += `<div class="ec-rank-header form-section-title" style="margin-top:8px">📋 ${isAr ? 'قائمة Common App' : 'Common App Activity List'} <span style="font-weight:400;color:var(--text-muted);font-size:.8rem">(${kept}/10)</span></div>`;
    html += renderRankGroup(data.activityRanking, 'keepTitle', 'cgl-keep', isAr ? 'احتفظ' : 'Keep', true, 'name');
    html += renderRankGroup(data.activityRanking, 'cutTitle', 'cgl-cut', isAr ? 'احذف' : 'Cut', false, 'name');
  }
  if (data.honorsRanking?.length) {
    html += renderRankGroup(data.honorsRanking, 'honorsKeepTitle', 'cgl-keep', isAr ? 'احتفظ' : 'Keep', true, 'title');
    html += renderRankGroup(data.honorsRanking, 'honorsCutTitle', 'cgl-cut', isAr ? 'احذف' : 'Cut', false, 'title');
  }

  // ── College match cards ──
  if (data.collegeMatches?.length) {
    html += `<div class="college-group">
      <div class="college-group-label cgl-target">🎓 ${isAr ? 'أفضل الجامعات لأنشطتك' : 'Best College Fits'}</div>
      <div class="college-cards-grid${currentCardSize !== 'md' ? ' grid--' + currentCardSize : ''}">`;
    data.collegeMatches.forEach((m, i) => {
      html += `<div class="card card--${currentCardSize}" style="animation-delay:${i * .07}s"
          data-ec-college='${JSON.stringify(m).replace(/'/g, "&#39;")}'>
        <div class="card-badge card-badge--target">${isAr ? 'مناسب' : 'EC Match'}</div>
        <div class="card-icon">🎓</div>
        <div class="card-title">${m.name}</div>
        <div class="card-expand-text">${m.reason}</div>
        <div class="card-hover-actions">
          <button class="card-more-btn ec-college-btn">${isAr ? 'تفاصيل ←' : 'More Info →'}</button>
        </div>
      </div>`;
    });
    html += `</div></div>`;
  }

  container.innerHTML = html;

  // Animate strength bar after paint
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const bar = document.getElementById('ecStrengthBar');
    if (bar) bar.style.width = `${s.pct}%`;
  }));

  // Hover overlay only for cards that open a modal (not the click-to-expand cards)
  ensureOverlay();
  ensureModal();
  const overlay = document.getElementById('hoverOverlay');
  container.querySelectorAll('.card[data-ec-college]').forEach(card => {
    card.addEventListener('mouseenter', () => overlay?.classList.add('active'));
    card.addEventListener('mouseleave', () => overlay?.classList.remove('active'));
  });

  // College match click → modal
  container.querySelectorAll('[data-ec-college]').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.ec-college-btn')) return;
      openECCollegeModal(card);
    });
  });
  container.querySelectorAll('.ec-college-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openECCollegeModal(btn.closest('[data-ec-college]'));
    });
  });

  initScrollAnimations();
}

function openECCollegeModal(cardEl) {
  ensureModal();
  const m = JSON.parse(cardEl.dataset.ecCollege);
  const isAr = currentLang === 'ar';
  const body = document.getElementById('cardModalBody');
  body.innerHTML = `
    <button class="card-modal-close" onclick="closeCardModal()">✕</button>
    <div class="card-modal-header">
      <div class="card-modal-flag">🎓</div>
      <div>
        <div class="card-modal-title">${m.name}</div>
        <div class="card-modal-sub">${isAr ? 'ملاءمة الأنشطة اللاصفية' : 'EC Fit Analysis'}</div>
      </div>
    </div>
    <div class="modal-section">
      <div class="modal-section-title">✨ ${isAr ? 'لماذا تناسب أنشطتك هذه الجامعة' : 'Why Your ECs Fit Here'}</div>
      <div class="ccard-fit-box">${m.reason}</div>
    </div>`;
  document.getElementById('cardModalOverlay').classList.add('open');
}

/* ── Shared stream-to-text helper ──────────────────────────── */
function streamToElement(messages, outputEl, loadingEl, resultEl) {
  if (loadingEl) loadingEl.classList.add('visible');
  if (resultEl)  resultEl.classList.remove('visible');
  if (outputEl)  outputEl.textContent = '';
  callAI(
    messages,
    (token) => {
      if (!loadingEl?.classList.contains('hidden')) {
        loadingEl?.classList.remove('visible');
        resultEl?.classList.add('visible');
      }
      if (outputEl) outputEl.textContent += token;
    },
    () => {
      loadingEl?.classList.remove('visible');
      resultEl?.classList.add('visible');
    },
    (err) => {
      loadingEl?.classList.remove('visible');
      resultEl?.classList.add('visible');
      if (outputEl) outputEl.textContent = `❌ ${err.message}`;
    }
  );
}

/* ── Tabs ──────────────────────────────────────────────────── */
function switchTab(tabId, btn) {
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId)?.classList.add('active');
  btn.classList.add('active');
}

/* ── System Prompts ────────────────────────────────────────── */
const JSON_COLLEGE_SCHEMA = `{"assessment":"brief assessment","colleges":[{"type":"reach","name":"University Name","location":"City, State, Country","flag":"🇺🇸","country":"USA","acceptanceRate":"4%","medianSAT":"1540","annualCost":"$57,500","financialAid":"Need-blind","earlyDeadline":"Nov 1","regularDeadline":"Jan 1","applyThrough":"Common App","bestMajors":["CS"],"pros":["Top program in your major","Strong alumni network","Good financial aid"],"cons":["Very competitive","Expensive","High stress"],"studentLife":"Vibrant campus with research focus. Competitive but collaborative. Good dorm life and activities.","careerOutcomes":"95% employed in 6mo. Avg salary $75k. Top employers: Google, Microsoft, Apple.","internships":"Most students do summer internships. Strong tech company partnerships.","saudiNotes":"Active Saudi community. Halal options available. Prayer facility on campus.","fitReason":"Your scores match this school's profile.","fitScore":85,"fitBreakdown":{"academics":90,"cost":60,"location":75,"culture":70,"size":75}}]}`;

const SYSTEM_PROMPTS = {
  collegeList: (lang) => `You are Daleel, a college advisor for Saudi students. Expert in: Saudi GPA/Qudurat/Tahsili, ACT/SAT, CPP eligibility, KASP/Mawhiba scholarships.

${lang === 'ar' ? 'Respond in Arabic only.' : 'Respond in English only.'}
Give 3 REACH (admit <15%, stats at/below median), 3 TARGET (admit 15-40%, near median), 3 SAFETY (admit >40%, above median).

For EACH school:
- **Pros**: 3 specific strengths (e.g., "Ranked #3 for CS")
- **Cons**: 3 realistic challenges
- **studentLife**: 1-2 sentences on vibe/dorms/social
- **careerOutcomes**: employment %, avg salary, top employers
- **internships**: how common, quality
- **saudiNotes**: Saudi community, halal, prayer facilities
- **fitReason**: 1 sentence on why (reference top 2 priorities)
- **fitScore**: 0-100 (weighted by their priorities)
- **fitBreakdown**: {academics, cost, location, culture, size} each 0-100

CRITICAL: Return ONLY valid JSON, no markdown, no code fences:
${JSON_COLLEGE_SCHEMA}`,

  scholarships: (lang) => `You are Daleel, a scholarship advisor for Saudi students. Know all Saudi scholarships:
Aramco CPP: SAT Math 630+ OR Qudurat 90+, GPA 85%+ cumulative AND 85%+ in Math/Science, International school graduates ONLY. Dates: application Feb/March, screening tests May 1-2, career fair June 3-4, orientation Aug 2. CPP Waiver: unconditional Top-30 offer skips prep year. Icon: 🏢
KASP (King Abdulaziz Scholarship): Government full scholarship for Saudi nationals. Approved international universities. GPA 85%+. Icon: 🏛️
Mawhiba: Gifted program for national/international competition achievers. Requires documented awards. Icon: 🌟
SABIC Scholarship: Chemistry, chemical engineering, materials science majors only. Icon: ⚗️
STC Scholarship: Technology, telecommunications, CS majors only. Icon: 📡
University Merit Aid: Based on GPA + standardized tests, varies by institution. Icon: 🎓

${lang === 'ar' ? 'Respond in Arabic only.' : 'Respond in English only.'}
Be HONEST — use exact numbers from the profile to justify each eligibility decision.

CRITICAL: Return ONLY valid JSON, no markdown, no code fences, no text outside JSON:
{"assessment":"2-3 sentence honest overview","scholarships":[{"name":"Aramco CPP","icon":"🏢","eligibility":"eligible|borderline|not_eligible","fundingType":"Full Scholarship","amount":"Full tuition + monthly stipend + housing","deadline":"Feb–March annually","requirements":"GPA 85%+, Math/Science GPA 85%+, SAT Math 630+ OR Qudurat 90+, International school only","applyVia":"aramco.com / Aramco Career Fair","website":"https://www.aramco.com/en/careers/students-and-graduates/cpp","reason":"One sentence: why eligible or not, using their exact numbers"}]}`,

  satGuide: (lang) => `You are Daleel, a test strategy advisor for Saudi students.
Qudurat: out of 100, required for Saudi public unis.
Tahsili: out of 100, required with Qudurat for Saudi public unis.
SAT: out of 1600. Accepted by KFUPM, Taibah, Prince Sultan, Al-Faisal for Saudi unis. CPP: SAT Math 630+ = Qudurat 90+.
Score equivalences (approx): Qudurat 90 ≈ SAT Math 630; Q95 ≈ SAT Math 700; Q85 ≈ SAT Math 580.
${lang === 'ar' ? 'Respond in Arabic only.' : 'Respond in English only.'}
Tell them exactly which tests they still need. Prioritize SAT Math if CPP-relevant.`,

  essay: (lang) => `You are Daleel, an essay coach for Saudi students applying to Western universities.
Know what resonates: Islamic identity with confidence (not apology), Arabic as intellectual passion, Vision 2030 entrepreneurship, generational firsts, STEM in Saudi context, building something in your city.
Warn against: over-explaining Islam, apologizing for culture, performative Mecca references, generic Vision 2030 essays.
${lang === 'ar' ? 'Respond in Arabic only.' : 'Respond in English only.'}
Give specific, actionable feedback. Quote the draft. Be honest.`,

  essayInline: (lang) => `You are Daleel, a detailed essay coach for Saudi students applying to Western universities.

WHAT RESONATES in your essays:
- Authentic voice: Write like yourself, not like a textbook. Use specific details only you know.
- Islamic identity with confidence: Explain your faith without apology or over-explanation. Show, don't tell.
- Arabic as intellectual passion: If you speak it, show how language shaped your thinking (not just "I speak two languages").
- Saudi context as an asset: Vision 2030, building something in your city, generational firsts—but avoid generic nation-building. Be specific.
- Risk-taking and failure: Admissions values learning from setbacks. Don't hide struggle; show growth.

RED FLAGS to avoid:
- Telling instead of showing: "I am a leader" = weak. "I led 30 students to…" = strong.
- Clichés: Mecca at sunrise, scrolling through your phone, "the future is bright"
- Over-explaining Islam: Assume the reader is educated. Don't translate Arabic words or explain Prayer times.
- Performative charity: "I helped poor villagers" without reflection. What did YOU learn?
- Passive voice: "Mistakes were made" vs "I failed and learned that…"
- Weak opening/closing: Hook them in sentence 1. End with a reflection or commitment, not a summary.

STRUCTURE: Strong essays have a clear arc: (1) A specific moment/scene that matters to you, (2) Why it matters (what does it reveal about your values/thinking?), (3) How it changed you or what you'll do next.

${lang === 'ar' ? 'Write all issue/fix/overall/strengths text in Arabic.' : 'Write all text in English.'}

ANALYSIS: Read the DRAFT carefully. Return inline feedback with 5–10 highlights. For each problem area:
- "quote": Copy VERBATIM (character-by-character, no changes) from the draft so it can be highlighted — this must be exact.
- "issue": What is wrong (weak verb choice, vague, cliché, tells instead of shows, etc.)
- "fix": Specific, concrete rewrite or how to fix it. Give an example if helpful.
- "severity": "high" = fundamentally hurts the essay, "medium" = worth fixing, "low" = minor polish.

CRITICAL: Return ONLY valid JSON, no markdown, no text outside JSON:
{"overall":"2-4 sentence honest assessment: Is this draft ready to submit? What's the biggest strength and biggest gap?","strengths":["specific strength that works well","..."],"highlights":[{"quote":"exact verbatim text from draft","issue":"what's wrong with this passage","fix":"specific concrete fix or rewrite example","severity":"high|medium|low"}]}`,

  ec: (lang) => `You are Daleel, a detailed EC advisor for Saudi students applying to top US universities.
TIER DEFINITIONS (use these exactly):
- Exceptional: National/international awards (e.g., Olympiad medals, published research, startup founded with traction, national speech competitions)
- Strong: Regional/national impact (e.g., state debate champ, founded school club with 50+ members, won regional competition, 50+ volunteer hours with leadership)
- Moderate: School-level leadership (e.g., club president, consistent 100+ volunteer hours, school debate team, organized school event)
- Developing: Some involvement but limited leadership (e.g., member of clubs, <50 volunteer hours, occasional activities)
- Minimal: Few or no meaningful ECs

Saudi context: Value STEM competitions (Olympiad, robotics, hackathons), Islamic leadership (Quran competition, mosque programs), Vision 2030 entrepreneurship, community service, and speech/debate.

COMMON APP CAP: 10 activities max, 5 honors max. Rank ALL activities/honors by admissions impact. Mark keep:true for strongest 10 (if ≤10, all are keep:true). For cut activities, explain WHY (weak impact, redundant with kept activities, limited leadership, too many in one category). Use EXACT names student provided.

${lang === 'ar' ? 'Respond in Arabic only.' : 'Respond in English only.'}
STRENGTHS: For each, give a SHORT point (3-6 words) + a 2-3 sentence detail that explains WHY it matters and HOW admissions reads it. (E.g., point: "Founded high-impact robotics club" → detail: "Founding clubs signals initiative and leadership. A robotics club specifically demonstrates STEM interest and ability to organize meaningful technical experiences, which selective CS programs prioritize.")

IMPROVEMENTS: Give a SHORT action point + a 2-3 sentence detail with a CONCRETE step and its impact. (E.g., point: "Publish your research" → detail: "Having a poster or paper demonstrates you can do research beyond classwork. Submit to a school science fair (easy), regional competition (better), or online journal (best). This moves you from 'strong' to 'exceptional' tier.")

CRITICAL: Return ONLY valid JSON, no markdown, no text outside:
{"overallStrength":"exceptional|strong|moderate|developing|minimal","tier":"e.g. Tier 2 — Strong Regional Leader","summary":"2-3 honest sentences. State exactly where they stand and what's needed to move up one tier.","strengths":[{"point":"short headline","detail":"2-3 sentences explaining why this matters + how admissions reads it"}],"improvements":[{"point":"short action","detail":"2-3 sentences with CONCRETE step + expected impact"}],"activityRanking":[{"name":"exact activity name","keep":true,"rank":1,"reason":"specific admissions impact or why cut (be explicit)"}],"honorsRanking":[{"title":"exact honor title","keep":true,"rank":1,"reason":"why keep or why cut"}],"collegeMatches":[{"name":"University Name","reason":"1 sentence: why your specific ECs are a strong fit there"}]}`,
};
