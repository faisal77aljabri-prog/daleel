/* Daleel — Core App JS */

let currentLang = localStorage.getItem('daleel_lang') || 'en';

document.addEventListener('DOMContentLoaded', () => {
  applyLanguage(currentLang);
  highlightActiveNav();
  initMobileMenu();
  initScrollAnimations();
  updateListBadge();
  updateFAB();
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

/* ── College card rendering ────────────────────────────────── */
const COUNTRY_ACCENTS = {
  'USA':'#B22234','UK':'#C8102E','Canada':'#FF0000',
  'Australia':'#FFCD00','Germany':'#FFCE00','Netherlands':'#FF6600',
  'UAE':'#00732F','Singapore':'#EF3340','Japan':'#BC002D',
};

function renderCollegeCards(data, container) {
  const { assessment, colleges } = data;
  const saved = getMyList().map(c => c.name);

  let html = '';
  if (assessment) {
    html += `<div class="college-assessment-box">${assessment}</div>`;
  }

  const groups = [
    { key: 'reach',  label: currentLang === 'ar' ? '🔴 جامعات الطموح' : '🔴 Reach',  cls: 'cgl-reach' },
    { key: 'target', label: currentLang === 'ar' ? '🟡 جامعات مناسبة' : '🟡 Target', cls: 'cgl-target' },
    { key: 'safety', label: currentLang === 'ar' ? '🟢 جامعات آمنة'  : '🟢 Safety', cls: 'cgl-safety' },
  ];

  for (const g of groups) {
    const list = colleges.filter(c => c.type === g.key);
    if (!list.length) continue;
    html += `<div class="college-group">
      <div class="college-group-label ${g.cls}">${g.label}</div>`;
    list.forEach((c, i) => { html += buildCard(c, saved, i); });
    html += `</div>`;
  }

  container.innerHTML = html;
  container.querySelectorAll('.ccard-header').forEach(h => {
    h.addEventListener('click', () => toggleCard(h.closest('.ccard')));
  });
  container.querySelectorAll('.ccard-save-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const college = JSON.parse(btn.closest('.ccard').dataset.college);
      handleSave(college, btn);
    });
  });
}

