/* Daleel — Countdown Dashboard */

const COUNTDOWN_PRESETS = [
  { id:'preset-cpp-screen', title:'Aramco CPP — Screening Tests', titleAr:'أرامكو CPP — اختبارات القبول',     date:'2026-05-01', category:'aramco', isPreset:true, done:false, notes:'' },
  { id:'preset-cpp-fair',   title:'Aramco CPP — Career Fair',     titleAr:'أرامكو CPP — معرض التوظيف',     date:'2026-06-03', category:'aramco', isPreset:true, done:false, notes:'' },
  { id:'preset-cpp-orient', title:'Aramco CPP — Orientation',     titleAr:'أرامكو CPP — التوجيه',           date:'2026-08-02', category:'aramco', isPreset:true, done:false, notes:'' },
  { id:'preset-ed',         title:'Common App — ED Deadline',     titleAr:'Common App — موعد ED',           date:'2026-11-01', category:'college', isPreset:true, done:false, notes:'' },
  { id:'preset-rd',         title:'Common App — RD Deadline',     titleAr:'Common App — موعد RD',           date:'2027-01-01', category:'college', isPreset:true, done:false, notes:'' },
  { id:'preset-sat-oct',    title:'SAT — October Test Date',      titleAr:'SAT — موعد أكتوبر',              date:'2025-10-04', category:'test',    isPreset:true, done:false, notes:'' },
  { id:'preset-cpp-app',    title:'Aramco CPP — Application Opens',titleAr:'أرامكو CPP — فتح التسجيل',     date:'2026-02-01', category:'aramco', isPreset:true, done:false, notes:'' },
];

const CD_KEY = 'daleel_countdowns';
let cdTimerInterval = null;

function loadCountdowns() {
  try {
    const raw = localStorage.getItem(CD_KEY);
    if (raw) return JSON.parse(raw);
    // First visit — load presets
    localStorage.setItem(CD_KEY, JSON.stringify(COUNTDOWN_PRESETS));
    return COUNTDOWN_PRESETS.map(p => ({ ...p }));
  } catch { return COUNTDOWN_PRESETS.map(p => ({ ...p })); }
}

function saveCountdowns(list) {
  localStorage.setItem(CD_KEY, JSON.stringify(list));
}

function cdDaysLeft(dateStr) {
  const target = new Date(dateStr + 'T00:00:00');
  const now    = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target - now) / 86400000);
}

function cdUrgencyClass(days) {
  if (days < 0)   return { border: '',                  num: 'cd-grey',   label: 'overdue' };
  if (days <= 7)  return { border: 'cd-urgency-red',    num: 'cd-red',    label: 'urgent' };
  if (days <= 30) return { border: 'cd-urgency-orange', num: 'cd-orange', label: 'soon' };
  if (days <= 90) return { border: 'cd-urgency-gold',   num: 'cd-gold',   label: 'coming' };
  return               { border: 'cd-urgency-green',   num: 'cd-green',  label: 'far' };
}

function cdCategoryBadge(cat, isAr) {
  const map = {
    college: { cls: 'cd-cat-college', en: 'College App',  ar: 'طلب جامعة'  },
    test:    { cls: 'cd-cat-test',    en: 'Test Date',    ar: 'موعد اختبار' },
    aramco:  { cls: 'cd-cat-aramco',  en: 'Aramco CPP',  ar: 'أرامكو CPP'  },
    custom:  { cls: 'cd-cat-custom',  en: 'Custom',       ar: 'مخصص'        },
  };
  const m = map[cat] || map.custom;
  return `<span class="cd-category-badge ${m.cls}">${isAr ? m.ar : m.en}</span>`;
}

function buildCountdownCard(item, i, isAr) {
  const days    = cdDaysLeft(item.date);
  const urgency = cdUrgencyClass(days);
  const title   = isAr && item.titleAr ? item.titleAr : item.title;
  const dateObj = new Date(item.date + 'T00:00:00');
  const dateStr = dateObj.toLocaleDateString(isAr ? 'ar-SA' : 'en-US', { year:'numeric', month:'short', day:'numeric' });

  let daysDisplay;
  if (days < 0)      daysDisplay = `<span class="countdown-days-num cd-grey">${Math.abs(days)}</span><span class="countdown-days-label">${isAr ? 'منتهٍ' : 'overdue'}</span>`;
  else if (days === 0) daysDisplay = `<span class="countdown-days-num cd-red">${isAr ? 'اليوم' : 'TODAY'}</span>`;
  else                 daysDisplay = `<span class="countdown-days-num ${urgency.num}">${days}</span><span class="countdown-days-label">${isAr ? 'يوم' : 'days'}</span>`;

  const liveId = `cdlive-${item.id}`;
  const liveRow = days >= 0 && days <= 7 ? `<div class="countdown-live-row" id="${liveId}"></div>` : '';

  return `<div class="countdown-card ${urgency.border} ${item.done ? 'done' : ''}" style="animation-delay:${i*.05}s" data-cdid="${item.id}">
    <div class="countdown-card-top">
      <div>
        ${cdCategoryBadge(item.category, isAr)}
        <div class="countdown-card-title" style="margin-top:5px">${title}</div>
        <div class="countdown-card-date">${dateStr}</div>
      </div>
      <div style="text-align:center;flex-shrink:0">
        ${daysDisplay}
      </div>
    </div>
    ${liveRow}
    ${item.notes ? `<div class="cd-notes-text">${item.notes}</div>` : ''}
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:4px">
      <button class="cd-done-btn" onclick="cdToggleDone('${item.id}')" data-cdid="${item.id}">
        ${item.done ? (isAr ? 'إلغاء' : 'Unmark') : (isAr ? '✓ تم' : '✓ Done')}
      </button>
      ${!item.isPreset ? `<button class="cd-delete-btn" onclick="cdDelete('${item.id}')" title="Delete">✕</button>` : ''}
    </div>
  </div>`;
}

