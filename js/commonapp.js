/* ============================================================
   Common App Ready — Saudi-specific Common App toolkit
   Activities + Honors formatters, Essay checker, Additional Info
   generator, persistent checklist, Supplement brainstormer.
   Reuses callAI() + parseAIJSON() from app.js. All globals here are
   prefixed `ca`/`CA_` to avoid clashing with other scripts.
   ============================================================ */

/* Shared Saudi-context rules injected into every AI prompt on this page. */
const CA_SAUDI_RULES = `You are an expert Common App advisor for SAUDI students. Apply these facts:
- Saudi GPAs are percentages: 90%+ is exceptional (top tier). Explain this to US adcoms.
- KAUST SRSI is nationally prestigious: ~top 80 of 15,000 (~0.53% acceptance).
- Purple Comet is an INTERNATIONAL math competition — frame with global context.
- Aramco CPP is one of the most competitive sponsorships in Saudi Arabia; top US adcoms recognize it.
- Regional firsts in Medina are powerful — Medina rarely produces applicants at this level.
- Islamic identity should be present but lived, not performative (faith as experience, not explanation).
- Arabic language is an intellectual asset, not a barrier.
- Bedouin poetry / classical Arabic are genuinely rare — treat as exceptional intellectual distinction.
- Saudi international-school students have a curriculum narrative (Blyth + APs = proactively seeking rigor).
- Vision 2030 adds legitimacy to entrepreneurial extracurriculars.`;

function caIsAr() { return (typeof currentLang !== 'undefined' && currentLang === 'ar'); }
function caLangLine() {
  return caIsAr()
    ? 'Respond ENTIRELY in Arabic (Modern Standard Arabic). Keep the JSON keys in English but all string VALUES in Arabic.'
    : 'Respond in English.';
}

/* Promise wrapper around the streaming callAI. */
function caAI(system, user) {
  return new Promise((resolve, reject) => {
    if (typeof callAI !== 'function') { reject(new Error('AI unavailable')); return; }
    let full = '';
    callAI(
      [{ role: 'system', content: system }, { role: 'user', content: user }],
      (tok) => { full += tok; },
      () => resolve(full),
      (err) => reject(err)
    );
  });
}

/* Copy the text of the .ca-copy-src inside the button's copy wrap. */
function caCopy(btn) {
  const wrap = btn.closest('.ca-copy-wrap');
  const src = wrap?.querySelector('.ca-copy-src');
  if (!src) return;
  const text = (src.value !== undefined && src.tagName ? src.value : src.textContent) ?? src.textContent;
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.dataset.label || btn.textContent;
    btn.dataset.label = orig;
    btn.textContent = caIsAr() ? '✓ تم النسخ!' : '✓ Copied!';
    btn.classList.add('ca-copied');
    setTimeout(() => { btn.textContent = orig; btn.classList.remove('ca-copied'); }, 1600);
  }).catch(() => {
    // Fallback: select the text
    if (src.select) src.select();
  });
}

/* Apply count color classes to a counter element. */
function caCountClass(el, n, warn, over) {
  el.classList.remove('ca-count-ok', 'ca-count-warn', 'ca-count-over');
  if (n >= over) el.classList.add('ca-count-over');
  else if (n >= warn) el.classList.add('ca-count-warn');
  else el.classList.add('ca-count-ok');
}

function caSpinner(msg) {
  return `<div class="loading-overlay visible" style="position:relative;padding:28px">
    <div class="spinner"></div>
    <span>${msg || (caIsAr() ? 'جارٍ التحليل…' : 'Working…')}</span>
  </div>`;
}
function caErr(container, e) {
  container.innerHTML = `<div class="callout callout-danger" style="margin-top:12px">
    <span class="callout-icon">⚠️</span>
    <div class="callout-content"><p>${caIsAr() ? 'حدث خطأ' : 'Something went wrong'}: ${(e && e.message) || e}</p></div>
  </div>`;
}

/* ════════════════════════════════════════════════════════════
   SECTION 1 — Activities Formatter
   ════════════════════════════════════════════════════════════ */
let caActivityCount = 0;
const CA_MAX_ACTIVITIES = 10;
const caActivityResults = {}; // idx -> formatted string