function buildCard(c, saved, i) {
  const isSaved = saved.includes(c.name);
  const accent = COUNTRY_ACCENTS[c.country] || '#C9A84C';
  const saveLabel = isSaved
    ? (currentLang === 'ar' ? '✓ محفوظ' : '✓ Saved')
    : (currentLang === 'ar' ? '+ قائمتي' : '+ My List');

  return `<div class="ccard" data-college='${JSON.stringify(c).replace(/'/g, "&#39;")}'>
    <div class="ccard-header">
      <span class="ccard-type ${c.type}">${c.type}</span>
      <div class="ccard-main">
        <div class="ccard-name">${c.name}</div>
        <div class="ccard-loc">${c.flag || ''} ${c.location || ''}</div>
      </div>
      <div class="ccard-stats">
        <div class="ccard-stat">
          <span class="ccard-stat-label">${currentLang === 'ar' ? 'القبول' : 'Accept'}</span>
          <span class="ccard-stat-value">${c.acceptanceRate || '—'}</span>
        </div>
        <div class="ccard-stat">
          <span class="ccard-stat-label">${currentLang === 'ar' ? 'التكلفة' : 'Cost/yr'}</span>
          <span class="ccard-stat-value">${c.annualCost || '—'}</span>
        </div>
        <div class="ccard-stat">
          <span class="ccard-stat-label">SAT Med</span>
          <span class="ccard-stat-value">${c.medianSAT || '—'}</span>
        </div>
      </div>
      <div class="ccard-right">
        <button class="ccard-save-btn ${isSaved ? 'saved' : ''}">${saveLabel}</button>
        <span class="ccard-chevron">▼</span>
      </div>
    </div>
    <div class="ccard-body" hidden>
      <div class="location-banner" style="--loc-accent:${accent}">
        <span class="location-flag">${c.flag || '🌍'}</span>
        <div class="location-info">
          <div class="location-city">${c.location || ''}</div>
          <div class="location-country">${c.country || ''}</div>
        </div>
      </div>
      <div class="ccard-details-grid">
        <div class="ccard-detail">
          <span class="detail-label">📅 ${currentLang === 'ar' ? 'الموعد المبكر' : 'Early Deadline'}</span>
          <span class="detail-value">${c.earlyDeadline || 'N/A'}</span>
        </div>
        <div class="ccard-detail">
          <span class="detail-label">📅 ${currentLang === 'ar' ? 'الموعد العادي' : 'Regular Deadline'}</span>
          <span class="detail-value">${c.regularDeadline || '—'}</span>
        </div>
        <div class="ccard-detail">
          <span class="detail-label">🖊 ${currentLang === 'ar' ? 'التقديم عبر' : 'Apply Through'}</span>
          <span class="detail-value">${c.applyThrough || '—'}</span>
        </div>
        <div class="ccard-detail">
          <span class="detail-label">💰 ${currentLang === 'ar' ? 'المساعدة المالية' : 'Financial Aid'}</span>
          <span class="detail-value">${c.financialAid || '—'}</span>
        </div>
      </div>
      ${c.bestMajors?.length ? `
      <div class="ccard-section">
        <div class="ccard-section-label">🎯 ${currentLang === 'ar' ? 'أفضل التخصصات' : 'Best Majors'}</div>
        <div class="chips-row">${c.bestMajors.map(m => `<span class="chip">${m}</span>`).join('')}</div>
      </div>` : ''}
      ${c.saudiNotes ? `
      <div class="ccard-section">
        <div class="ccard-section-label">🇸🇦 ${currentLang === 'ar' ? 'ملاحظات سعودية' : 'Saudi Notes'}</div>
        <p class="ccard-note">${c.saudiNotes}</p>
      </div>` : ''}
      ${c.fitReason ? `
      <div class="ccard-section">
        <div class="ccard-section-label">✨ ${currentLang === 'ar' ? 'لماذا تناسبك' : 'Why This Fits You'}</div>
        <div class="ccard-fit-box">${c.fitReason}</div>
      </div>` : ''}
      <div class="ccard-body-actions">
        <button class="btn btn-primary ccard-save-btn ${isSaved ? 'saved' : ''}">
          ${isSaved
            ? (currentLang === 'ar' ? '✓ في قائمتك' : '✓ In Your List')
            : (currentLang === 'ar' ? '+ أضف لقائمتي' : '+ Add to My List')}
        </button>
      </div>
    </div>
  </div>`;
}

