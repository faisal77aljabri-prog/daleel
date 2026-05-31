/* Daleel — Application Tracker */

const TRACKER_KEY = 'daleel_tracker';

const CPP_PINNED = [
  { id:'cpp-pin-1', name:'Aramco CPP — Application Opens', nameAr:'أرامكو CPP — فتح التسجيل', country:'Saudi Arabia', appType:'CPP', deadline:'2026-02-01', status:'not-started', notes:'Application opens February. Prepare: transcript, SAT Math score (630+), school counselor contact.', isPinned:true, checklist:{ personalStatement:false, supplements:false, transcript:false, recommendations:false, satScores:false, financialAid:false } },
  { id:'cpp-pin-2', name:'Aramco CPP — Screening Tests', nameAr:'أرامكو CPP — اختبارات القبول', country:'Saudi Arabia', appType:'CPP', deadline:'2026-05-01', status:'not-started', notes:'Separate registration required. Tests assess academic aptitude and English proficiency.', isPinned:true, checklist:{ personalStatement:false, supplements:false, transcript:false, recommendations:false, satScores:false, financialAid:false } },
  { id:'cpp-pin-3', name:'Aramco CPP — Career Fair', nameAr:'أرامكو CPP — معرض التوظيف', country:'Saudi Arabia', appType:'CPP', deadline:'2026-06-03', status:'not-started', notes:'In-person career fair. Dress professionally. Formally accept the sponsorship here.', isPinned:true, checklist:{ personalStatement:false, supplements:false, transcript:false, recommendations:false, satScores:false, financialAid:false } },
];

const STATUS_ORDER = ['not-started','in-progress','submitted','deferred','waitlisted','accepted','rejected'];
const CHECKLIST_KEYS = ['personalStatement','supplements','transcript','recommendations','satScores','financialAid'];

function loadTracker() {
  try { return JSON.parse(localStorage.getItem(TRACKER_KEY) || '[]'); } catch { return []; }
}
function saveTracker(list) { localStorage.setItem(TRACKER_KEY, JSON.stringify(list)); }

function tlText(key) {
  const isAr = typeof currentLang !== 'undefined' && currentLang === 'ar';
  return (typeof T !== 'undefined' ? T[isAr ? 'ar' : 'en']?.tracker?.[key] : null) || key;
}

function statusLabel(status) {
  const map = {
    'not-started':'statusNotStarted','in-progress':'statusInProgress','submitted':'statusSubmitted',
    'deferred':'statusDeferred','waitlisted':'statusWaitlisted','accepted':'statusAccepted','rejected':'statusRejected',
  };
  return tlText(map[status] || 'statusNotStarted');
}
function statusClass(status) {
  const map = { 'not-started':'ts-not-started','in-progress':'ts-in-progress','submitted':'ts-submitted','deferred':'ts-deferred','waitlisted':'ts-waitlisted','accepted':'ts-accepted','rejected':'ts-rejected' };
  return map[status] || 'ts-not-started';
}
function checklistLabel(key) {
  const map = { personalStatement:'checkPS', supplements:'checkSupp', transcript:'checkTranscript', recommendations:'checkRecs', satScores:'checkSAT', financialAid:'checkAid' };
  return tlText(map[key] || key);
}

function trackerDaysLeft(dateStr) {
  const target = new Date(dateStr + 'T00:00:00');
  const now = new Date(); now.setHours(0,0,0,0);
  return Math.round((target - now) / 86400000);
}

function checklistProgress(checklist) {
  const done  = CHECKLIST_KEYS.filter(k => checklist[k]).length;
  const total = CHECKLIST_KEYS.length;
  return { done, total, pct: Math.round((done/total)*100) };
}