function caAddActivity() {
  if (caActivityCount >= CA_MAX_ACTIVITIES) return;
  const idx = caActivityCount++;
  const wrap = document.getElementById('caActivitiesContainer');
  const block = document.createElement('div');
  block.className = 'form-card ca-activity-block';
  block.id = `caAct-${idx}`;
  block.innerHTML = `
    <div class="ca-block-head">
      <span class="ca-block-num">${idx + 1}</span>
      <h4>${caIsAr() ? 'نشاط' : 'Activity'} ${idx + 1}</h4>
      <button type="button" class="ca-block-remove" onclick="caRemoveActivity(${idx})" title="Remove">✕</button>
    </div>
    <div class="form-grid">
      <div class="form-group"><label>${caIsAr() ? 'اسم النشاط' : 'Activity name'}</label>
        <input type="text" id="caActName-${idx}" placeholder="${caIsAr() ? 'مثال: نادي الروبوتات' : 'e.g., Robotics Club'}" /></div>
      <div class="form-group"><label>${caIsAr() ? 'دورك / منصبك' : 'Your role / position'}</label>
        <input type="text" id="caActRole-${idx}" placeholder="${caIsAr() ? 'مثال: القائد المؤسس' : 'e.g., Founder & Lead'}" /></div>
      <div class="form-group"><label>${caIsAr() ? 'اسم المنظمة' : 'Organization name'}</label>
        <input type="text" id="caActOrg-${idx}" placeholder="${caIsAr() ? 'المدرسة / الجهة' : 'School / org'}" /></div>
      <div class="form-group"><label>${caIsAr() ? 'المنصب' : 'Position held'}</label>
        <select id="caActPos-${idx}">
          <option value="Member">${caIsAr() ? 'عضو' : 'Member'}</option>
          <option value="Officer">${caIsAr() ? 'مسؤول' : 'Officer'}</option>
          <option value="President/Leader">${caIsAr() ? 'رئيس / قائد' : 'President/Leader'}</option>
          <option value="Founder">${caIsAr() ? 'مؤسس' : 'Founder'}</option>
          <option value="Captain">${caIsAr() ? 'كابتن' : 'Captain'}</option>
          <option value="Employee">${caIsAr() ? 'موظف' : 'Employee'}</option>
          <option value="Other">${caIsAr() ? 'أخرى' : 'Other'}</option>
        </select></div>
      <div class="form-group full"><label>${caIsAr() ? 'ماذا فعلت؟' : 'What you did'}</label>
        <textarea id="caActWhat-${idx}" rows="3" placeholder="${caIsAr() ? 'صف بحرية ما قمت به' : 'Describe freely what you did'}"></textarea></div>
      <div class="form-group full"><label>${caIsAr() ? 'أكبر إنجاز / أثر' : 'Biggest achievement or impact'}</label>
        <textarea id="caActImpact-${idx}" rows="2" placeholder="${caIsAr() ? 'ما الأثر الذي حققته؟' : 'What changed because of you?'}"></textarea></div>
      <div class="form-group full"><label>${caIsAr() ? 'أي أرقام (مشاركون، ساعات، جوائز، ترتيب)' : 'Any numbers (participants, hours, prize, ranking)'}</label>
        <input type="text" id="caActNums-${idx}" placeholder="${caIsAr() ? 'مثال: 40 طالب، 1200 ريال، المركز 1' : 'e.g., 40 students, SAR 1,200, 1st place'}" /></div>
      <div class="form-group"><label>${caIsAr() ? 'الصفوف' : 'Grade levels'}</label>
        <div class="ca-checks">
          ${[9,10,11,12].map(g => `<label class="ca-chk"><input type="checkbox" id="caActG${g}-${idx}" value="${g}" /> ${g}</label>`).join('')}
        </div></div>
      <div class="form-group"><label>${caIsAr() ? 'الوقت المخصص' : 'Time commitment'}</label>
        <div style="display:flex;gap:8px">
          <input type="number" id="caActHrs-${idx}" min="0" placeholder="${caIsAr() ? 'ساعة/أسبوع' : 'hrs/week'}" />
          <input type="number" id="caActWks-${idx}" min="0" placeholder="${caIsAr() ? 'أسبوع/سنة' : 'wks/year'}" />
        </div></div>
    </div>
    <button type="button" class="btn btn-primary" style="margin-top:8px" onclick="caFormatActivity(${idx})">
      ⚡ ${caIsAr() ? 'نسّق إلى 150 حرفاً' : 'Format to 150 characters'}
    </button>
    <div class="ca-result" id="caActResult-${idx}"></div>`;
  wrap.appendChild(block);
  caToggleAddBtn();
}

