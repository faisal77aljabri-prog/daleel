/**
 * EC Portfolio Builder — Save and manage your extracurricular activities
 */

let savedECs = [];
let currentLang = localStorage.getItem('daleel_lang') || 'en';

/**
 * Load saved ECs from profile
 */
function loadSavedECs() {
  const userEmail = daleel.auth.getSessionUser?.() || '';
  const profileKey = `daleel_profile_${userEmail}`;
  const profile = JSON.parse(localStorage.getItem(profileKey) || '{}');
  savedECs = profile.ecs || [];
  renderECList();
}

/**
 * Add a new EC to the portfolio
 */
function addEC() {
  const name = document.getElementById('ecName')?.value?.trim();
  const description = document.getElementById('ecDescription')?.value?.trim();
  const impact = document.getElementById('ecImpact')?.value?.trim();
  const duration = document.getElementById('ecDuration')?.value?.trim();
  const awards = document.getElementById('ecAwards')?.value?.trim();

  if (!name || !description) {
    alert(currentLang === 'ar' ? 'أدخل الاسم والوصف' : 'Please enter name and description');
    return;
  }

  const newEC = {
    id: Date.now(),
    name,
    description,
    impact: impact || '',
    duration: duration || '',
    awards: awards || '',
    addedDate: new Date().toISOString(),
  };

  savedECs.push(newEC);
  saveECsToProfile();
  resetECForm();
  renderECList();
  showNotification(currentLang === 'ar' ? 'تمت إضافة النشاط' : 'Activity added!');
}

/**
 * Delete an EC
 */
function deleteEC(id) {
  if (!confirm(currentLang === 'ar' ? 'هل تريد حذفه؟' : 'Delete this activity?')) return;
  savedECs = savedECs.filter(ec => ec.id !== id);
  saveECsToProfile();
  renderECList();
  showNotification(currentLang === 'ar' ? 'تم الحذف' : 'Deleted');
}

/**
 * Save ECs to user's profile
 */
function saveECsToProfile() {
  const userEmail = daleel.auth.getSessionUser?.() || '';
  const profileKey = `daleel_profile_${userEmail}`;
  const profile = JSON.parse(localStorage.getItem(profileKey) || '{}');
  profile.ecs = savedECs;
  localStorage.setItem(profileKey, JSON.stringify(profile));
  localStorage.setItem('daleel_profile', JSON.stringify(profile)); // cross-tool sync
}

/**
 * Get AI feedback on a single EC
 */
async function getECFeedback(id) {
  const ec = savedECs.find(e => e.id === id);
  if (!ec) return;

  const container = document.getElementById(`ecFeedback-${id}`);
  if (!container) return;

  container.innerHTML = '<div class="loading-overlay visible"><div class="spinner"></div><p>Getting feedback…</p></div>';

  const ar = currentLang === 'ar';
  const prompt = ar
    ? `قيّم نشاطي الجامعي هذا وأعطني نصائح لتحسين العرض:
       الاسم: ${ec.name}
       الوصف: ${ec.description}
       ${ec.impact ? `التأثير: ${ec.impact}` : ''}
       ${ec.duration ? `المدة: ${ec.duration}` : ''}
       ${ec.awards ? `الجوائز: ${ec.awards}` : ''}
       أرني كيف أعرضه بشكل أفضل للجامعات الأمريكية.`
    : `Review my extracurricular activity and give me tips to present it better:
       Name: ${ec.name}
       Description: ${ec.description}
       ${ec.impact ? `Impact: ${ec.impact}` : ''}
       ${ec.duration ? `Duration: ${ec.duration}` : ''}
       ${ec.awards ? `Awards: ${ec.awards}` : ''}
       Show me how to present this more effectively to US universities.`;

  try {
    const messages = [
      { role: 'system', content: ar ? `أنت مستشار نشاط جامعي للطلاب السعوديين. قيّم النشاط وأعط نصائح محددة وقابلة للتنفيذ.` : `You are an EC advisor for Saudi students. Review the activity and give specific, actionable tips for improvement.` },
      { role: 'user', content: prompt }
    ];

    let fullResponse = '';
    await new Promise((resolve, reject) => {
      callAI(
        messages,
        (token) => { fullResponse += token; },
        () => {
          container.innerHTML = `<div class="detail-section khuzama-bg" style="margin-top:12px">
            <h5 style="color:var(--gold);margin-bottom:12px">💡 ${ar ? 'نصائح التحسين' : 'Improvement Tips'}</h5>
            <p style="color:var(--text-body);line-height:1.6;margin:0">${fullResponse}</p>
          </div>`;
          resolve();
        },
        (err) => { container.innerHTML = `<p style="color:red">Error: ${err.message}</p>`; reject(err); }
      );
    });
  } catch (err) {
    container.innerHTML = `<p style="color:red">${currentLang === 'ar' ? 'حدث خطأ' : 'Error'}: ${err.message}</p>`;
  }
}