function toggleCard(card) {
  const body = card.querySelector('.ccard-body');
  const isOpen = !body.hidden;
  body.hidden = isOpen;
  card.classList.toggle('expanded', !isOpen);
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
    // sync sibling save buttons for same card
    btn.closest('.ccard')?.querySelectorAll('.ccard-save-btn').forEach(b => {
      b.textContent = currentLang === 'ar' ? '✓ محفوظ' : '✓ Saved';
      b.classList.add('saved');
    });
  } else {
    list.splice(idx, 1);
    btn.textContent = currentLang === 'ar' ? '+ قائمتي' : '+ My List';
    btn.classList.remove('saved');
    btn.closest('.ccard')?.querySelectorAll('.ccard-save-btn').forEach(b => {
      b.textContent = currentLang === 'ar' ? '+ قائمتي' : '+ My List';
      b.classList.remove('saved');
    });
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
    html += `<div class="college-group"><div class="college-group-label ${g.cls}">${g.label}</div>`;
    items.forEach((c, i) => { html += buildCard(c, saved, i); });
    html += `</div>`;
  }
  contentEl.innerHTML = html;

  contentEl.querySelectorAll('.ccard-header').forEach(h => {
    h.addEventListener('click', () => toggleCard(h.closest('.ccard')));
  });
  contentEl.querySelectorAll('.ccard-save-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const college = JSON.parse(btn.closest('.ccard').dataset.college);
      handleSave(college, btn);
      setTimeout(renderMyListPage, 300);
    });
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
    get('qudurat') ? `Qudurat: ${get('qudurat')}/100` : 'Qudurat: not taken',
    get('tahsili') ? `Tahsili: ${get('tahsili')}/100` : '',
    `Major: ${major}`, `Country: ${get('country') || 'No preference'}`,
    `Funding: ${budget}`, `Extracurriculars: ${ec}`,
  ].filter(Boolean).join('\n');

  const userMsg = currentLang === 'ar'
    ? `ملفي الأكاديمي:\n${profile}\n\nابنِ قائمة جامعاتي كـ JSON.`
    : `My profile:\n${profile}\n\nBuild my college list as JSON.`;

  const loadingEl = document.getElementById('aiLoading');
  const resultEl  = document.getElementById('aiResult');
  const outputEl  = document.getElementById('aiOutput');

  loadingEl.classList.add('visible');
  resultEl.classList.remove('visible');
  outputEl.innerHTML = '';

  // Show skeletons while loading
  outputEl.innerHTML = `
    <div class="skeleton skeleton-card"></div>
    <div class="skeleton skeleton-card"></div>
    <div class="skeleton skeleton-card"></div>`;

  callAI(
    [{ role: 'system', content: SYSTEM_PROMPTS.collegeList(currentLang) },
     { role: 'user',   content: userMsg }],
    (_token, _full) => { /* streaming — wait for done */ },
    (full) => {
      loadingEl.classList.remove('visible');
      resultEl.classList.add('visible');
      outputEl.innerHTML = '';
      try {
        const jsonMatch = full.match(/\{[\s\S]*\}/);
        const data = JSON.parse(jsonMatch[0]);
        if (data.colleges) { renderCollegeCards(data, outputEl); return; }
      } catch {}
      outputEl.textContent = full;
    },
    (err) => {
      loadingEl.classList.remove('visible');
      resultEl.classList.add('visible');
      outputEl.textContent = `❌ ${err.message}`;
    }
  );
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
    ? `ملفي:\n${profile}\n\nقيّم أهليتي لكل منحة متاحة للطلاب السعوديين.`
    : `My profile:\n${profile}\n\nAssess my eligibility for every scholarship available to Saudi students.`;
  streamToElement(
    [{ role: 'system', content: SYSTEM_PROMPTS.scholarships(currentLang) },
     { role: 'user',   content: userMsg }],
    document.getElementById('aiOutput'),
    document.getElementById('aiLoading'),
    document.getElementById('aiResult')
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

function submitEssay(event) {
  event.preventDefault();
  const draft   = event.target.querySelector('#draft')?.value?.trim();
  const context = event.target.querySelector('#essayContext')?.value?.trim();
  if (!draft) return;
  const parts = [];
  if (selectedPrompt) parts.push(`Prompt: ${selectedPrompt}`);
  parts.push(`Draft:\n${draft}`);
  if (context) parts.push(`Context: ${context}`);
  const userMsg = currentLang === 'ar'
    ? `${parts.join('\n\n')}\n\nأريد تقييماً تفصيلياً.`
    : `${parts.join('\n\n')}\n\nPlease give me detailed feedback.`;
  streamToElement(
    [{ role: 'system', content: SYSTEM_PROMPTS.essay(currentLang) },
     { role: 'user',   content: userMsg }],
    document.getElementById('aiOutput'),
    document.getElementById('aiLoading'),
    document.getElementById('aiResult')
  );
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
  const targetColleges = document.getElementById('ecTargetColleges')?.value?.trim();
  const ecList = ecs.map(e => `- ${e.name} (${e.type}${e.role ? ', ' + e.role : ''})`).join('\n');
  const userMsg = currentLang === 'ar'
    ? `أنشطتي اللاصفية:\n${ecList}${targetColleges ? '\n\nجامعاتي المستهدفة: ' + targetColleges : ''}\n\nقيّم قوة أنشطتي وأخبرني بأفضل الجامعات المناسبة لها. أعطني JSON فقط.`
    : `My extracurricular activities:\n${ecList}${targetColleges ? '\n\nTarget colleges: ' + targetColleges : ''}\n\nAssess my EC strength and best college fits. Return JSON only.`;

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
      try {
        const jsonMatch = full.match(/\{[\s\S]*\}/);
        const data = JSON.parse(jsonMatch[0]);
        renderECResult(data, outputEl);
      } catch {
        outputEl.textContent = full;
      }
    },
    (err) => {
      if (loadingEl) loadingEl.classList.remove('visible');
      if (resultEl)  resultEl.classList.add('visible');
      outputEl.textContent = `❌ ${err.message}`;
    }
  );
}

