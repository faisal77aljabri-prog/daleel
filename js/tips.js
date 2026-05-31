/* Daleel — Weekly Tips Feed */

const TIPS_SAVED_KEY = 'daleel_saved_tips';
let tipsData = null;
let tipsFilter = 'all';

const CAT_META = {
  app:   { cls:'tip-cat-app',   enLabel:'Application', arLabel:'طلبات'  },
  test:  { cls:'tip-cat-test',  enLabel:'Test Prep',   arLabel:'اختبارات' },
  schol: { cls:'tip-cat-schol', enLabel:'Scholarships',arLabel:'منح'     },
  saudi: { cls:'tip-cat-saudi', enLabel:'Saudi',       arLabel:'سعودية'  },
  essay: { cls:'tip-cat-essay', enLabel:'Essay',       arLabel:'مقالات'  },
  aramco:{ cls:'tip-cat-saudi', enLabel:'Aramco CPP',  arLabel:'أرامكو'  },
};

function getSavedTips() {
  try { return JSON.parse(localStorage.getItem(TIPS_SAVED_KEY) || '[]'); } catch { return []; }
}
function toggleSaveTip(id, btn) {
  let saved = getSavedTips();
  if (saved.includes(id)) {
    saved = saved.filter(s => s !== id);
    if (btn) { btn.textContent = tipsTL('saveBtn'); btn.classList.remove('saved'); }
    btn?.closest('.tip-card')?.classList.remove('saved-tip');
  } else {
    saved.push(id);
    if (btn) { btn.textContent = tipsTL('savedBtn'); btn.classList.add('saved'); }
    btn?.closest('.tip-card')?.classList.add('saved-tip');
  }
  localStorage.setItem(TIPS_SAVED_KEY, JSON.stringify(saved));
}

function tipsTL(key) {
  const isAr = typeof currentLang !== 'undefined' && currentLang === 'ar';
  return (typeof T !== 'undefined' ? T[isAr ? 'ar' : 'en']?.tips?.[key] : null) || key;
}

function buildTipCard(tip, i) {
  const isAr  = typeof currentLang !== 'undefined' && currentLang === 'ar';
  const saved = getSavedTips();
  const isSaved = saved.includes(tip.id);
  const meta  = CAT_META[tip.category] || CAT_META.saudi;
  const title = isAr ? tip.titleAr : tip.titleEn;
  const text  = isAr ? tip.textAr  : tip.textEn;
  const date  = isAr ? tip.dateAr  : tip.dateEn;
  const catLabel = isAr ? meta.arLabel : meta.enLabel;

  return `<div class="tip-card ${isSaved ? 'saved-tip' : ''}" style="animation-delay:${i*.07}s" data-tid="${tip.id}">
    <span class="tip-cat-badge ${meta.cls}">${catLabel}</span>
    <div class="tip-title">${title}</div>
    <div class="tip-text">${text}</div>
    <div class="tip-foot">
      <span class="tip-date">${date}</span>
      <button class="tip-save-btn ${isSaved ? 'saved' : ''}" onclick="toggleSaveTip('${tip.id}',this)">
        ${isSaved ? tipsTL('savedBtn') : tipsTL('saveBtn')}
      </button>
    </div>
  </div>`;
}

function renderTips(tips) {
  const isAr = typeof currentLang !== 'undefined' && currentLang === 'ar';
  const grid = document.getElementById('tipsGrid');
  if (!grid) return;
  const filtered = tipsFilter === 'all' ? tips : tips.filter(t => t.category === tipsFilter || (tipsFilter === 'test' && t.category === 'aramco'));
  if (!filtered.length) {
    grid.innerHTML = `<p style="color:var(--text-muted);font-size:.85rem;grid-column:1/-1">${isAr ? 'لا نصائح في هذه الفئة.' : 'No tips in this category.'}</p>`;
    return;
  }
  grid.innerHTML = filtered.map((t, i) => buildTipCard(t, i)).join('');
}

function filterTips(cat, btn) {
  tipsFilter = cat;
  document.querySelectorAll('.tip-filter-btn').forEach(b => b.classList.remove('active'));
  btn?.classList.add('active');
  if (tipsData) renderTips(tipsData.tips);
}

