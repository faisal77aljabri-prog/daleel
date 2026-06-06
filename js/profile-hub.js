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

  // ECs
  set('val-ec-tier', profileData.ecTier || '—');

  // Essays
  set('val-ps-status', profileData.psStatus || '—');
  set('val-rec-count', profileData.recCount ? `${profileData.recCount} letters` : '—');

  // Saved colleges
  renderSavedColleges();
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
  document.getElementById('edit-ec-tier').value = profileData.ecTier || '';
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
  profileData.ecTier = document.getElementById('edit-ec-tier').value || undefined;
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
