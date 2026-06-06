/* Daleel — First-Visit Onboarding Quiz
   Shows a skippable multi-step modal on first visit, stores a canonical
   profile in localStorage (daleel_profile), and pre-fills tool forms. */

const DALEEL_PROFILE_KEY = 'daleel_profile';
const DALEEL_ONBOARDED_KEY = 'daleel_onboarded';

/* ── Account awareness ───────────────────────────────────────── */
/* The signed-in student's email, if any (read directly so this works on
   every page regardless of whether auth.js is loaded). */
function getActiveUserEmail() {
  try {
    const s = JSON.parse(localStorage.getItem('daleel_session') || 'null');
    return s?.email || null;
  } catch { return null; }
}
function userProfileKey() {
  const email = getActiveUserEmail();
  return email ? `daleel_profile_${email}` : null;
}

/* Some keys are spelled differently across tools — keep both spellings in
   sync so a value entered anywhere fills fields everywhere. */
function normalizeProfile(p) {
  if (!p || typeof p !== 'object') return {};
  if (p.satTotal == null && p.sat != null) p.satTotal = p.sat;
  if (p.sat == null && p.satTotal != null) p.sat = p.satTotal;
  return p;
}

/* ── Public helpers (used by tool pages) ─────────────────────── */
/* Read the canonical profile: the signed-in account's profile takes
   precedence, layered over the generic local profile. */
function getStoredProfile() {
  let base = {};
  try { base = JSON.parse(localStorage.getItem(DALEEL_PROFILE_KEY) || '{}'); } catch {}
  const ukey = userProfileKey();
  if (ukey) {
    try {
      const u = JSON.parse(localStorage.getItem(ukey) || '{}');
      base = { ...base, ...u }; // account values win
    } catch {}
  }
  return normalizeProfile(base);
}

/* Write the profile to the generic key AND the signed-in account key so it
   follows the student across tools and sessions. */
function saveStoredProfile(p) {
  const merged = normalizeProfile({ ...getStoredProfile(), ...p });
  localStorage.setItem(DALEEL_PROFILE_KEY, JSON.stringify(merged));
  const ukey = userProfileKey();
  if (ukey) localStorage.setItem(ukey, JSON.stringify(merged));
  return merged;
}

/* Map canonical profile keys → field IDs that may exist on the current page.
   Only fills empty fields so we never clobber what the user is typing. */
const PROFILE_FIELD_MAP = {
  gpa:      ['gpa', 'cppGpa', 'psGpa', 'schGpa'],
  gpaMath:  ['gpaMath', 'cppMathGpa', 'psMathGpa', 'schGpaMath'],
  school:   ['schoolType', 'cppSchool', 'psSchool', 'schSchoolType'],
  satMath:  ['satMath', 'cppSat', 'psSatMath', 'schSatMath'],
  satTotal: ['satTotal', 'psSatTotal'],
  act:      ['act', 'psAct'],
  qudurat:  ['qudurat', 'cppQudurat', 'psQudurat', 'schQudurat'],
  tahsili:  ['tahsili'],
  major:    ['major', 'psMajor', 'schMajor'],
  country:  ['country'],
  funding:  ['budget'],
};