function caRemoveActivity(idx) {
  document.getElementById(`caAct-${idx}`)?.remove();
  delete caActivityResults[idx];
  caToggleAddBtn();
}

function caToggleAddBtn() {
  const shown = document.querySelectorAll('.ca-activity-block').length;
  const btn = document.getElementById('caAddActivityBtn');
  if (btn) btn.style.display = shown >= CA_MAX_ACTIVITIES ? 'none' : '';
  const exp = document.getElementById('caExportBtn');
  if (exp) exp.style.display = Object.keys(caActivityResults).length ? '' : 'none';
}

async function caFormatActivity(idx) {
  const v = id => (document.getElementById(id)?.value || '').trim();
  const grades = [9,10,11,12].filter(g => document.getElementById(`caActG${g}-${idx}`)?.checked).join(', ');
  const out = document.getElementById(`caActResult-${idx}`);
  const name = v(`caActName-${idx}`);
  if (!name && !v(`caActWhat-${idx}`)) {
    caErr(out, caIsAr() ? 'أدخل اسم النشاط وما فعلته' : 'Enter the activity name and what you did');
    return;
  }
  out.innerHTML = caSpinner(caIsAr() ? 'جارٍ التنسيق…' : 'Formatting your activity…');

  const sys = `${CA_SAUDI_RULES}
You format ONE Common App Activities entry. The description field allows max 150 characters.
${caLangLine()}
Return ONLY JSON:
{"formatted":"best <=150 char description, lead with a strong action verb, include real numbers, show impact","charCount":number,"alternatives":["alt1 <=150","alt2 <=150","alt3 <=150"],"strengthScore":number 1-10,"scoreExplanation":"what works / what doesn't","warning":"a warning if generic/weak/missing numbers, else empty string","saudiNote":"a Saudi-specific note if relevant (e.g. regional first), else empty string"}`;
  const user = `Activity: ${name}
Role: ${v(`caActRole-${idx}`)}
Organization: ${v(`caActOrg-${idx}`)}
Position: ${v(`caActPos-${idx}`)}
What I did: ${v(`caActWhat-${idx}`)}
Biggest impact: ${v(`caActImpact-${idx}`)}
Numbers: ${v(`caActNums-${idx}`)}
Grades: ${grades}
Time: ${v(`caActHrs-${idx}`)} hrs/week, ${v(`caActWks-${idx}`)} weeks/year`;

  try {
    const data = parseAIJSON(await caAI(sys, user));
    if (!data || !data.formatted) throw new Error(caIsAr() ? 'تعذّر التنسيق' : 'Could not format');
    caActivityResults[idx] = data.formatted;
    const score = Math.max(1, Math.min(10, parseInt(data.strengthScore) || 0));
    const alts = (data.alternatives || []).filter(Boolean);
    out.innerHTML = `
      <div class="ca-score-row">
        <div class="ca-score-ring" style="--pct:${score*10}">${score}<small>/10</small></div>
        <div class="ca-score-text">${data.scoreExplanation || ''}</div>
      </div>
      ${data.warning ? `<div class="callout callout-danger"><span class="callout-icon">⚠️</span><div class="callout-content"><p>${data.warning}</p></div></div>` : ''}
      ${data.saudiNote ? `<div class="callout callout-gold"><span class="callout-icon">🇸🇦</span><div class="callout-content"><p>${data.saudiNote}</p></div></div>` : ''}
      <div class="ca-copy-wrap">
        <label class="ca-out-label">${caIsAr() ? 'الوصف المنسّق' : 'Formatted description'}
          <span class="ca-counter" id="caActCount-${idx}"></span></label>
        <textarea class="ca-copy-src ca-formatted" id="caActFmt-${idx}" rows="2"
          oninput="caCountActivity(${idx})">${data.formatted}</textarea>
        <button type="button" class="btn btn-outline btn-sm ca-copy-btn" onclick="caCopy(this)">📋 ${caIsAr() ? 'انسخ' : 'Copy'}</button>
      </div>
      ${alts.length ? `<div class="ca-alts"><div class="ca-out-label">${caIsAr() ? 'بدائل (مرتبة بالقوة)' : 'Alternatives (ranked)'}</div>
        ${alts.map((a,i) => `<div class="ca-copy-wrap ca-alt">
          <span class="ca-alt-rank">${i+1}</span>
          <span class="ca-copy-src" >${a}</span>
          <button type="button" class="btn btn-outline btn-sm ca-copy-btn" onclick="caCopy(this)">📋</button>
        </div>`).join('')}</div>` : ''}`;
    caCountActivity(idx);
    caToggleAddBtn();
  } catch (e) { caErr(out, e); }
}