function renderECResult(data, container) {
  const strengthColors = {
    exceptional: { fill: 'fill-exceptional', pct: 100, color: '#059669' },
    strong:      { fill: 'fill-strong',      pct: 80,  color: '#C9A84C' },
    moderate:    { fill: 'fill-moderate',    pct: 55,  color: '#f59e0b' },
    developing:  { fill: 'fill-developing',  pct: 35,  color: '#f97316' },
    minimal:     { fill: 'fill-minimal',     pct: 15,  color: '#ef4444' },
  };
  const s = strengthColors[data.overallStrength] || strengthColors.moderate;

  let html = `
    <div class="ec-result-section">
      <span class="ec-tier-pill" style="background:${s.color}22;color:${s.color};border:1px solid ${s.color}44">
        ⚡ ${data.tier || data.overallStrength}
      </span>
      <div class="ec-strength-meter">
        <div class="ec-strength-label">
          <span>${currentLang === 'ar' ? 'قوة الأنشطة' : 'EC Strength'}</span>
          <span style="color:${s.color};font-weight:700">${data.overallStrength}</span>
        </div>
        <div class="strength-bar">
          <div class="strength-fill ${s.fill}" style="width:${s.pct}%"></div>
        </div>
      </div>
      <p style="font-size:.9rem;color:var(--text-body);line-height:1.7;margin-top:14px">${data.summary || ''}</p>
    </div>`;

  if (data.strengths?.length) {
    html += `<div class="ec-result-section">
      <div class="ccard-section-label">✅ ${currentLang === 'ar' ? 'نقاط القوة' : 'Strengths'}</div>
      <ul style="padding-inline-start:20px;font-size:.88rem;color:var(--text-body);line-height:1.8">
        ${data.strengths.map(s => `<li>${s}</li>`).join('')}
      </ul>
    </div>`;
  }

  if (data.improvements?.length) {
    html += `<div class="ec-result-section">
      <div class="ccard-section-label">💡 ${currentLang === 'ar' ? 'كيف تحسّن' : 'How to Improve'}</div>
      <ul style="padding-inline-start:20px;font-size:.88rem;color:var(--text-body);line-height:1.8">
        ${data.improvements.map(i => `<li>${i}</li>`).join('')}
      </ul>
    </div>`;
  }

  if (data.collegeMatches?.length) {
    html += `<div class="ec-result-section">
      <div class="ccard-section-label">🎓 ${currentLang === 'ar' ? 'أفضل جامعة تناسب أنشطتك' : 'Best College Fits for Your ECs'}</div>`;
    data.collegeMatches.forEach((m, i) => {
      html += `<div class="ec-match-card" style="animation-delay:${i * .08}s">
        <div class="ec-match-name">${m.name}</div>
        <div class="ec-match-reason">${m.reason}</div>
      </div>`;
    });
    html += `</div>`;
  }

  container.innerHTML = html;
  // Animate strength bar
  setTimeout(() => {
    container.querySelector('.strength-fill')?.style.setProperty('width', `${s.pct}%`);
  }, 100);
  initScrollAnimations();
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
const JSON_COLLEGE_SCHEMA = `{"assessment":"2-3 sentence honest profile assessment","colleges":[{"type":"reach","name":"Full University Name","shortName":"Short Name","location":"City, State, Country","flag":"🇺🇸","country":"USA","acceptanceRate":"4%","medianSAT":"1540","annualCost":"$57,500/yr","financialAid":"Need-blind for internationals","earlyDeadline":"Nov 1 (EA)","regularDeadline":"Jan 1 (RD)","applyThrough":"MIT Application","bestMajors":["CS","EE","Physics"],"saudiNotes":"Active Saudi club. Halal food available.","fitReason":"Your SAT Math and robotics background align with this school."}]}`;

const SYSTEM_PROMPTS = {
  collegeList: (lang) => `You are Daleel, an AI college advisor for Saudi students. Deep knowledge of:
- Saudi GPA system (percentages), Qudurat (out of 100), Scientific Qudurat, Tahsili (out of 100)
- Saudi school types and their impact on applications
- Aramco CPP eligibility: SAT Math 630+ OR Qudurat 90+, GPA 85%+ cumulative and in Math & Science, international school graduates only. CPP Waiver: unconditional Top-30 offer skips prep year.
- KASP, Mawhiba, SABIC, STC scholarships
- Saudi cultural context, halal food, Saudi student communities abroad, Vision 2030

${lang === 'ar' ? 'Respond in Arabic (العربية) only.' : 'Respond in English only.'}
Be HONEST — if a profile is weak, say so with specific improvements. Tone: direct, like a knowledgeable older sibling.
Give exactly 3 reaches, 3 targets, 3 safeties.

CRITICAL: Return ONLY valid JSON matching this schema exactly, no markdown, no code fences, no text outside JSON:
${JSON_COLLEGE_SCHEMA}`,

  scholarships: (lang) => `You are Daleel, a scholarship advisor for Saudi students. Know all Saudi scholarships:
Aramco CPP: SAT Math 630+ OR Qudurat 90+, GPA 85%+ cumulative AND 85%+ in Math & Science. International school graduates only. Application Feb/March, screening tests May 1-2, career fair June 3-4, orientation Aug 2. CPP Waiver for Top-30 admits.
KASP: Government scholarship, full funding, approved international universities.
Mawhiba: Gifted students, national/international competition achievers.
SABIC: Chemistry, chemical engineering, materials science.
STC: Technology, telecommunications, CS.
University merit/need-based aid.
${lang === 'ar' ? 'Respond in Arabic only.' : 'Respond in English only.'}
Be direct: tell them ELIGIBLE, BORDERLINE, or NOT ELIGIBLE for each scholarship with specific numbers.`,

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

  ec: (lang) => `You are Daleel, an extracurricular advisor for Saudi students. Evaluate EC profiles with US admissions knowledge.
Tiers: Exceptional (national/intl awards, published research, company founded), Strong (regional leadership, significant impact), Moderate (school leadership, consistent involvement), Developing (some activities, limited leadership), Minimal (few or no meaningful ECs).
Consider Saudi context: STEM competitions, Islamic leadership, community building, Vision 2030 entrepreneurship are valued.
${lang === 'ar' ? 'Respond in Arabic only.' : 'Respond in English only.'}
Be honest — tell them exactly where they stand and what would move them up a tier.

CRITICAL: Return ONLY valid JSON, no markdown, no text outside:
{"overallStrength":"exceptional|strong|moderate|developing|minimal","tier":"e.g. Tier 2 — Regional Level","summary":"2-3 honest sentences","strengths":["..."],"improvements":["..."],"collegeMatches":[{"name":"University Name","reason":"Why your ECs are a strong fit here"}]}`,
};