function prefillForms() {
  const p = getStoredProfile();
  if (!p || !Object.keys(p).length) return;
  Object.entries(PROFILE_FIELD_MAP).forEach(([key, ids]) => {
    const val = p[key];
    if (val === undefined || val === null || val === '') return;
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const isSelect = el.tagName === 'SELECT';
      // Treat a select's first option as its default/placeholder so we can
      // overwrite it (e.g. country defaults to "No preference", not empty).
      const defaultVal = isSelect ? (el.options[0]?.value ?? '') : '';
      const hasUserValue = el.value && el.value.trim() !== '' && el.value !== defaultVal;
      if (hasUserValue) return;
      if (isSelect) {
        if ([...el.options].some(o => o.value === val)) el.value = val;
        else return;
      } else {
        el.value = val;
      }
      el.dispatchEvent(new Event('input',  { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });
}

/* Reverse of prefill: read whatever the student typed into this page's tool
   forms and merge it back into the canonical profile, so info entered in one
   tool becomes available in every other tool. */
function captureFormsToProfile() {
  const updates = {};
  Object.entries(PROFILE_FIELD_MAP).forEach(([key, ids]) => {
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) continue;
      const val = (el.value || '').trim();
      if (!val) continue;
      const isSelect = el.tagName === 'SELECT';
      const defaultVal = isSelect ? (el.options[0]?.value ?? '') : '';
      if (val === defaultVal) continue;
      updates[key] = val;
      break; // first non-empty field wins for this key
    }
  });
  if (Object.keys(updates).length) saveStoredProfile(updates);
  return updates;
}

/* One-click fill: drop everything we know about the student into this page's
   forms (overwriting blanks; leaves anything the student already typed). */
function autofillFromProfile() {
  prefillForms();
  const n = document.getElementById('daleel-autofill-note');
  if (n) {
    n.textContent = (typeof t === 'function' ? t('onboarding.autofilled') : 'Filled from your saved info ✓');
    n.style.display = 'inline';
    setTimeout(() => { n.style.display = 'none'; }, 2500);
  }
}

/* If this page has any profile-driven fields and we have saved info, drop a
   small "Use my saved info" button at the top of the first form. */
function injectAutofillButton() {
  const profile = getStoredProfile();
  if (!profile || !Object.keys(profile).length) return;

  // Does this page actually contain any mappable field?
  const hasField = Object.values(PROFILE_FIELD_MAP)
    .some(ids => ids.some(id => document.getElementById(id)));
  if (!hasField) return;
  if (document.getElementById('daleel-autofill-bar')) return;

  // Find a sensible container: the form-card / form holding the first field.
  let anchor = null;
  for (const ids of Object.values(PROFILE_FIELD_MAP)) {
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) { anchor = el.closest('.form-card, form, section, .container') || el.parentElement; break; }
    }
    if (anchor) break;
  }
  if (!anchor) return;

  const bar = document.createElement('div');
  bar.id = 'daleel-autofill-bar';
  bar.style.cssText = 'display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:18px;padding:12px 16px;background:rgba(183,156,224,.10);border:1px solid rgba(183,156,224,.3);border-radius:10px';
  const label = (typeof t === 'function' ? t('onboarding.useSaved') : '📥 Use my saved info');
  const prompt = (typeof t === 'function' ? t('onboarding.savedPrompt') : 'We have your profile saved.');
  bar.innerHTML = `
    <span style="font-size:.9rem;color:var(--text-body)">${prompt}</span>
    <button type="button" class="btn btn-primary btn-sm" onclick="autofillFromProfile()">${label}</button>
    <span id="daleel-autofill-note" style="display:none;color:#16a34a;font-size:.85rem;font-weight:600"></span>`;
  anchor.insertBefore(bar, anchor.firstChild);
}

/* ── Onboarding modal ────────────────────────────────────────── */
function ob(key) { // translate helper, falls back gracefully
  return (typeof t === 'function') ? t('onboarding.' + key) : key;
}

const OB_STEPS = [
  { title: 'sectionAcademic', fields: [
    { key: 'gpa',     label: 'q_gpa',     hint: 'q_gpaHint',     type: 'text', mode: 'decimal' },
    { key: 'gpaMath', label: 'q_gpaMath', hint: 'q_gpaMathHint', type: 'text', mode: 'decimal' },
    { key: 'school',  label: 'q_school',  type: 'select', options: [
      { v: '', l: '— Select —' },
      { v: 'Saudi Public School', l: 'Saudi Public School' },
      { v: 'International School in KSA', l: 'International School in KSA' },
      { v: 'Out-of-Kingdom School', l: 'Out-of-Kingdom School' },
    ] },
  ] },
  { title: 'sectionTests', fields: [
    { key: 'satMath',  label: 'q_satMath',  type: 'text', mode: 'numeric' },
    { key: 'satTotal', label: 'q_satTotal', type: 'text', mode: 'numeric' },
    { key: 'act',      label: 'q_act',      hint: 'q_actHint', type: 'text', mode: 'numeric' },
    { key: 'qudurat',  label: 'q_qudurat',  type: 'text', mode: 'numeric' },
    { key: 'tahsili',  label: 'q_tahsili',  type: 'text', mode: 'numeric' },
  ] },
  { title: 'sectionGoals', fields: [
    { key: 'major',   label: 'q_major', hint: 'q_majorHint', type: 'text' },
    { key: 'country', label: 'q_country', type: 'select', options: [
      { v: 'No preference', l: 'No Preference' }, { v: 'USA', l: 'USA' },
      { v: 'UK', l: 'UK' }, { v: 'Canada', l: 'Canada' }, { v: 'Australia', l: 'Australia' },
      { v: 'Europe', l: 'Europe' }, { v: 'Saudi Arabia', l: 'Saudi Arabia' }, { v: 'UAE', l: 'UAE' },
    ] },
    { key: 'funding', label: 'q_funding', type: 'select', options: [
      { v: '', l: '— Select —' },
      { v: 'Self-funded', l: 'Self-funded / Family' },
      { v: 'Seeking Aramco CPP', l: 'Seeking Aramco CPP' },
      { v: 'Seeking KASP or other scholarship', l: 'Seeking KASP or other scholarship' },
      { v: 'Flexible', l: 'Flexible / Multiple options' },
    ] },
  ] },
];

let obStepIdx = 0;
let obDraft = {};