function caCountActivity(idx) {
  const ta = document.getElementById(`caActFmt-${idx}`);
  const c = document.getElementById(`caActCount-${idx}`);
  if (!ta || !c) return;
  const n = ta.value.length;
  c.textContent = `${n} / 150`;
  caCountClass(c, n, 130, 150);
  caActivityResults[idx] = ta.value;
}

function caExportActivities() {
  const items = Object.keys(caActivityResults)
    .sort((a,b) => a-b)
    .map((k, i) => `${i+1}. ${caActivityResults[k]}`)
    .filter(s => s.replace(/^\d+\.\s*/, '').trim());
  const text = items.join('\n\n');
  const modal = document.getElementById('caExportModal');
  document.getElementById('caExportText').value = text;
  modal.classList.add('open');
}
function caCloseExport() { document.getElementById('caExportModal').classList.remove('open'); }

/* ════════════════════════════════════════════════════════════
   SECTION 2 — Honors Formatter
   ════════════════════════════════════════════════════════════ */
let caHonorCount = 0;
const CA_MAX_HONORS = 5;

function caAddHonor() {
  if (caHonorCount >= CA_MAX_HONORS) return;
  const idx = caHonorCount++;
  const wrap = document.getElementById('caHonorsContainer');
  const block = document.createElement('div');
  block.className = 'form-card ca-activity-block';
  block.id = `caHon-${idx}`;
  block.innerHTML = `
    <div class="ca-block-head">
      <span class="ca-block-num">${idx + 1}</span>
      <h4>${caIsAr() ? 'تكريم' : 'Honor'} ${idx + 1}</h4>
      <button type="button" class="ca-block-remove" onclick="caRemoveHonor(${idx})">✕</button>
    </div>
    <div class="form-grid">
      <div class="form-group full"><label>${caIsAr() ? 'اسم الجائزة / التكريم' : 'Honor / award name'}</label>
        <input type="text" id="caHonName-${idx}" placeholder="${caIsAr() ? 'مثال: KAUST SRSI' : 'e.g., KAUST SRSI'}" /></div>
      <div class="form-group"><label>${caIsAr() ? 'الصف عند الحصول عليه' : 'Grade received'}</label>
        <input type="text" id="caHonGrade-${idx}" placeholder="11" /></div>
      <div class="form-group"><label>${caIsAr() ? 'مستوى التكريم' : 'Recognition level'}</label>
        <select id="caHonLevel-${idx}">
          <option value="School">${caIsAr() ? 'المدرسة' : 'School'}</option>
          <option value="State/Regional">${caIsAr() ? 'إقليمي' : 'State/Regional'}</option>
          <option value="National">${caIsAr() ? 'وطني' : 'National'}</option>
          <option value="International">${caIsAr() ? 'دولي' : 'International'}</option>
        </select></div>
      <div class="form-group full"><label>${caIsAr() ? 'وصف ما هو' : 'Description of what it is'}</label>
        <textarea id="caHonDesc-${idx}" rows="3"></textarea></div>
    </div>
    <button type="button" class="btn btn-primary" style="margin-top:8px" onclick="caFormatHonor(${idx})">
      ⚡ ${caIsAr() ? 'نسّق التكريم' : 'Format honor'}
    </button>
    <div class="ca-result" id="caHonResult-${idx}"></div>`;
  wrap.appendChild(block);
  document.getElementById('caAddHonorBtn').style.display = caHonorCount >= CA_MAX_HONORS ? 'none' : '';
}
function caRemoveHonor(idx) { document.getElementById(`caHon-${idx}`)?.remove(); document.getElementById('caAddHonorBtn').style.display = ''; }

