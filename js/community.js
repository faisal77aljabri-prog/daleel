/* Daleel — Community Q&A */

const QA_KEY = 'daleel_community';
let qaFilter = 'all';
let qaSearch = '';

/* ── Pinned FAQs (hardcoded) ────────────────────────────── */
const PINNED_FAQ = [
  { id:'faq-1', cat:'aramco',
    qEn:'What is the Aramco CPP and how do I qualify?', qAr:'ما هو برنامج أرامكو CPP وكيف أتأهل له؟',
    aEn:'CPP sponsors Saudi international school graduates at top universities. Requirements: cumulative GPA 85%+, Math & Science GPA 85%+, SAT Math 630+ OR Qudurat 90+, international school graduation. Use the CPP Calculator on دليل for an instant check.',
    aAr:'CPP يرعى خريجي المدارس الدولية السعودية في أفضل الجامعات. الشروط: معدل تراكمي 85%+، معدل رياضيات وعلوم 85%+، SAT Math 630+ أو قدرات 90+، خريج مدرسة دولية. استخدم حاسبة CPP في دليل.',
    tool:'cpp-calculator.html' },
  { id:'faq-2', cat:'college',
    qEn:'Does my Saudi GPA percentage convert to a 4.0 scale?', qAr:'هل تتحول نسبة GPA السعودية إلى مقياس 4.0؟',
    aEn:'No conversion needed for most US universities. On the Common App, select "100-point scale" and enter your percentage directly. Your school counselor will send a school profile explaining the Saudi grading system.',
    aAr:'لا يلزم التحويل لمعظم الجامعات الأمريكية. في Common App اختر "مقياس 100 نقطة" وأدخل نسبتك مباشرة. مستشارك سيرسل ملف المدرسة الذي يشرح نظام الدرجات السعودي.',
    tool:null },
  { id:'faq-3', cat:'tests',
    qEn:'Can I apply to US universities without an SAT score?', qAr:'هل يمكنني التقديم للجامعات الأمريكية بدون SAT؟',
    aEn:'Yes — most US universities are now test-optional. However, Aramco CPP requires SAT Math 630+ (or Qudurat 90+). If your score is strong, submit it; if it\'s below the 25th percentile for your target schools, consider not submitting.',
    aAr:'نعم — معظم الجامعات الأمريكية اختيارية للاختبار الآن. لكن CPP يتطلب SAT Math 630+ أو قدرات 90+. إذا كانت درجتك قوية قدّمها، وإذا كانت أقل من المئيني الـ 25 لمدارسك المستهدفة فلا تقدّمها.',
    tool:'sat-guide.html' },
  { id:'faq-4', cat:'schol',
    qEn:'What is KASP and am I eligible?', qAr:'ما هي منحة KASP وهل أنا مؤهل؟',
    aEn:'KASP (King Abdullah Scholarship Program) is the Saudi government\'s primary international scholarship covering full tuition, living allowance, health insurance, and flights. Apply through the Ministry of Education (moe.gov.sa). Requires Saudi nationality and strong academic record.',
    aAr:'KASP هي المنحة الدولية الرئيسية للحكومة السعودية وتشمل الرسوم الكاملة والبدل الشهري والتأمين والرحلات. التقديم عبر وزارة التعليم (moe.gov.sa). تتطلب الجنسية السعودية وسجل أكاديمي قوي.',
    tool:'scholarships.html' },
  { id:'faq-5', cat:'college',
    qEn:'How does the Common App work for Saudi students?', qAr:'كيف يعمل Common App للطلاب السعوديين؟',
    aEn:'Common App is the main platform for 1,000+ US universities. Create one account, apply to multiple schools. Key: enter GPA on 100-point scale, list 10 activities max, write one personal essay (650 words), and have your counselor complete the School Report. Opens August 1.',
    aAr:'Common App هو المنصة الرئيسية لأكثر من 1000 جامعة أمريكية. حساب واحد للتقديم لعدة مدارس. الأساسيات: أدخل GPA بمقياس 100، أدرج 10 أنشطة كحد أقصى، اكتب مقالة شخصية (650 كلمة)، ودع مستشارك يكمل تقرير المدرسة. يفتح أول أغسطس.',
    tool:null },
  { id:'faq-6', cat:'college',
    qEn:'What extracurriculars look best for Saudi students?', qAr:'ما الأنشطة اللاصفية الأفضل للطلاب السعوديين؟',
    aEn:'Strongest: STEM olympiads (Saudi Olympiad, FIRST Robotics), founding something in your city that fills a real gap, original research even at school level, community leadership with measurable impact. Generic volunteering carries much less weight than specific leadership.',
    aAr:'الأقوى: مسابقات STEM (الأولمبياد، FIRST Robotics)، تأسيس شيء يسد فجوة حقيقية، بحث أصلي ولو في مستوى المدرسة، قيادة مجتمعية بأثر قابل للقياس. التطوع العام أضعف بكثير من القيادة المحددة.',
    tool:'ec-advisor.html' },
  { id:'faq-7', cat:'essays',
    qEn:'Should I write about being Saudi or Muslim in my essay?', qAr:'هل يجب أن أكتب عن كوني سعودياً أو مسلماً؟',
    aEn:'Only if it genuinely shapes your intellectual life — never performatively. Adcoms want authentic intellectual curiosity. If faith shapes how you think about science, justice, or language — write about that specific intersection. Never start with "As a Muslim..." — see the Essay Vault for frameworks.',
    aAr:'فقط إذا كان يشكّل حياتك الفكرية حقاً — لا بشكل مؤدى. مسؤولو القبول يريدون الفضول الفكري الحقيقي. إذا كان الإيمان يشكّل تفكيرك في العلم أو العدالة أو اللغة — اكتب عن ذلك التقاطع المحدد. راجع مخزن المقالات.',
    tool:'essay-vault.html' },
  { id:'faq-8', cat:'aramco',
    qEn:'What is the CPP Waiver?', qAr:'ما هو إعفاء CPP؟',
    aEn:'The CPP Waiver lets you skip the prep year and go directly to university if you receive an unconditional offer from a Top-30 ranked university. You must still be CPP-eligible and must inform Aramco HR of your offer. Use the CPP Calculator to check eligibility.',
    aAr:'إعفاء CPP يتيح لك تخطي السنة التحضيرية والذهاب مباشرة للجامعة إذا حصلت على عرض غير مشروط من جامعة ضمن أفضل 30. يجب أن تكون مؤهلاً لـ CPP وإبلاغ أرامكو HR بعرضك. استخدم حاسبة CPP.',
    tool:'cpp-calculator.html' },
  { id:'faq-9', cat:'college',
    qEn:'Can Saudi public school students apply to US universities?', qAr:'هل يمكن لطلاب المدارس الحكومية السعودية التقديم للجامعات الأمريكية؟',
    aEn:'Yes, absolutely. US universities accept students from Saudi public schools. You will need to explain the Saudi grading system in your additional information section. Note: you are NOT eligible for Aramco CPP (which requires international school graduation).',
    aAr:'نعم بالتأكيد. الجامعات الأمريكية تقبل طلاب المدارس الحكومية السعودية. ستحتاج لشرح نظام الدرجات في قسم المعلومات الإضافية. تنبيه: أنت غير مؤهل لأرامكو CPP الذي يتطلب خريج مدرسة دولية.',
    tool:null },
  { id:'faq-10', cat:'college',
    qEn:'When should I start my college applications?', qAr:'متى يجب أن أبدأ طلبات الجامعة؟',
    aEn:'Start in Grade 11. Take the SAT by March of Grade 11. Brainstorm your personal statement in May–June. Finalize essays over the summer. Open Common App in August. Submit EA/ED in October–November. Submit RD in January. Starting senior year without junior-year prep puts you at a serious disadvantage.',
    aAr:'ابدأ في الصف الحادي عشر. خذ SAT بحلول مارس. فكّر في موضوع البيان الشخصي في مايو–يونيو. أنهِ المقالات خلال الصيف. افتح Common App في أغسطس. قدّم EA/ED في أكتوبر–نوفمبر. قدّم RD في يناير.',
    tool:null },
];