function buildOnboarding() {
  const overlay = document.createElement('div');
  overlay.className = 'ob-overlay';
  overlay.id = 'obOverlay';
  overlay.innerHTML = `
    <div class="ob-modal" role="dialog" aria-modal="true">
      <button class="ob-skip-x" onclick="closeOnboarding(false)" aria-label="Close">✕</button>
      <div class="ob-head">
        <div class="ob-logo">دليل</div>
        <h2 class="ob-title">${ob('welcome')}</h2>
        <p class="ob-intro">${ob('intro')}</p>
      </div>
      <div class="ob-progress"><div class="ob-progress-bar" id="obBar"></div></div>
      <div class="ob-body" id="obBody"></div>
      <div class="ob-actions">
        <button class="btn btn-outline ob-back" id="obBack" onclick="obPrev()">${ob('back')}</button>
        <button class="ob-skip-link" onclick="closeOnboarding(false)">${ob('skip')}</button>
        <button class="btn btn-primary ob-next" id="obNext" onclick="obNext()">${ob('next')}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  renderOBStep();
  requestAnimationFrame(() => overlay.classList.add('open'));
}

function renderOBStep() {
  const step = OB_STEPS[obStepIdx];
  const body = document.getElementById('obBody');
  const total = OB_STEPS.length;
  const stepLabel = `${ob('step')} ${obStepIdx + 1} ${ob('of')} ${total}`;

  body.innerHTML = `
    <div class="ob-step-label">${stepLabel} · ${ob(step.title)}</div>
    <div class="ob-grid">
      ${step.fields.map(f => obField(f)).join('')}
    </div>
    <div class="ob-optional">${ob('optional')}</div>`;

  // Restore any drafted values
  step.fields.forEach(f => {
    const el = document.getElementById('ob_' + f.key);
    if (el && obDraft[f.key] !== undefined) el.value = obDraft[f.key];
  });

  // Progress + buttons
  const bar = document.getElementById('obBar');
  if (bar) bar.style.width = `${((obStepIdx + 1) / total) * 100}%`;
  document.getElementById('obBack').style.visibility = obStepIdx === 0 ? 'hidden' : 'visible';
  document.getElementById('obNext').textContent = obStepIdx === total - 1 ? ob('finish') : ob('next');
}

function obField(f) {
  const label = ob(f.label);
  const hint = f.hint ? `<small>${ob(f.hint)}</small>` : '';
  if (f.type === 'select') {
    const opts = f.options.map(o => `<option value="${o.v}">${o.l}</option>`).join('');
    return `<div class="ob-field"><label>${label}</label>${hint}
      <select id="ob_${f.key}">${opts}</select></div>`;
  }
  const mode = f.mode ? `inputmode="${f.mode}"` : '';
  return `<div class="ob-field"><label>${label}</label>${hint}
    <input type="text" ${mode} id="ob_${f.key}" autocomplete="off" /></div>`;
}

function captureOBStep() {
  OB_STEPS[obStepIdx].fields.forEach(f => {
    const el = document.getElementById('ob_' + f.key);
    if (el) obDraft[f.key] = el.value.trim();
  });
}

function obNext() {
  captureOBStep();
  if (obStepIdx < OB_STEPS.length - 1) {
    obStepIdx++;
    renderOBStep();
  } else {
    finishOnboarding();
  }
}

function obPrev() {
  captureOBStep();
  if (obStepIdx > 0) { obStepIdx--; renderOBStep(); }
}

function finishOnboarding() {
  // Strip empty values
  const clean = {};
  Object.entries(obDraft).forEach(([k, v]) => { if (v !== '' && v != null) clean[k] = v; });
  saveStoredProfile(clean);
  closeOnboarding(true);
  // Prefill the current page if it has matching forms
  prefillForms();
}

function closeOnboarding(completed) {
  localStorage.setItem(DALEEL_ONBOARDED_KEY, '1');
  const overlay = document.getElementById('obOverlay');
  if (overlay) {
    overlay.classList.remove('open');
    setTimeout(() => overlay.remove(), 350);
  }
}

/* Manual re-open (e.g. from a settings link) */
function openOnboarding() {
  obStepIdx = 0;
  obDraft = getStoredProfile();
  if (!document.getElementById('obOverlay')) buildOnboarding();
}

/* ── Bootstrap ───────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Always try to prefill forms from a saved profile
  prefillForms();
  // Offer a one-click "use my saved info" button on tool pages
  injectAutofillButton();

  // Two-way sync: whenever the student submits/runs a tool, capture what
  // they entered back into their profile so other tools benefit.
  document.addEventListener('submit', () => { try { captureFormsToProfile(); } catch (e) {} }, true);
  document.addEventListener('click', (e) => {
    const btn = e.target.closest?.('button, .btn');
    if (btn && btn.id !== 'daleel-autofill-bar') {
      try { captureFormsToProfile(); } catch (err) {}
    }
  }, true);

  // Show the quiz only on genuine first visit
  if (!localStorage.getItem(DALEEL_ONBOARDED_KEY)) {
    obDraft = {};
    // Small delay so the page paints first
    setTimeout(buildOnboarding, 600);
  }
});

// Expose for other modules (profile page, etc.)
window.daleelProfile = {
  get: getStoredProfile,
  save: saveStoredProfile,
  prefill: prefillForms,
  capture: captureFormsToProfile,
};
