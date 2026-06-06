/**
 * Profile Hub Module — Unified dashboard for all student profile data
 * Loads from and saves to Supabase.
 */

let profileData = {};
let isEditMode = false;

/**
 * Initialize profile page: require auth, load profile data.
 */
function initProfile() {
  const userEmail = daleel.auth.requireAuth();
  if (userEmail) {
    document.getElementById('userEmail').textContent = userEmail;
    loadProfile();
  }
}

/**
 * Load profile data from localStorage.
 */
function loadProfile() {
  const userEmail = daleel.auth.getSessionUser();

  if (!userEmail) {
    console.error('No user session found');
    return;
  }

  try {
    const stored = localStorage.getItem(`daleel_profile_${userEmail}`);
    if (stored) {
      profileData = JSON.parse(stored);
    } else {
      profileData = {};
    }
  } catch (err) {
    console.error('Error loading profile:', err);
    profileData = {};
  }

  renderProfile();
}

/**
 * Render profile data on the page.
 */
function renderProfile() {
  // Academics
  set('val-gpa', profileData.gpa ? `${profileData.gpa}%` : '—');
  set('val-gpamath', profileData.gpaMath ? `${profileData.gpaMath}%` : '—');
  set('val-school', profileData.school || '—');
  set('val-major', profileData.major || '—');
  set('val-country', profileData.country || '—');
  set('val-funding', profileData.funding || '—');
  set('val-qudurat', profileData.qudurat ? `${profileData.qudurat}` : '—');
  set('val-tahsili', profileData.tahsili ? `${profileData.tahsili}` : '—');

  // Tests
  set('val-sat', profileData.sat ? `${profileData.sat}` : '—');
  set('val-satmath', profileData.satMath ? `${profileData.satMath}` : '—');
  set('val-act', profileData.act ? `${profileData.act}` : '—');
  set('val-ap', profileData.ap || '—');

  // ECs — render the saved portfolio
  renderSavedECs();

  // Essays
  set('val-ps-status', profileData.psStatus || '—');
  set('val-rec-count', profileData.recCount ? `${profileData.recCount} letters` : '—');

  // Saved colleges
  renderSavedColleges();
}

/**
 * Render the saved EC portfolio (same data the EC Portfolio page saves).
 */
function renderSavedECs() {
  const container = document.getElementById('profile-ecs-list');
  if (!container) return;

  const ecs = Array.isArray(profileData.ecs) ? profileData.ecs : [];
  const badge = document.getElementById('ec-count-badge');
  if (badge) badge.textContent = ecs.length ? `(${ecs.length})` : '';

  if (ecs.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted)">No activities saved yet. <a href="ec-advisor.html">Add your first one →</a></p>';
    return;
  }

  container.innerHTML = ecs.map(ec => `
    <div class="profile-college-card" style="flex-direction:column;align-items:stretch;gap:6px">
      <div style="font-weight:700;color:var(--text-dark)">${escapeHTML(ec.name || 'Untitled')}</div>
      ${ec.description ? `<div style="font-size:0.9rem;color:var(--text-body)">${escapeHTML(ec.description)}</div>` : ''}
      ${ec.impact ? `<div style="font-size:0.85rem;color:var(--text-muted)"><strong>Impact:</strong> ${escapeHTML(ec.impact)}</div>` : ''}
      ${ec.duration ? `<div style="font-size:0.85rem;color:var(--text-muted)"><strong>Duration:</strong> ${escapeHTML(ec.duration)}</div>` : ''}
      ${ec.awards ? `<div style="font-size:0.85rem;color:var(--text-muted)"><strong>Awards:</strong> ${escapeHTML(ec.awards)}</div>` : ''}
    </div>
  `).join('');
}

/**
 * Escape HTML to prevent broken layout / injection from saved text.
 */
function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Render saved colleges list.
 */