async function caFormatHonor(idx) {
  const v = id => (document.getElementById(id)?.value || '').trim();
  const out = document.getElementById(`caHonResult-${idx}`);
  if (!v(`caHonName-${idx}`)) { caErr(out, caIsAr() ? 'أدخل اسم التكريم' : 'Enter the honor name'); return; }
  out.innerHTML = caSpinner();
  const sys = `${CA_SAUDI_RULES}
You format ONE Common App Honor entry (max ~100 characters for the title field; descriptions are brief).
${caLangLine()}
Return ONLY JSON:
{"formatted":"concise, adcom-ready honor line","levelAdvice":"advice on the correct recognition level and why","priorityNote":"how high to rank this among 5 slots","saudiNote":"how US adcoms read this Saudi honor + how to contextualize"}`;
  const user = `Honor: ${v(`caHonName-${idx}`)}\nGrade: ${v(`caHonGrade-${idx}`)}\nClaimed level: ${v(`caHonLevel-${idx}`)}\nDescription: ${v(`caHonDesc-${idx}`)}`;
  try {
    const d = parseAIJSON(await caAI(sys, user));
    if (!d || !d.formatted) throw new Error('Could not format');
    out.innerHTML = `
      <div class="ca-copy-wrap">
        <label class="ca-out-label">${caIsAr() ? 'التكريم المنسّق' : 'Formatted honor'}</label>
        <textarea class="ca-copy-src ca-formatted" rows="2">${d.formatted}</textarea>
        <button type="button" class="btn btn-outline btn-sm ca-copy-btn" onclick="caCopy(this)">📋 ${caIsAr() ? 'انسخ' : 'Copy'}</button>
      </div>
      ${d.levelAdvice ? `<div class="callout"><span class="callout-icon">🎚️</span><div class="callout-content"><p><strong>${caIsAr()?'المستوى':'Level'}:</strong> ${d.levelAdvice}</p></div></div>` : ''}
      ${d.priorityNote ? `<div class="callout"><span class="callout-icon">📊</span><div class="callout-content"><p><strong>${caIsAr()?'الأولوية':'Priority'}:</strong> ${d.priorityNote}</p></div></div>` : ''}
      ${d.saudiNote ? `<div class="callout callout-gold"><span class="callout-icon">🇸🇦</span><div class="callout-content"><p>${d.saudiNote}</p></div></div>` : ''}`;
  } catch (e) { caErr(out, e); }
}

/* ════════════════════════════════════════════════════════════
   SECTION 3 — Essay Checker
   ════════════════════════════════════════════════════════════ */
function caCountEssay() {
  const ta = document.getElementById('caEssayText');
  const c = document.getElementById('caEssayCount');
  if (!ta || !c) return;
  const words = (ta.value.trim().match(/\S+/g) || []).length;
  c.textContent = `${words} / 650 ${caIsAr() ? 'كلمة' : 'words'}`;
  caCountClass(c, words, 600, 650);
}