function buildDeadlineRow(item) {
  if (item.status === 'accepted') return `<div class="tracker-deadline-row accepted-done">🎉 ${tlText('deadlineDone')}</div>`;
  if (item.status === 'rejected') return '';
  if (!item.deadline) return '';
  const days = trackerDaysLeft(item.deadline);
  const dateStr = new Date(item.deadline + 'T00:00:00').toLocaleDateString(
    typeof currentLang !== 'undefined' && currentLang === 'ar' ? 'ar-SA' : 'en-US',
    { month:'short', day:'numeric', year:'numeric' }
  );
  let cls = 'tracker-deadline-row', txt;
  if (days < 0)      { cls += ' overdue'; txt = `❗ ${tlText('deadlineOverdue')} · ${dateStr}`; }
  else if (days === 0){ cls += ' urgent';  txt = `🔥 ${tlText('deadlineToday')} · ${dateStr}`; }
  else if (days <= 30){ cls += ' urgent';  txt = `⏰ ${days} ${tlText('deadlineDays')} · ${dateStr}`; }
  else                { txt = `📅 ${days} ${tlText('deadlineDays')} · ${dateStr}`; }
  return `<div class="${cls}">${txt}</div>`;
}

function buildTrackerCard(item, idx) {
  const isAr    = typeof currentLang !== 'undefined' && currentLang === 'ar';
  const name    = isAr && item.nameAr ? item.nameAr : item.name;
  const prog    = checklistProgress(item.checklist);
  const metaStr = [item.country, item.appType].filter(Boolean).join(' · ');

  return `<div class="tracker-card ${item.isPinned ? 'pinned' : ''}" style="animation-delay:${idx*.06}s" data-tid="${item.id}">
    <div class="tracker-card-top">
      <div style="flex:1;min-width:0">
        <div class="tracker-uni-name">${item.isPinned ? '🛢️ ' : ''}${name}</div>
        ${metaStr ? `<div class="tracker-uni-meta">${metaStr}</div>` : ''}
      </div>
      <span class="tracker-status-badge ${statusClass(item.status)}">${statusLabel(item.status)}</span>
    </div>
    ${buildDeadlineRow(item)}
    <div>
      <div class="tracker-checklist-bar"><div class="tracker-checklist-fill" style="width:${prog.pct}%"></div></div>
      <div class="tracker-checklist-pct">${prog.done}/${prog.total} ${tlText('progressLabel')}</div>
    </div>
  </div>`;
}

function renderTrackerPage() {
  const isAr = typeof currentLang !== 'undefined' && currentLang === 'ar';
  const userList = loadTracker();

  // Stats
  const total     = userList.length;
  const submitted = userList.filter(c => ['submitted','deferred','waitlisted','accepted','rejected'].includes(c.status)).length;
  const accepted  = userList.filter(c => c.status === 'accepted').length;
  const inProg    = userList.filter(c => ['not-started','in-progress'].includes(c.status)).length;

  const statsEl = document.getElementById('trackerStats');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="tracker-stat-card"><span class="tracker-stat-num">${total}</span><span class="tracker-stat-label">${tlText('statsTotal')}</span></div>
      <div class="tracker-stat-card"><span class="tracker-stat-num" style="color:#1e40af">${submitted}</span><span class="tracker-stat-label">${tlText('statsSubmitted')}</span></div>
      <div class="tracker-stat-card"><span class="tracker-stat-num" style="color:#065f46">${accepted}</span><span class="tracker-stat-label">${tlText('statsAccepted')}</span></div>
      <div class="tracker-stat-card"><span class="tracker-stat-num" style="color:#7a5c1e">${inProg}</span><span class="tracker-stat-label">${tlText('statsPending')}</span></div>`;
  }

  // Pinned CPP section
  const pinnedEl = document.getElementById('trackerPinned');
  if (pinnedEl) {
    pinnedEl.innerHTML = `<div class="tracker-section-label">${tlText('pinnedLabel')}</div>
      <div class="college-cards-grid" id="pinnedGrid">
        ${CPP_PINNED.map((c,i) => buildTrackerCard(c,i)).join('')}
      </div>`;
  }

  // User section
  const userEl = document.getElementById('trackerContent');
  if (!userEl) return;

  if (!userList.length) {
    userEl.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">📋</div>
      <h3>${tlText('emptyTitle')}</h3>
      <p>${tlText('emptyDesc')}</p>
    </div>`;
  } else {
    userEl.innerHTML = `<div class="tracker-section-label" style="margin-top:28px">${tlText('userLabel')}</div>
      <div class="college-cards-grid">${userList.map((c,i) => buildTrackerCard(c,i)).join('')}</div>`;
  }

  // Bind card clicks (open modal)
  document.querySelectorAll('.tracker-card').forEach(card => {
    card.addEventListener('click', () => openTrackerModal(card.dataset.tid));
  });

  // Hover overlay
  if (typeof ensureOverlay === 'function') ensureOverlay();
  const overlay = document.getElementById('hoverOverlay');
  document.querySelectorAll('.tracker-card').forEach(card => {
    card.addEventListener('mouseenter', () => overlay?.classList.add('active'));
    card.addEventListener('mouseleave', () => overlay?.classList.remove('active'));
  });

  if (typeof initScrollAnimations === 'function') initScrollAnimations();
}