/* ── localStorage helpers ───────────────────────────────── */
function loadQA() {
  try { return JSON.parse(localStorage.getItem(QA_KEY) || '{"questions":[]}'); } catch { return { questions:[] }; }
}
function saveQA(data) { localStorage.setItem(QA_KEY, JSON.stringify(data)); }

function qaTL(key) {
  const isAr = typeof currentLang !== 'undefined' && currentLang === 'ar';
  return (typeof T !== 'undefined' ? T[isAr ? 'ar' : 'en']?.community?.[key] : null) || key;
}

/* ── Cat badge ─────────────────────────────────────────── */
const QA_CATS = {
  college:'qa-cat-college', aramco:'qa-cat-aramco', essays:'qa-cat-essays',
  tests:'qa-cat-tests', schol:'qa-cat-schol', general:'qa-cat-general',
};
function catBadge(cat, isAr) {
  const cls = QA_CATS[cat] || 'qa-cat-general';
  const labels = { en:{ college:'College',aramco:'Aramco CPP',essays:'Essays',tests:'Tests',schol:'Scholarships',general:'General' },
                   ar:{ college:'جامعات',aramco:'أرامكو CPP',essays:'مقالات',tests:'اختبارات',schol:'منح',general:'عام' } };
  const lbl = (isAr ? labels.ar : labels.en)[cat] || cat;
  return `<span class="qa-cat-chip ${cls}">${lbl}</span>`;
}