async function caCheckEssay() {
  const out = document.getElementById('caEssayResult');
  const text = (document.getElementById('caEssayText')?.value || '').trim();
  const prompt = document.getElementById('caEssayPrompt')?.value || '';
  if (text.length < 40) { caErr(out, caIsAr() ? 'الصق مسودتك أولاً' : 'Paste your draft first'); return; }
  out.innerHTML = caSpinner(caIsAr() ? 'نقرأ مقالك بعين سعودية…' : 'Reading your essay through a Saudi lens…');
  const sys = `${CA_SAUDI_RULES}
You review a Common App personal statement (650-word limit).
${caLangLine()}
Return ONLY JSON:
{"wordStatus":"Under/At/Over limit + count note","opening":"assessment of the opening hook","openingRewrite":"a stronger rewrite of the opening line","saudiLens":"how a Western adcoy reads this given Saudi context: what needs more explanation vs what should stay implicit","strengths":["..."],"weaknesses":["specific fix with line reference"],"authenticity":"does it sound like a real person vs a polished performance? flag overly formal/generic language","mistakes":[{"name":"Performing Islamic identity","found":true/false,"note":""},{"name":"Over-explaining Arabic words","found":true/false,"note":""},{"name":"Apologizing for cultural differences","found":true/false,"note":""},{"name":"Touristic Mecca/Medina references","found":true/false,"note":""},{"name":"Family sacrifice without a specific scene","found":true/false,"note":""}],"openingParagraphRewrite":"an example rewrite of the opening paragraph"}`;
  try {
    const d = parseAIJSON(await caAI(sys, `Prompt: ${prompt}\n\nEssay:\n${text}`));
    if (!d) throw new Error('Could not read response');
    const tiles = [];
    if (d.wordStatus) tiles.push(`<div class="ca-tile"><h5>📏 ${caIsAr()?'عدد الكلمات':'Word Count'}</h5><p>${d.wordStatus}</p></div>`);
    if (d.opening) tiles.push(`<div class="ca-tile"><h5>🎣 ${caIsAr()?'الافتتاحية':'Opening Hook'}</h5><p>${d.opening}</p>${d.openingRewrite?`<div class="ca-copy-wrap" style="margin-top:8px"><span class="ca-copy-src ca-mini">${d.openingRewrite}</span><button class="btn btn-outline btn-sm ca-copy-btn" onclick="caCopy(this)">📋</button></div>`:''}</div>`);
    if (d.saudiLens) tiles.push(`<div class="ca-tile ca-tile-gold"><h5>🇸🇦 ${caIsAr()?'العدسة السعودية':'Saudi Lens'}</h5><p>${d.saudiLens}</p></div>`);
    (d.strengths||[]).forEach(s => tiles.push(`<div class="ca-tile ca-tile-green"><h5>✅ ${caIsAr()?'نقطة قوة':'Strength'}</h5><p>${s}</p></div>`));
    (d.weaknesses||[]).forEach(s => tiles.push(`<div class="ca-tile ca-tile-red"><h5>⚠️ ${caIsAr()?'للتحسين':'Fix This'}</h5><p>${s}</p></div>`));
    if (d.authenticity) tiles.push(`<div class="ca-tile"><h5>🫧 ${caIsAr()?'الأصالة':'Authenticity'}</h5><p>${d.authenticity}</p></div>`);
    const mistakes = (d.mistakes||[]).map(m => `<li class="${m.found?'ca-m-found':'ca-m-ok'}">${m.found?'⚠️':'✓'} ${m.name}${m.found&&m.note?` — ${m.note}`:''}</li>`).join('');
    let html = `<div class="ca-tiles">${tiles.join('')}</div>`;
    if (mistakes) html += `<div class="ca-tile" style="margin-top:14px"><h5>🔍 ${caIsAr()?'أخطاء شائعة لدى الطلاب السعوديين':'Common Saudi-student mistakes'}</h5><ul class="ca-mistakes">${mistakes}</ul></div>`;
    if (d.openingParagraphRewrite) html += `<div class="ca-tile ca-tile-gold" style="margin-top:14px"><h5>✍️ ${caIsAr()?'مثال إعادة صياغة الفقرة الأولى':'Example: rewritten opening paragraph'}</h5><div class="ca-copy-wrap"><span class="ca-copy-src">${d.openingParagraphRewrite}</span><button class="btn btn-outline btn-sm ca-copy-btn" onclick="caCopy(this)">📋 ${caIsAr()?'انسخ':'Copy'}</button></div></div>`;
    out.innerHTML = html;
  } catch (e) { caErr(out, e); }
}

/* ════════════════════════════════════════════════════════════
   SECTION 4 — Additional Information generator
   ════════════════════════════════════════════════════════════ */
async function caGenAdditional() {
  const out = document.getElementById('caAddlResult');
  const text = (document.getElementById('caAddlInput')?.value || '').trim();
  if (text.length < 15) { caErr(out, caIsAr() ? 'أضف بعض السياق أولاً' : 'Add some context first'); return; }
  out.innerHTML = caSpinner();
  const sys = `${CA_SAUDI_RULES}
You write the Common App "Additional Information" section for a Saudi student.
Keep it under 650 words, factual, context-not-excuses. Explain Saudi curriculum/grading where relevant.
${caLangLine()}
Return ONLY JSON: {"text":"the polished Additional Information section","wordCount":number,"notes":"one short tip"}`;
  try {
    const d = parseAIJSON(await caAI(sys, text));
    if (!d || !d.text) throw new Error('Could not generate');
    out.innerHTML = `
      <div class="ca-copy-wrap">
        <label class="ca-out-label">${caIsAr()?'القسم المُولّد':'Generated section'} ${d.wordCount?`<span class="ca-counter ca-count-ok">${d.wordCount} ${caIsAr()?'كلمة':'words'}</span>`:''}</label>
        <textarea class="ca-copy-src" rows="10">${d.text}</textarea>
        <button class="btn btn-outline btn-sm ca-copy-btn" onclick="caCopy(this)">📋 ${caIsAr()?'انسخ':'Copy'}</button>
      </div>
      ${d.notes?`<div class="callout callout-gold"><span class="callout-icon">💡</span><div class="callout-content"><p>${d.notes}</p></div></div>`:''}`;
  } catch (e) { caErr(out, e); }
}