function openTrackerModal(id) {
  if (typeof ensureModal !== 'function') return;
  ensureModal();
  const isAr = typeof currentLang !== 'undefined' && currentLang === 'ar';

  // Find item — check user list first, then pinned
  const userList = loadTracker();
  let item = userList.find(c => c.id === id);
  let isPinnedItem = false;
  if (!item) { item = CPP_PINNED.find(c => c.id === id); isPinnedItem = true; }
  if (!item) return;

  const name = isAr && item.nameAr ? item.nameAr : item.name;
  const prog = checklistProgress(item.checklist);

  const checklistHtml = CHECKLIST_KEYS.map(key => `
    <div class="tracker-check-item ${item.checklist[key] ? 'checked' : ''}" data-key="${key}" onclick="trackerToggleCheck('${id}','${key}',${isPinnedItem})">
      <input type="checkbox" ${item.checklist[key] ? 'checked' : ''} onclick="event.stopPropagation()" onchange="trackerToggleCheck('${id}','${key}',${isPinnedItem})" />
      <span class="tracker-check-label">${checklistLabel(key)}</span>
    </div>`).join('');

  const statusOptions = STATUS_ORDER.map(s =>
    `<option value="${s}" ${item.status === s ? 'selected' : ''}>${statusLabel(s)}</option>`).join('');

  const body = document.getElementById('cardModalBody');
  body.dataset.tid = id;
  body.dataset.isPinned = isPinnedItem;
  body.innerHTML = `
    <button class="card-modal-close" onclick="closeCardModal()">✕</button>
    <div class="card-modal-header">
      <div class="card-modal-flag">${item.isPinned ? '🛢️' : '🎓'}</div>
      <div style="padding-inline-end:36px">
        <div class="card-modal-title">${name}</div>
        <div class="card-modal-sub">${[item.country, item.appType].filter(Boolean).join(' · ')}${item.deadline ? ' · ' + new Date(item.deadline+'T00:00:00').toLocaleDateString() : ''}</div>
      </div>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">${isAr ? 'الحالة' : 'Status'}</div>
      <select class="tracker-status-select" id="trackerStatusSel" onchange="trackerUpdateStatus('${id}',this.value,${isPinnedItem})">
        ${statusOptions}
      </select>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">${tlText('progressLabel')} — ${prog.done}/${prog.total} (${prog.pct}%)</div>
      <div class="tracker-checklist-bar" style="margin-bottom:12px"><div class="tracker-checklist-fill" id="modalCheckBar" style="width:${prog.pct}%"></div></div>
      <div class="tracker-checklist-modal">${checklistHtml}</div>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">${isAr ? 'ملاحظات' : 'Notes'}</div>
      <textarea class="tracker-notes-area" id="trackerNotesArea" placeholder="${tlText('notesPlaceholder')}">${item.notes || ''}</textarea>
    </div>

    <div class="tracker-modal-actions">
      <button class="btn btn-primary" onclick="saveTrackerModal('${id}',${isPinnedItem})">${tlText('modalSave')}</button>
      ${!isPinnedItem ? `<button class="btn btn-outline" style="color:#ef4444;border-color:#fca5a5" onclick="deleteTrackerEntry('${id}')">${tlText('modalDelete')}</button>` : ''}
    </div>`;

  document.getElementById('cardModalOverlay').classList.add('open');
}