function renderThisWeek(data) {
  const isAr = typeof currentLang !== 'undefined' && currentLang === 'ar';
  const featured = data.tips?.find(t => t.featured) || data.tips?.[0];
  const spot = data.spotlight;
  const widget = document.getElementById('thisWeekWidget');
  if (!widget || !featured) return;

  // Next Aramco CPP deadline
  let cdLabel = '', cdDate = '';
  try {
    const countdowns = JSON.parse(localStorage.getItem('daleel_countdowns') || '[]');
    const next = countdowns.filter(d => !d.done && d.category === 'aramco').sort((a,b) => new Date(a.date)-new Date(b.date))[0];
    if (next) {
      const days = Math.round((new Date(next.date+'T00:00:00') - new Date()) / 86400000);
      cdLabel = (isAr && next.titleAr ? next.titleAr : next.title);
      cdDate  = days >= 0 ? `${days} ${isAr ? 'يوم' : 'days'}` : (isAr ? 'منتهٍ' : 'Overdue');
    }
  } catch {}

  widget.innerHTML = `
    <div class="this-week-eyebrow">${tipsTL('thisWeekLabel')}</div>
    <div class="this-week-grid">
      <div class="this-week-item">
        <div class="this-week-item-label">${tipsTL('tipFeaturedLabel')}</div>
        <div class="this-week-item-title">${isAr ? featured.titleAr : featured.titleEn}</div>
        <div class="this-week-item-text">${(isAr ? featured.textAr : featured.textEn).slice(0,100)}…</div>
      </div>
      <div class="this-week-item">
        <div class="this-week-item-label">${tipsTL('tipDeadlineLabel')}</div>
        <div class="this-week-item-title">${cdLabel || (isAr ? 'أضف مواعيدك' : 'Add your deadlines')}</div>
        <div class="this-week-item-text">${cdDate ? `<span style="color:var(--gold);font-weight:700;font-size:1.1rem">${cdDate}</span>` : `<a href="countdown.html" style="color:var(--gold);font-size:.78rem">${isAr ? 'افتح العد التنازلي →' : 'Open Countdown →'}</a>`}</div>
      </div>
      ${spot ? `<div class="this-week-item">
        <div class="this-week-item-label">${tipsTL('tipSpotlightLabel')}</div>
        <div class="this-week-item-title">${isAr ? spot.titleAr : spot.titleEn}</div>
        <div class="this-week-item-text">${(isAr ? spot.textAr : spot.textEn).slice(0,120)}…</div>
      </div>` : ''}
    </div>`;
}

function submitQuickQuestion() {
  const isAr  = typeof currentLang !== 'undefined' && currentLang === 'ar';
  const input = document.getElementById('quickQInput');
  const ansEl = document.getElementById('quickQAnswer');
  const btn   = document.getElementById('quickQBtn');
  const q = input?.value?.trim();
  if (!q) return;

  if (btn)   btn.disabled = true;
  if (ansEl) { ansEl.style.display = 'block'; ansEl.textContent = tipsTL('loadingQ'); }

  const userMsg = isAr
    ? `سؤال سريع: ${q}\n\nأجب في جملة واحدة أو جملتين فقط. لا نصيحة عامة. كن محدداً.`
    : `Quick question: ${q}\n\nAnswer in 1–2 sentences only. No generic advice. Be specific and direct.`;

  if (typeof callAI !== 'function') return;
  callAI(
    [{ role:'system', content:`You are Daleel, a Saudi student college advisor. Answer in maximum 2 sentences. Be extremely specific, no hedging, no generic advice. ${isAr ? 'Answer in Arabic.' : 'Answer in English.'}` },
     { role:'user',   content: userMsg }],
    (token) => { if (ansEl) ansEl.textContent = (ansEl.textContent === tipsTL('loadingQ') ? '' : ansEl.textContent) + token; },
    () => { if (btn) btn.disabled = false; },
    (err) => { if (ansEl) ansEl.textContent = `❌ ${err.message}`; if (btn) btn.disabled = false; }
  );
}

async function initTipsPage() {
  try {
    const res = await fetch('tips.json');
    tipsData = await res.json();
  } catch {
    tipsData = { tips:[], spotlight:null };
  }

  renderThisWeek(tipsData);
  renderTips(tipsData.tips);

  // Category filters
  document.querySelectorAll('.tip-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => filterTips(btn.dataset.cat, btn));
  });

  // Quick question
  document.getElementById('quickQBtn')?.addEventListener('click', submitQuickQuestion);
  document.getElementById('quickQInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') submitQuickQuestion(); });
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('tipsGrid')) initTipsPage();
});
