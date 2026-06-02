/* Daleel — First-Visit Onboarding Quiz
   Shows a skippable multi-step modal on first visit, stores a canonical
   profile in localStorage (daleel_profile), and pre-fills tool forms. */

const DALEEL_PROFILE_KEY = 'daleel_profile';
const DALEEL_ONBOARDED_KEY = 'daleel_onboarded';

/* ── Public helpers (used by tool pages) ─────────────────────── */
function getStoredProfile() {
  try { return JSON.parse(localStorage.getItem(DALEEL_PROFILE_KEY) || '{}'); }
  catch { return {}; }
}
function saveStoredProfile(p) {
  localStorage.setItem(DALEEL_PROFILE_KEY, JSON.stringify(p));
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
      { v: 'UK', l: 'UK' }, { v: 'Canada', l: 'Canada' }, { v: 'Europe', l: 'Europe' },
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
  // Show the quiz only on genuine first visit
  if (!localStorage.getItem(DALEEL_ONBOARDED_KEY)) {
    obDraft = {};
    // Small delay so the page paints first
    setTimeout(buildOnboarding, 600);
  }
});