/* ════════════════════════════════════════════════════════════
   SECTION 5 — Checklist (localStorage)
   ════════════════════════════════════════════════════════════ */
const CA_CHECK_KEY = 'daleel_cachecklist';
function caLoadChecklist() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(CA_CHECK_KEY) || '{}'); } catch {}
  document.querySelectorAll('.ca-check').forEach(cb => {
    if (saved[cb.id]) cb.checked = true;
    cb.addEventListener('change', caSaveChecklist);
  });
  caUpdateProgress();
}
function caSaveChecklist() {
  const state = {};
  document.querySelectorAll('.ca-check').forEach(cb => { if (cb.checked) state[cb.id] = 1; });
  localStorage.setItem(CA_CHECK_KEY, JSON.stringify(state));
  caUpdateProgress();
}
function caUpdateProgress() {
  const all = document.querySelectorAll('.ca-check');
  const done = [...all].filter(cb => cb.checked).length;
  const pct = all.length ? Math.round(done / all.length * 100) : 0;
  const bar = document.getElementById('caProgressBar');
  const lbl = document.getElementById('caProgressPct');
  if (bar) bar.style.width = pct + '%';
  if (lbl) lbl.textContent = `${pct}% ${caIsAr() ? 'مكتمل' : 'complete'} (${done}/${all.length})`;
}

/* ════════════════════════════════════════════════════════════
   SECTION 6 — Supplement brainstormer + expandable cards
   ════════════════════════════════════════════════════════════ */
function caToggleSupp(el) {
  const card = el.closest('.ca-supp-card');
  card.classList.toggle('open');
}
async function caBrainstormSupp() {
  const out = document.getElementById('caSuppResult');
  const school = document.getElementById('caSuppSchool')?.value || '';
  const prompt = (document.getElementById('caSuppPrompt')?.value || '').trim();
  const ctx = (document.getElementById('caSuppContext')?.value || '').trim();
  if (!prompt) { caErr(out, caIsAr() ? 'الصق سؤال التكميلي' : 'Paste the supplement prompt'); return; }
  out.innerHTML = caSpinner(caIsAr() ? 'نبحث عن زوايا قوية…' : 'Finding strong angles…');
  const sys = `${CA_SAUDI_RULES}
You brainstorm 3 DIFFERENT angle approaches for a supplement essay (directional ideas, NOT full drafts) for a Saudi student to develop with an advisor.
${caLangLine()}
Return ONLY JSON: {"angles":[{"title":"angle name","idea":"2-3 sentence direction","why":"why it works for this school + Saudi profile"}]}`;
  try {
    const d = parseAIJSON(await caAI(sys, `School: ${school}\nPrompt: ${prompt}\nAbout me: ${ctx}`));
    const angles = d?.angles || [];
    if (!angles.length) throw new Error('No angles');
    out.innerHTML = `<div class="ca-tiles">${angles.map((a,i)=>`
      <div class="ca-tile"><h5>${i+1}. ${a.title||''}</h5><p>${a.idea||''}</p>
      ${a.why?`<p style="color:var(--gold-dim);font-size:.85rem;margin-top:6px"><strong>${caIsAr()?'لماذا':'Why'}:</strong> ${a.why}</p>`:''}</div>`).join('')}</div>`;
  } catch (e) { caErr(out, e); }
}

/* ════════════════════════════════════════════════════════════
   Sticky side-nav active highlighting + smooth scroll
   ════════════════════════════════════════════════════════════ */
function caInitSideNav() {
  const links = [...document.querySelectorAll('.ca-sidenav a')];
  const map = {};
  links.forEach(a => { const id = a.getAttribute('href').slice(1); map[id] = a; });
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        links.forEach(l => l.classList.remove('active'));
        map[e.target.id]?.classList.add('active');
      }
    });
  }, { rootMargin: '-30% 0px -60% 0px' });
  document.querySelectorAll('.ca-section').forEach(s => obs.observe(s));
}

/* ── Bootstrap ─────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  caAddActivity();           // start with one activity block
  caAddHonor();              // start with one honor block
  caCountEssay();
  caLoadChecklist();
  caInitSideNav();
});