function renderSavedColleges() {
  const myList = getMyList?.() || [];
  const container = document.getElementById('saved-colleges-list');
  if (!container) return;

  if (myList.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted)">No colleges saved yet. <a href="college-list.html">Start building your list →</a></p>';
  } else {
    container.innerHTML = myList.map(c => `
      <div class="profile-college-card">
        <div class="profile-college-name">${c.name}</div>
        <div class="profile-college-loc">${c.location || ''}</div>
        <div class="profile-college-type">${c.type}</div>
      </div>
    `).join('');
  }
}

/**
 * Switch tab.
 */
function switchTab(tabName, btn) {
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${tabName}`).classList.add('active');
  btn.classList.add('active');
}

/**
 * Enter edit mode: show input fields.
 */
function editMode() {
  isEditMode = true;
  document.querySelectorAll('[id^="val-"]').forEach(el => el.style.display = 'none');
  document.querySelectorAll('[id^="edit-"]').forEach(el => el.style.display = 'block');
  document.getElementById('saveRow').style.display = 'flex';

  // Populate edit fields with current values
  populateEditFields();
}

/**
 * Populate edit fields with current profile data.
 */
function populateEditFields() {
  document.getElementById('edit-gpa').value = profileData.gpa || '';
  document.getElementById('edit-gpamath').value = profileData.gpaMath || '';
  document.getElementById('edit-school').value = profileData.school || '';
  document.getElementById('edit-major').value = profileData.major || '';
  document.getElementById('edit-country').value = profileData.country || '';
  document.getElementById('edit-funding').value = profileData.funding || '';
  document.getElementById('edit-qudurat').value = profileData.qudurat || '';
  document.getElementById('edit-tahsili').value = profileData.tahsili || '';
  document.getElementById('edit-sat').value = profileData.sat || '';
  document.getElementById('edit-satmath').value = profileData.satMath || '';
  document.getElementById('edit-act').value = profileData.act || '';
  document.getElementById('edit-ap').value = profileData.ap || '';
  document.getElementById('edit-ps-status').value = profileData.psStatus || '';
  document.getElementById('edit-rec-count').value = profileData.recCount || '';
}

/**
 * Cancel edit mode.
 */
function cancelEdit() {
  isEditMode = false;
  document.querySelectorAll('[id^="val-"]').forEach(el => el.style.display = 'block');
  document.querySelectorAll('[id^="edit-"]').forEach(el => el.style.display = 'none');
  document.getElementById('saveRow').style.display = 'none';
}

/**
 * Save profile changes to localStorage.
 */
function saveProfile() {
  profileData.gpa = document.getElementById('edit-gpa').value || undefined;
  profileData.gpaMath = document.getElementById('edit-gpamath').value || undefined;
  profileData.school = document.getElementById('edit-school').value || undefined;
  profileData.major = document.getElementById('edit-major').value || undefined;
  profileData.country = document.getElementById('edit-country').value || undefined;
  profileData.funding = document.getElementById('edit-funding').value || undefined;
  profileData.qudurat = document.getElementById('edit-qudurat').value || undefined;
  profileData.tahsili = document.getElementById('edit-tahsili').value || undefined;
  profileData.sat = document.getElementById('edit-sat').value || undefined;
  profileData.satMath = document.getElementById('edit-satmath').value || undefined;
  profileData.act = document.getElementById('edit-act').value || undefined;
  profileData.ap = document.getElementById('edit-ap').value || undefined;
  profileData.psStatus = document.getElementById('edit-ps-status').value || undefined;
  profileData.recCount = document.getElementById('edit-rec-count').value || undefined;

  // Save to localStorage under user email
  const userEmail = daleel.auth.getSessionUser();
  if (userEmail) {
    localStorage.setItem(`daleel_profile_${userEmail}`, JSON.stringify(profileData));
  }

  // Also save to old location for cross-tool compatibility
  localStorage.setItem('daleel_profile', JSON.stringify(profileData));

  cancelEdit();
  renderProfile();

  // Show success message
  const msg = document.createElement('div');
  msg.style.cssText = 'position:fixed;top:20px;right:20px;background:#28a745;color:white;padding:16px 20px;border-radius:8px;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,.2)';
  msg.textContent = '✓ Profile saved successfully';
  document.body.appendChild(msg);
  setTimeout(() => msg.remove(), 3000);
}

/**
 * Handle sign out.
 */
/* ── Import from transcript / résumé text ──────────────────────── */

/**
 * Show/hide the import box.
 */
function toggleImportBox() {
  const box = document.getElementById('importBox');
  if (!box) return;
  box.style.display = box.style.display === 'none' ? 'block' : 'none';
  if (box.style.display === 'block') document.getElementById('importText')?.focus();
}

/**
 * Send pasted text to the AI, extract structured fields, and fill the profile.
 */
async function importFromText() {
  const textEl = document.getElementById('importText');
  const statusEl = document.getElementById('importStatus');
  const btn = document.getElementById('importRunBtn');
  const text = (textEl?.value || '').trim();

  if (text.length < 20) {
    if (statusEl) { statusEl.style.color = '#c33'; statusEl.textContent = 'Paste a bit more text first.'; }
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = '⏳ Extracting…'; }
  if (statusEl) { statusEl.style.color = 'var(--text-muted)'; statusEl.textContent = 'Reading your document…'; }

  const sys = `You extract a student's academic profile from pasted text (transcript, résumé, or application).
Return ONLY a JSON object with any of these keys you can find (omit unknowns, do not guess):
{"gpa":"cumulative GPA as a number/percent string","gpaMath":"math & science GPA","school":"one of: Saudi Public School | International School in KSA | Out-of-Kingdom School","sat":"SAT total","satMath":"SAT math","act":"ACT composite","qudurat":"Qudurat score","tahsili":"Tahsili score","major":"intended major","country":"target country","ap":"one of: none | some | many"}
No commentary, just the JSON.`;

  let full = '';
  try {
    await new Promise((resolve, reject) => {
      callAI(
        [{ role: 'system', content: sys }, { role: 'user', content: text.slice(0, 6000) }],
        (tok) => { full += tok; },
        () => resolve(),
        (err) => reject(err)
      );
    });

    const data = (typeof parseAIJSON === 'function') ? parseAIJSON(full) : JSON.parse(full);
    if (!data || typeof data !== 'object') throw new Error('Could not read that document.');

    // Merge extracted values into the profile (don't wipe existing fields)
    const allowed = ['gpa','gpaMath','school','sat','satMath','act','qudurat','tahsili','major','country','ap'];
    let count = 0;
    allowed.forEach(k => {
      const v = data[k];
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        profileData[k] = String(v).trim();
        count++;
      }
    });

    if (count === 0) {
      if (statusEl) { statusEl.style.color = '#c33'; statusEl.textContent = 'Couldn’t find any stats in that text.'; }
    } else {
      // Persist (account + generic + shared profile hub if present)
      const userEmail = daleel.auth.getSessionUser();
      if (userEmail) localStorage.setItem(`daleel_profile_${userEmail}`, JSON.stringify(profileData));
      localStorage.setItem('daleel_profile', JSON.stringify(profileData));
      if (window.daleelProfile?.save) window.daleelProfile.save(profileData);

      renderProfile();
      if (statusEl) { statusEl.style.color = '#16a34a'; statusEl.textContent = `✓ Imported ${count} field${count>1?'s':''}.`; }
      setTimeout(() => { toggleImportBox(); if (textEl) textEl.value = ''; }, 1200);
    }
  } catch (err) {
    if (statusEl) { statusEl.style.color = '#c33'; statusEl.textContent = 'Import failed: ' + (err.message || 'try again'); }
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '✨ Extract &amp; Fill'; }
  }
}

/**
 * Utility: set text content of an element.
 */
function set(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/**
 * Initialize on page load.
 */
document.addEventListener('DOMContentLoaded', () => {
  initProfile();
});
