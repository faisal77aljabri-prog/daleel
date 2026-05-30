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
  const accent = COUNTRY_ACCENTS[c.country] || '#C9A84C';
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
    <div class="card-modal-header">
      <div class="card-modal-flag">${c.flag || '🎓'}</div>
      <div>
        <div class="card-modal-title">${c.name}</div>
        <div class="card-modal-sub">${c.location || ''}</div>
      </div>
    </div>
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
    ${c.saudiNotes ? `<div class="modal-section"><div class="modal-section-title">🇸🇦 ${currentLang === 'ar' ? 'ملاحظات سعودية' : 'Saudi Notes'}</div><p style="font-size:.82rem;color:var(--text-body);line-height:1.6">${c.saudiNotes}</p></div>` : ''}
    ${c.fitReason ? `<div class="modal-section"><div class="modal-section-title">✨ ${currentLang === 'ar' ? 'لماذا تناسبك' : 'Why This Fits You'}</div><div class="ccard-fit-box">${c.fitReason}</div></div>` : ''}
    <div style="margin-top:20px">
      <button class="btn btn-primary modal-save-btn ${isSaved ? 'saved' : ''}" onclick="handleModalSave(this)">${saveLabel}</button>
    </div>`;

  document.getElementById('cardModalOverlay').classList.add('open');
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

  return `<div class="card card--${currentCardSize}" style="animation-delay:${i * .06}s" data-college='${JSON.stringify(c).replace(/'/g, "&#39;")}'>
    <div class="card-badge card-badge--${c.type}">${BADGE_LABELS[c.type] || c.type}</div>
    <div class="card-icon">${c.flag || '🎓'}</div>
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
      try {
        const jsonMatch = full.match(/\{[\s\S]*\}/);
        const data = JSON.parse(jsonMatch[0]);
        if (data.scholarships) { renderScholarshipCards(data, outputEl); return; }
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

  ec: (lang) => `You are Daleel, an extracurricular advisor for Saudi students. Evaluate EC profiles with US admissions knowledge.
Tiers: Exceptional (national/intl awards, published research, company founded), Strong (regional leadership, significant impact), Moderate (school leadership, consistent involvement), Developing (some activities, limited leadership), Minimal (few or no meaningful ECs).
Consider Saudi context: STEM competitions, Islamic leadership, community building, Vision 2030 entrepreneurship are valued.
${lang === 'ar' ? 'Respond in Arabic only.' : 'Respond in English only.'}
Be honest — tell them exactly where they stand and what would move them up a tier.

CRITICAL: Return ONLY valid JSON, no markdown, no text outside:
{"overallStrength":"exceptional|strong|moderate|developing|minimal","tier":"e.g. Tier 2 — Regional Level","summary":"2-3 honest sentences","strengths":["..."],"improvements":["..."],"collegeMatches":[{"name":"University Name","reason":"Why your ECs are a strong fit here"}]}`,
};