/**
 * Render the list of saved ECs
 */
function renderECList() {
  const container = document.getElementById('savedECsList');
  if (!container) return;

  if (savedECs.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted);text-align:center;padding:40px">
      ${currentLang === 'ar' ? 'لم تضف أي نشاط بعد' : 'No activities yet. Add your first one above!'}
    </p>`;
    return;
  }

  const ar = currentLang === 'ar';
  container.innerHTML = savedECs.map(ec => `
    <div class="ec-portfolio-card">
      <div class="ec-card-header">
        <div>
          <h4 style="margin:0 0 4px 0;color:var(--text-dark)">${ec.name}</h4>
          <span style="font-size:0.85rem;color:var(--text-muted)">
            ${new Date(ec.addedDate).toLocaleDateString(ar ? 'ar' : 'en')}
          </span>
        </div>
        <button class="btn btn-sm btn-outline" onclick="deleteEC(${ec.id})" style="color:#ef4444">
          🗑️ ${ar ? 'حذف' : 'Delete'}
        </button>
      </div>

      <div style="margin-top:16px">
        <div class="detail-row">
          <span class="detail-label">${ar ? 'الوصف' : 'Description'}</span>
          <span class="detail-value">${ec.description}</span>
        </div>
        ${ec.impact ? `<div class="detail-row">
          <span class="detail-label">${ar ? 'التأثير' : 'Impact'}</span>
          <span class="detail-value">${ec.impact}</span>
        </div>` : ''}
        ${ec.duration ? `<div class="detail-row">
          <span class="detail-label">${ar ? 'المدة' : 'Duration'}</span>
          <span class="detail-value">${ec.duration}</span>
        </div>` : ''}
        ${ec.awards ? `<div class="detail-row">
          <span class="detail-label">${ar ? 'الجوائز' : 'Awards'}</span>
          <span class="detail-value">${ec.awards}</span>
        </div>` : ''}
      </div>

      <button class="btn btn-outline" onclick="document.getElementById('ecFeedback-${ec.id}').style.display = document.getElementById('ecFeedback-${ec.id}').style.display === 'none' ? '' : 'none'" style="margin-top:12px;width:100%">
        💡 ${ar ? 'احصل على نصائح التحسين' : 'Get Improvement Tips'}
      </button>

      <div id="ecFeedback-${ec.id}" style="display:none"></div>
    </div>
  `).join('');
}

/**
 * Reset the form
 */
function resetECForm() {
  document.getElementById('ecName').value = '';
  document.getElementById('ecDescription').value = '';
  document.getElementById('ecImpact').value = '';
  document.getElementById('ecDuration').value = '';
  document.getElementById('ecAwards').value = '';
}

/**
 * Show a brief notification
 */
function showNotification(msg) {
  const n = document.createElement('div');
  n.style.cssText = 'position:fixed;bottom:20px;right:20px;background:var(--gold);color:white;padding:12px 20px;border-radius:8px;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.15)';
  n.textContent = msg;
  document.body.appendChild(n);
  setTimeout(() => n.remove(), 3000);
}

/**
 * Initialize on page load
 */
document.addEventListener('DOMContentLoaded', () => {
  currentLang = localStorage.getItem('daleel_lang') || 'en';
  loadSavedECs();
});