function renderCountdownPage() {
  const isAr = typeof currentLang !== 'undefined' && currentLang === 'ar';
  const list = loadCountdowns();

  // Sort by date, undone first, then done
  const active = list.filter(d => !d.done).sort((a,b) => new Date(a.date) - new Date(b.date));
  const done   = list.filter(d => d.done).sort((a,b) => new Date(a.date) - new Date(b.date));
  const sorted = [...active, ...done];

  // Hero — top 3 most urgent active upcoming deadlines
  renderHero(active.filter(d => cdDaysLeft(d.date) >= 0).slice(0, 3), isAr);

  // Cards grid
  const container = document.getElementById('countdownCards');
  if (!container) return;

  if (!sorted.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⏱️</div>
      <h3>${isAr ? 'لا مواعيد مضافة' : 'No deadlines added'}</h3>
      <p>${isAr ? 'أضف تواريخك الرئيسية لبدء العد التنازلي.' : 'Add your key dates to start the countdown.'}</p></div>`;
    return;
  }

  container.innerHTML = `<div class="countdown-cards-grid">${sorted.map((d,i) => buildCountdownCard(d,i,isAr)).join('')}</div>`;

  // Start live timers for urgent cards
  startLiveTimers(active);
}

function renderHero(urgent, isAr) {
  const heroEl = document.getElementById('countdownHeroGrid');
  if (!heroEl) return;

  if (!urgent.length) {
    heroEl.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:rgba(255,255,255,.4);font-size:.9rem;padding:20px 0">
      ${isAr ? 'لا مواعيد قادمة بعد. أضف مواعيدك أدناه.' : 'No upcoming deadlines yet. Add yours below.'}
    </div>`;
    return;
  }

  heroEl.innerHTML = urgent.map(item => {
    const days = cdDaysLeft(item.date);
    const ms   = Math.max(0, new Date(item.date + 'T00:00:00') - new Date());
    const hrs  = Math.floor((ms % 86400000) / 3600000);
    const mins = Math.floor((ms % 3600000)  / 60000);
    const secs = Math.floor((ms % 60000)    / 1000);
    const title = isAr && item.titleAr ? item.titleAr : item.title;
    return `<div class="countdown-hero-item" data-hero-id="${item.id}">
      <div class="countdown-hero-label">${title}</div>
      <div class="countdown-hero-nums">
        <div class="countdown-num-block">
          <span class="countdown-big-num" id="hd-${item.id}">${String(days).padStart(2,'0')}</span>
          <span class="countdown-unit-label">${isAr ? 'يوم' : 'days'}</span>
        </div>
        <span class="countdown-sep">:</span>
        <div class="countdown-num-block">
          <span class="countdown-big-num" id="hh-${item.id}">${String(hrs).padStart(2,'0')}</span>
          <span class="countdown-unit-label">${isAr ? 'ساعة' : 'hrs'}</span>
        </div>
        <span class="countdown-sep">:</span>
        <div class="countdown-num-block">
          <span class="countdown-big-num" id="hm-${item.id}">${String(mins).padStart(2,'0')}</span>
          <span class="countdown-unit-label">${isAr ? 'دقيقة' : 'min'}</span>
        </div>
        <span class="countdown-sep">:</span>
        <div class="countdown-num-block">
          <span class="countdown-big-num" id="hs-${item.id}">${String(secs).padStart(2,'0')}</span>
          <span class="countdown-unit-label">${isAr ? 'ثانية' : 'sec'}</span>
        </div>
      </div>
    </div>`;
  }).join('');
}