/* ── Render FAQ section ─────────────────────────────────── */
function renderFAQs() {
  const isAr = typeof currentLang !== 'undefined' && currentLang === 'ar';
  const el = document.getElementById('faqSection');
  if (!el) return;

  const visible = PINNED_FAQ.filter(f => qaFilter === 'all' || f.cat === qaFilter || (qaFilter === 'tests' && f.cat === 'tests'));
  el.innerHTML = visible.map(f => {
    const q = isAr ? f.qAr : f.qEn;
    const a = isAr ? f.aAr : f.aEn;
    const toolLink = f.tool ? `<a href="${f.tool}" style="display:inline-flex;align-items:center;gap:4px;font-size:.72rem;font-weight:700;color:var(--gold);text-decoration:none;margin-top:6px">${isAr?'افتح الأداة ←':'Open Tool →'}</a>` : '';
    return `<div class="qa-question-card pinned" data-faqid="${f.id}">
      <div class="qa-pinned-tag">📌 FAQ</div>
      <div style="display:flex;align-items:flex-start;gap:8px;flex-wrap:wrap;margin-bottom:6px">
        ${catBadge(f.cat, isAr)}
      </div>
      <div class="qa-q-text">${q}</div>
      <div class="qa-answer ai-answer">
        <div class="ai-ans-badge">🤖 دليل AI</div>
        <div>${a}</div>
        ${toolLink}
      </div>
    </div>`;
  }).join('');
}