function trackerToggleCheck(id, key, isPinned) {
  if (isPinned) {
    const item = CPP_PINNED.find(c => c.id === id);
    if (item) item.checklist[key] = !item.checklist[key];
  } else {
    const list = loadTracker();
    const item = list.find(c => c.id === id);
    if (item) { item.checklist[key] = !item.checklist[key]; saveTracker(list); }
  }
  // Re-render checklist items
  const prog = checklistProgress(
    isPinned ? CPP_PINNED.find(c=>c.id===id)?.checklist : loadTracker().find(c=>c.id===id)?.checklist || {}
  );
  document.querySelectorAll(`[data-key="${key}"]`).forEach(el => {
    const checked = isPinned
      ? CPP_PINNED.find(c=>c.id===id)?.checklist[key]
      : loadTracker().find(c=>c.id===id)?.checklist[key];
    el.classList.toggle('checked', !!checked);
    el.querySelector('input').checked = !!checked;
    el.querySelector('.tracker-check-label').parentElement.classList.toggle('checked', !!checked);
  });
  const bar = document.getElementById('modalCheckBar');
  if (bar) bar.style.width = `${prog.pct}%`;
}

function trackerUpdateStatus(id, newStatus, isPinned) {
  if (!isPinned) {
    const list = loadTracker();
    const item = list.find(c => c.id === id);
    if (item) { item.status = newStatus; saveTracker(list); }
  }
}

function saveTrackerModal(id, isPinned) {
  const notes  = document.getElementById('trackerNotesArea')?.value || '';
  const status = document.getElementById('trackerStatusSel')?.value || 'not-started';
  if (!isPinned) {
    const list = loadTracker();
    const item = list.find(c => c.id === id);
    if (item) { item.notes = notes; item.status = status; saveTracker(list); }
  }
  if (typeof closeCardModal === 'function') closeCardModal();
  renderTrackerPage();
}

function deleteTrackerEntry(id) {
  const isAr = typeof currentLang !== 'undefined' && currentLang === 'ar';
  if (!confirm(isAr ? 'هل تريد حذف هذه الجامعة؟' : 'Delete this university from your tracker?')) return;
  saveTracker(loadTracker().filter(c => c.id !== id));
  if (typeof closeCardModal === 'function') closeCardModal();
  renderTrackerPage();
}

function addTrackerEntry(event) {
  event.preventDefault();
  const name     = document.getElementById('tUniName')?.value?.trim();
  const country  = document.getElementById('tCountry')?.value?.trim() || '';
  const appType  = document.getElementById('tAppType')?.value || 'RD';
  const deadline = document.getElementById('tDeadline')?.value || '';
  const notes    = document.getElementById('tNotes')?.value?.trim() || '';
  if (!name) return;

  const list = loadTracker();
  list.push({
    id: `t-${Date.now()}`,
    name, nameAr: name, country, appType, deadline, notes,
    status: 'not-started', isPinned: false,
    checklist: { personalStatement:false, supplements:false, transcript:false, recommendations:false, satScores:false, financialAid:false },
  });
  saveTracker(list);
  event.target.reset();
  document.getElementById('trackerAddFormWrap').style.display = 'none';
  renderTrackerPage();
}

function initTrackerPage() {
  if (typeof ensureOverlay === 'function') ensureOverlay();
  if (typeof ensureModal  === 'function') ensureModal();

  renderTrackerPage();

  document.getElementById('trackerAddBtn')?.addEventListener('click', () => {
    const wrap = document.getElementById('trackerAddFormWrap');
    if (wrap) wrap.style.display = wrap.style.display === 'none' ? '' : 'none';
  });
  document.getElementById('trackerAddForm')?.addEventListener('submit', addTrackerEntry);
  document.getElementById('tCancelBtn')?.addEventListener('click', () => {
    document.getElementById('trackerAddFormWrap').style.display = 'none';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('trackerStats')) initTrackerPage();
});