function startLiveTimers(active) {
  if (cdTimerInterval) clearInterval(cdTimerInterval);
  const isAr = typeof currentLang !== 'undefined' && currentLang === 'ar';

  cdTimerInterval = setInterval(() => {
    active.forEach(item => {
      const ms   = Math.max(0, new Date(item.date + 'T00:00:00') - new Date());
      const days = Math.floor(ms / 86400000);
      const hrs  = Math.floor((ms % 86400000) / 3600000);
      const mins = Math.floor((ms % 3600000)  / 60000);
      const secs = Math.floor((ms % 60000)    / 1000);

      // Update hero
      const hd = document.getElementById(`hd-${item.id}`);
      const hh = document.getElementById(`hh-${item.id}`);
      const hm = document.getElementById(`hm-${item.id}`);
      const hs = document.getElementById(`hs-${item.id}`);
      if (hd) hd.textContent = String(days).padStart(2,'0');
      if (hh) hh.textContent = String(hrs).padStart(2,'0');
      if (hm) hm.textContent = String(mins).padStart(2,'0');
      if (hs) hs.textContent = String(secs).padStart(2,'0');

      // Update inline live row for urgent cards
      const liveEl = document.getElementById(`cdlive-${item.id}`);
      if (liveEl && days <= 7) {
        liveEl.innerHTML = `
          <span class="countdown-live-chip">${String(hrs).padStart(2,'0')}${isAr ? 'س' : 'h'}</span>
          <span class="countdown-live-chip">${String(mins).padStart(2,'0')}${isAr ? 'د' : 'm'}</span>
          <span class="countdown-live-chip">${String(secs).padStart(2,'0')}${isAr ? 'ث' : 's'}</span>`;
      }
    });
  }, 1000);
}

function cdToggleDone(id) {
  const list = loadCountdowns();
  const item = list.find(d => d.id === id);
  if (item) { item.done = !item.done; saveCountdowns(list); }
  renderCountdownPage();
}

function cdDelete(id) {
  const list = loadCountdowns().filter(d => d.id !== id);
  saveCountdowns(list);
  renderCountdownPage();
}

function cdAddDeadline(event) {
  event.preventDefault();
  const isAr = typeof currentLang !== 'undefined' && currentLang === 'ar';
  const title = document.getElementById('cdTitle')?.value?.trim();
  const date  = document.getElementById('cdDate')?.value;
  const cat   = document.getElementById('cdCat')?.value || 'custom';
  const notes = document.getElementById('cdNotes')?.value?.trim() || '';
  if (!title || !date) return;

  const list = loadCountdowns();
  list.push({ id: `cd-${Date.now()}`, title, titleAr: title, date, category: cat, isPreset: false, done: false, notes });
  saveCountdowns(list);

  // Reset form
  event.target.reset();
  document.getElementById('cdAddFormWrap').style.display = 'none';
  renderCountdownPage();
}

function initCountdownPage() {
  renderCountdownPage();

  // Add deadline form toggle
  document.getElementById('cdAddBtn')?.addEventListener('click', () => {
    const wrap = document.getElementById('cdAddFormWrap');
    wrap.style.display = wrap.style.display === 'none' ? '' : 'none';
  });
  document.getElementById('cdAddForm')?.addEventListener('submit', cdAddDeadline);
  document.getElementById('cdCancelBtn')?.addEventListener('click', () => {
    document.getElementById('cdAddFormWrap').style.display = 'none';
  });

  // Set min date for input
  const dateInput = document.getElementById('cdDate');
  if (dateInput) dateInput.min = new Date().toISOString().split('T')[0];
}

/* ── Floating Urgent Widget (injected on ALL pages) ── */
function initUrgentWidget() {
  const isAr = typeof currentLang !== 'undefined' && currentLang === 'ar';
  let list;
  try { list = JSON.parse(localStorage.getItem(CD_KEY) || '[]'); } catch { return; }

  const upcoming = list
    .filter(d => !d.done && cdDaysLeft(d.date) >= 0 && cdDaysLeft(d.date) <= 90)
    .sort((a,b) => new Date(a.date) - new Date(b.date));

  if (!upcoming.length) return;
  const next = upcoming[0];
  const days = cdDaysLeft(next.date);
  const title = isAr && next.titleAr ? next.titleAr : next.title;

  // Don't show on countdown page itself
  if (window.location.pathname.includes('countdown')) return;
  // Don't duplicate
  if (document.getElementById('urgentWidget')) return;

  const el = document.createElement('a');
  el.id        = 'urgentWidget';
  el.href      = 'countdown.html';
  el.className = 'urgent-widget';
  el.innerHTML = `<div class="urgent-widget-days">${days}</div>
    <div class="urgent-widget-info">
      <span class="urgent-widget-label">${isAr ? 'يوم · الموعد القادم' : 'days · next deadline'}</span>
      <span class="urgent-widget-name">${title}</span>
    </div>`;
  document.body.appendChild(el);
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('countdownCards')) initCountdownPage();
  // Widget always tries to init (it guards against countdown page internally)
  initUrgentWidget();
});