/* ── Render community questions ─────────────────────────── */
function renderQuestions() {
  const isAr = typeof currentLang !== 'undefined' && currentLang === 'ar';
  const data = loadQA();
  const el = document.getElementById('questionList');
  if (!el) return;

  let questions = data.questions;
  if (qaFilter !== 'all') questions = questions.filter(q => q.category === qaFilter);
  if (qaSearch) questions = questions.filter(q => q.text.toLowerCase().includes(qaSearch.toLowerCase()));

  if (!questions.length) {
    el.innerHTML = `<div style="text-align:center;padding:40px 0;color:var(--text-muted)">
      <div style="font-size:2rem;margin-bottom:8px">🤔</div>
      <p>${qaSearch ? qaTL('emptySearch') : qaTL('emptyQ')}</p>
    </div>`;
    return;
  }

  el.innerHTML = questions.slice().reverse().map((q, i) => {
    const sortedAnswers = [...(q.answers||[])].sort((a,b) => b.upvotes - a.upvotes);
    const answersHtml = sortedAnswers.map(a => `
      <div class="qa-answer ${a.isAI ? 'ai-answer' : ''}">
        ${a.isAI ? '<div class="ai-ans-badge">🤖 دليل AI</div>' : `<div style="font-size:.68rem;color:var(--text-muted);margin-bottom:4px">${a.author}</div>`}
        <div>${a.text}</div>
        <div class="qa-answer-actions">
          <button class="qa-upvote-btn ${a.votedBy?.includes(qaSessionId()) ? 'voted' : ''}" onclick="qaUpvote('${q.id}','${a.id}',this)">
            👍 ${qaTL('upvoteBtn')} (${a.upvotes})
          </button>
        </div>
      </div>`).join('');

    return `<div class="qa-question-card" style="animation-delay:${i*.05}s" data-qid="${q.id}">
      <div style="display:flex;align-items:flex-start;gap:8px;flex-wrap:wrap;margin-bottom:6px">
        ${catBadge(q.category, isAr)}
        <span class="qa-meta">${q.author} · ${new Date(q.timestamp).toLocaleDateString()}</span>
      </div>
      <div class="qa-q-text">${q.text}</div>
      ${answersHtml}
      <div class="qa-card-actions">
        <button class="qa-reply-btn" onclick="qaToggleReply('${q.id}')">${qaTL('answerBtn')}</button>
        ${!q.answers?.some(a => a.isAI) ? `<button class="qa-ai-btn" onclick="qaRequestAI('${q.id}')">${qaTL('aiAnswerBtn')}</button>` : ''}
      </div>
      <div class="qa-answer-form" id="replyForm-${q.id}">
        <input type="text" class="qa-answer-input" id="replyName-${q.id}" placeholder="${qaTL('anonLabel')}" style="min-height:unset;height:36px;resize:none" />
        <textarea class="qa-answer-input" id="replyText-${q.id}" placeholder="${isAr ? 'اكتب إجابتك هنا...' : 'Write your answer here...'}" rows="3"></textarea>
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary" style="font-size:.78rem;padding:7px 16px" onclick="qaSubmitAnswer('${q.id}')">${qaTL('postAnsBtn')}</button>
          <button class="btn btn-outline" style="font-size:.78rem;padding:7px 16px;border-color:var(--border);color:var(--text-muted)" onclick="qaToggleReply('${q.id}')">${qaTL('cancelBtn')}</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function qaSessionId() {
  let sid = sessionStorage.getItem('daleel_sid');
  if (!sid) { sid = Math.random().toString(36).slice(2); sessionStorage.setItem('daleel_sid', sid); }
  return sid;
}

function qaToggleReply(qid) {
  const form = document.getElementById(`replyForm-${qid}`);
  form?.classList.toggle('open');
}

function qaUpvote(qid, aid, btn) {
  const sid  = qaSessionId();
  const data = loadQA();
  const q    = data.questions.find(x => x.id === qid);
  const a    = q?.answers?.find(x => x.id === aid);
  if (!a) return;
  if (a.votedBy?.includes(sid)) return;
  a.votedBy = [...(a.votedBy||[]), sid];
  a.upvotes = (a.upvotes || 0) + 1;
  saveQA(data);
  btn.classList.add('voted');
  btn.textContent = `👍 ${qaTL('upvoteBtn')} (${a.upvotes})`;
}

function qaSubmitAnswer(qid) {
  const isAr  = typeof currentLang !== 'undefined' && currentLang === 'ar';
  const name  = document.getElementById(`replyName-${qid}`)?.value?.trim() || qaTL('anonLabel');
  const text  = document.getElementById(`replyText-${qid}`)?.value?.trim();
  if (!text) return;
  const data = loadQA();
  const q    = data.questions.find(x => x.id === qid);
  if (!q) return;
  q.answers = [...(q.answers||[]), { id:`a-${Date.now()}`, author: name || qaTL('anonLabel'), text, timestamp: Date.now(), upvotes:0, isAI:false, votedBy:[] }];
  saveQA(data);
  renderQuestions();
}

function qaRequestAI(qid) {
  const isAr = typeof currentLang !== 'undefined' && currentLang === 'ar';
  const data = loadQA();
  const q    = data.questions.find(x => x.id === qid);
  if (!q || typeof callAI !== 'function') return;

  const userMsg = isAr
    ? `سؤال من طالب سعودي: ${q.text}\n\nأجب في جملتين أو ثلاث فقط. كن محدداً جداً. لا نصيحة عامة.`
    : `Question from a Saudi student: ${q.text}\n\nAnswer in 2–3 sentences only. Be very specific. No generic advice.`;

  // Add placeholder answer
  const tempId = `ai-${Date.now()}`;
  q.answers = [...(q.answers||[]), { id:tempId, author:'دليل AI', text:'…', timestamp:Date.now(), upvotes:0, isAI:true, votedBy:[] }];
  saveQA(data);
  renderQuestions();

  callAI(
    [{ role:'system', content:`You are Daleel. Answer in 2 sentences max. Be specific, no hedging. ${isAr ? 'Answer in Arabic.' : 'Answer in English.'}` },
     { role:'user', content: userMsg }],
    () => {},
    (full) => {
      const d2 = loadQA();
      const q2 = d2.questions.find(x => x.id === qid);
      const a2 = q2?.answers?.find(x => x.id === tempId);
      if (a2) { a2.text = full; saveQA(d2); renderQuestions(); }
    },
    (err) => {
      const d2 = loadQA();
      const q2 = d2.questions.find(x => x.id === qid);
      const a2 = q2?.answers?.find(x => x.id === tempId);
      if (a2) { a2.text = `❌ ${err.message}`; saveQA(d2); renderQuestions(); }
    }
  );
}

/* ── Post new question ──────────────────────────────────── */
async function qaSubmitQuestion() {
  const isAr = typeof currentLang !== 'undefined' && currentLang === 'ar';
  const name = document.getElementById('qaName')?.value?.trim() || qaTL('anonLabel');
  const text = document.getElementById('qaText')?.value?.trim();
  const cat  = document.getElementById('qaCat')?.value || 'general';
  if (!text || text.length < 10) {
    alert(isAr ? 'اكتب سؤالاً كاملاً (10 أحرف على الأقل).' : 'Write a complete question (at least 10 characters).');
    return;
  }

  // AI moderation — check if دليل has a relevant tool
  const suggBox = document.getElementById('qaSuggestion');
  if (typeof callAI === 'function') {
    const moderateMsg = `The user is about to post this question on a Saudi student college forum: "${text}". Does our platform دليل have a specific tool that directly answers this? The tools are: College List Builder, Application Tracker, Countdown Dashboard, CPP Calculator (for Aramco CPP eligibility), Profile Strength Score, Scholarship Finder, Test Guide, Essay Advisor, Essay Vault, EC Advisor, Weekly Tips. Reply with ONLY a JSON object: {"hasTool": true/false, "toolName": "Name or null", "toolUrl": "filename.html or null", "suggestion": "One sentence explaining the relevant tool, or null"}`;
    try {
      await new Promise((resolve) => {
        callAI(
          [{ role:'system', content:'You are a helpful assistant. Reply with valid JSON only.' },
           { role:'user', content: moderateMsg }],
          () => {},
          (full) => {
            try {
              const m = full.match(/\{[\s\S]*\}/);
              const rec = JSON.parse(m[0]);
              if (rec.hasTool && rec.suggestion && suggBox) {
                suggBox.innerHTML = `<strong>${qaTL('aiSuggTitle')}</strong> ${rec.suggestion}${rec.toolUrl ? ` <a href="${rec.toolUrl}" style="color:var(--gold);font-weight:700">${rec.toolName} →</a>` : ''}`;
                suggBox.classList.add('show');
              }
            } catch {}
            resolve();
          },
          () => resolve()
        );
      });
    } catch {}
  }

  // Post the question
  const data = loadQA();
  data.questions.push({ id:`q-${Date.now()}`, author: name, text, category:cat, timestamp:Date.now(), answers:[] });
  saveQA(data);

  // Reset form
  document.getElementById('qaName').value = '';
  document.getElementById('qaText').value = '';
  document.getElementById('postQForm')?.classList.remove('open');
  renderQuestions();
}

/* ── Page init ──────────────────────────────────────────── */
function initCommunityPage() {
  renderFAQs();
  renderQuestions();

  // Post button
  document.getElementById('qaPostBtn')?.addEventListener('click', () => {
    const form = document.getElementById('postQForm');
    form?.classList.toggle('open');
    if (form?.classList.contains('open')) form.scrollIntoView({ behavior:'smooth', block:'nearest' });
  });
  document.getElementById('qaCancelBtn')?.addEventListener('click', () => {
    document.getElementById('postQForm')?.classList.remove('open');
  });
  document.getElementById('qaSubmitBtn')?.addEventListener('click', qaSubmitQuestion);

  // Search
  document.getElementById('qaSearchInput')?.addEventListener('input', (e) => {
    qaSearch = e.target.value.trim();
    renderFAQs();
    renderQuestions();
  });

  // Category filters
  document.querySelectorAll('.qa-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      qaFilter = btn.dataset.cat;
      document.querySelectorAll('.qa-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderFAQs();
      renderQuestions();
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('faqSection')) initCommunityPage();
});
