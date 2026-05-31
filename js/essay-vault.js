/* Daleel — Essay Vault: Framework Library + AI Analyzer */

const ESSAY_FRAMEWORKS = [
  {
    id:'regional-first', icon:'🏙️',
    titleEn:'The Regional First', titleAr:'الأول في المنطقة',
    whenEn:'You built, founded, or started something in your city that didn\'t exist before.',
    whenAr:'بنيت أو أسست شيئاً في مدينتك لم يكن موجوداً من قبل.',
    dontEn:'Don\'t make it about what you built — make it about why the gap existed.',
    dontAr:'لا تجعله عن ما بنيت — اجعله عن لماذا كانت الفجوة موجودة.',
    outlineEn:['Open with the absence (what was missing)','The moment you decided to fill it','The process — failures and pivots','What it changed for others','What it changed in you'],
    outlineAr:['ابدأ بالغياب (ما الذي كان مفقوداً)','اللحظة التي قررت فيها سد الفجوة','العملية — الإخفاقات والتحولات','ما الذي تغير للآخرين','ما الذي تغير فيك'],
    openingEn:'"There was no robotics club in Medina. Not one. So I started with fourteen friends in a parking garage."',
    openingAr:'"لم يكن هناك نادي روبوتيك في المدينة. ولا واحد. فبدأت مع أربعة عشر صديقاً في كراج."',
    mistakesEn:['Making it sound like a résumé bullet','Focusing on the achievement not the insight','Not showing the city/regional context'],
    mistakesAr:['جعلها تبدو كبند في السيرة الذاتية','التركيز على الإنجاز لا على الرؤية','عدم إظهار السياق المحلي'],
  },
  {
    id:'language-identity', icon:'🌐',
    titleEn:'The Language Identity', titleAr:'هوية اللغة',
    whenEn:'Arabic is a core part of how you think, create, or connect with the world.',
    whenAr:'اللغة العربية جزء أساسي من طريقة تفكيرك أو إبداعك أو تواصلك مع العالم.',
    dontEn:'Don\'t write about learning English. Write about Arabic as an intellectual tool.',
    dontAr:'لا تكتب عن تعلم الإنجليزية. اكتب عن العربية كأداة فكرية.',
    outlineEn:['A specific moment Arabic gave you something English couldn\'t','The concept or phrase that changed how you think','How this shapes your intellectual approach','What you bring to a Western campus because of it'],
    outlineAr:['لحظة محددة أعطتك فيها العربية شيئاً لم تستطع الإنجليزية','المفهوم أو العبارة التي غيّرت تفكيرك','كيف يشكّل هذا منهجك الفكري','ما الذي تجلبه لحرم جامعي غربي بسببه'],
    openingEn:'"The Arabic word \'tarab\' has no English translation — it\'s the ecstasy of being undone by music. I have been searching for it my whole life."',
    openingAr:'"كلمة الطرب لا ترجمة لها بالإنجليزية — إنها نشوة الاندهاش بالموسيقى. وقد كنت أبحث عنها طوال حياتي."',
    mistakesEn:['Translating Arabic words and explaining them like a textbook','Making it a linguistics essay instead of personal','Starting with "I have always loved Arabic"'],
    mistakesAr:['ترجمة الكلمات العربية وشرحها ككتاب مدرسي','جعلها مقالة لغويات بدلاً من شخصية','البدء بـ "لطالما أحببت اللغة العربية"'],
  },
  {
    id:'islamic-identity', icon:'☪️',
    titleEn:'The Islamic Identity', titleAr:'الهوية الإسلامية',
    whenEn:'Faith is genuinely central to who you are and how you move through the world.',
    whenAr:'الإيمان حقيقياً في صميم هويتك وطريقة تحركك في العالم.',
    dontEn:'Don\'t explain Islam. Don\'t apologize for it. Don\'t perform it for a Western audience.',
    dontAr:'لا تشرح الإسلام. لا تعتذر عنه. لا تؤديه لجمهور غربي.',
    outlineEn:['Start in a specific moment — not a belief statement','Show faith as a lens, not a label','The tension or complexity','What you actually do because of your faith','How this makes you a distinctive thinker'],
    outlineAr:['ابدأ في لحظة محددة — لا في تصريح بالمعتقد','أظهر الإيمان كعدسة لا كتسمية','التوتر أو التعقيد','ما تفعله فعلاً بسبب إيمانك','كيف يجعلك هذا مفكراً متميزاً'],
    openingEn:'"I prayed Fajr in the MIT admissions office waiting room. The security guard said nothing. I said nothing. Some things need no explanation."',
    openingAr:'"صليت الفجر في غرفة انتظار مكتب القبول في MIT. لم يقل الحارس شيئاً. لم أقل شيئاً. بعض الأشياء لا تحتاج إلى تفسير."',
    mistakesEn:['Starting with "As a Muslim..."','Over-explaining Ramadan or prayer to Western readers','Making it about being misunderstood in the West'],
    mistakesAr:['البدء بـ "بوصفي مسلماً..."','شرح رمضان أو الصلاة بإسهاب للقراء الغربيين','جعلها عن سوء الفهم في الغرب'],
  },
  {
    id:'research-essay', icon:'🔬',
    titleEn:'The Research Essay', titleAr:'مقالة البحث',
    whenEn:'You\'ve done actual research — KAUST, Mawhiba, school lab, independent project.',
    whenAr:'أجريت بحثاً حقيقياً في KAUST أو موهبة أو مختبر مدرسة أو مشروع مستقل.',
    dontEn:'Don\'t summarize your research. Show what the research revealed about you.',
    dontAr:'لا تلخص بحثك. أظهر ما كشفه البحث عنك.',
    outlineEn:['The question that obsessed you (not the result)','The moment you encountered a real unknown','What you did when you didn\'t know the answer','What you learned about how you think','Where this curiosity takes you next'],
    outlineAr:['السؤال الذي شغلك (لا النتيجة)','اللحظة التي واجهت فيها مجهولاً حقيقياً','ما فعلته حين لم تعرف الإجابة','ما تعلمته عن طريقة تفكيرك','أين تأخذك هذه الفضولية'],
    openingEn:'"The protein folded wrong. For six weeks it kept folding wrong. My advisor said to move on. I couldn\'t."',
    openingAr:'"طُوِيَ البروتين بشكل خاطئ. لستة أسابيع ظل يُطوى بشكل خاطئ. قال مشرفي: تقدم للأمام. لم أستطع."',
    mistakesEn:['Writing an abstract instead of a story','Listing equipment and methodology','Not showing intellectual humility or failure'],
    mistakesAr:['كتابة ملخص بحثي بدلاً من قصة','سرد المعدات والمنهجية','عدم إظهار التواضع الفكري أو الإخفاق'],
  },
  {
    id:'family-legacy', icon:'👨‍👩‍👧',
    titleEn:'The Family Legacy', titleAr:'إرث العائلة',
    whenEn:'A parent or grandparent\'s story shapes your ambition in a specific, concrete way.',
    whenAr:'تشكّل قصة أحد والديك أو أجدادك طموحك بطريقة محددة وملموسة.',
    dontEn:'Don\'t make it a tribute. Make it a continuation.',
    dontAr:'لا تجعله تكريماً. اجعله استمراراً.',
    outlineEn:['A concrete image of your ancestor at work','What they couldn\'t access or finish','How you carry that forward — specifically','The tension: honor vs forge your own path','What you will build that they couldn\'t'],
    outlineAr:['صورة ملموسة لجدك أو والدك في عمله','ما لم يستطيعوا الوصول إليه أو إنهاءه','كيف تحمل ذلك للأمام — بشكل محدد','التوتر: الشرف مقابل شق طريقك الخاص','ما الذي ستبنيه أنت مما لم يستطيعوا'],
    openingEn:'"My grandfather memorized the Quran by candlelight because his school had no electricity. I am applying to MIT because he would have, if they had let him."',
    openingAr:'"حفظ جدي القرآن على ضوء الشمعة لأن مدرسته لم تكن بها كهرباء. أتقدم إلى MIT لأنه كان سيفعل، لو أتاحوا له الفرصة."',
    mistakesEn:['Being sentimental without being specific','Not showing your own voice alongside theirs','Ending on inspiration rather than intention'],
    mistakesAr:['العاطفة بدون التحديد','عدم إظهار صوتك الخاص بجانب صوتهم','الانتهاء بالإلهام بدلاً من النية'],
  },
  {
    id:'builder-essay', icon:'🏗️',
    titleEn:'The Builder Essay', titleAr:'مقالة المُنشئ',
    whenEn:'You founded something — a club, a company, a program, a movement.',
    whenAr:'أسست شيئاً — نادياً أو شركة أو برنامجاً أو حركة.',
    dontEn:'Don\'t make it about the thing you built. Make it about what you learned about building.',
    dontAr:'لا تجعله عن الشيء الذي بنيته. اجعله عما تعلمته عن البناء.',
    outlineEn:['The blank space before anything existed','First failure (there\'s always one)','The pivot or realization','What it looks like now','What you know about starting things that others don\'t'],
    outlineAr:['الفراغ قبل أن يوجد أي شيء','الإخفاق الأول (يوجد دائماً)','التحول أو الإدراك','كيف يبدو الآن','ما تعرفه عن البدء مما لا يعرفه الآخرون'],
    openingEn:'"On the first day, it was just me, a whiteboard, and a name I wasn\'t sure I believed in yet."',
    openingAr:'"في اليوم الأول، كنت أنا فقط، ولوح أبيض، واسم لم أكن متأكداً أنني أؤمن به بعد."',
    mistakesEn:['Bragging about scale/numbers before showing process','Not admitting what failed','Making it sound like a business plan'],
    mistakesAr:['التفاخر بالأرقام قبل إظهار العملية','عدم الاعتراف بما فشل','جعله يبدو كخطة عمل'],
  },
  {
    id:'sport-art', icon:'🎨',
    titleEn:'The Sport / Art Identity', titleAr:'هوية الرياضة والفن',
    whenEn:'A physical or creative practice reveals something essential about how you engage with the world.',
    whenAr:'ممارسة جسدية أو إبداعية تكشف شيئاً أساسياً عن طريقة تعاملك مع العالم.',
    dontEn:'Don\'t write about winning. Write about what the practice teaches you when you\'re alone with it.',
    dontAr:'لا تكتب عن الفوز. اكتب عما تعلمك إياه الممارسة عندما تكون وحدك معها.',
    outlineEn:['A specific moment in practice — not competition','What the discipline requires that school doesn\'t','A failure or plateau and how you moved through it','What this practice taught you about learning itself','How this shapes everything else you do'],
    outlineAr:['لحظة محددة في التدريب — لا في المسابقة','ما تتطلبه الممارسة مما لا تتطلبه المدرسة','إخفاق أو ركود وكيف تجاوزته','ما علّمتك إياه هذه الممارسة عن التعلم نفسه','كيف تشكّل كل شيء آخر تفعله'],
    openingEn:'"The oud doesn\'t care how smart you are. At 2am, it was just the string, my finger, and everything I still couldn\'t do."',
    openingAr:'"العود لا يهتم بذكائك. في الساعة الثانية صباحاً، كان الأمر مجرد الوتر، وإصبعي، وكل ما لم أستطع فعله بعد."',
    mistakesEn:['Listing achievements and trophies','Not showing what the art/sport cost you','Making it inspirational rather than specific'],
    mistakesAr:['سرد الإنجازات والجوائز','عدم إظهار ما كلّفتك إياه الممارسة','جعلها ملهمة بدلاً من محددة'],
  },
  {
    id:'between-worlds', icon:'🌍',
    titleEn:'Between Two Worlds', titleAr:'بين عالمين',
    whenEn:'You\'ve lived in the space between Saudi/Arab identity and international or Western education.',
    whenAr:'عشت في الفضاء بين الهوية السعودية والتعليم الدولي أو الغربي.',
    dontEn:'Don\'t make it about conflict or confusion. Make it about what the gap gave you.',
    dontAr:'لا تجعله عن الصراع أو الارتباك. اجعله عما أعطاك الفجوة.',
    outlineEn:['The specific moment you felt the gap most acutely','What each world gave you that the other couldn\'t','A situation where you used both simultaneously','What you see from the middle that others miss','What you want to build with this perspective'],
    outlineAr:['اللحظة المحددة التي أحسست فيها الفجوة بأشد حدة','ما أعطاك كل عالم مما لم يستطع الآخر','موقف استخدمت فيه كليهما في آنٍ واحد','ما تراه من المنتصف مما يفوت الآخرين','ما تريد بناءه بهذا المنظور'],
    openingEn:'"I translate not just words but entire ways of being. In the morning I argue in Arabic about Ibn Khaldun. By afternoon I\'m debugging Python. Neither version of me is performing."',
    openingAr:'"أترجم ليس الكلمات فحسب بل طرق الوجود بأكملها. في الصباح أجادل بالعربية حول ابن خلدون. بعد الظهر أصحح كود Python. لا نسخة مني تمثّل."',
    mistakesEn:['Framing it as an identity crisis resolved by education','Sounding like a diversity statement','Not having a specific intellectual insight'],
    mistakesAr:['تأطيرها كأزمة هوية حلّها التعليم','الأسلوب كبيان تنوع','عدم وجود رؤية فكرية محددة'],
  },
];

/* ── Framework library renderer ─────────────────────────── */
function renderFrameworks() {
  const isAr = typeof currentLang !== 'undefined' && currentLang === 'ar';
  const container = document.getElementById('frameworkGrid');
  if (!container) return;

  container.innerHTML = ESSAY_FRAMEWORKS.map((f, i) => {
    const title = isAr ? f.titleAr : f.titleEn;
    const when  = isAr ? f.whenAr  : f.whenEn;
    return `<div class="vault-card" style="animation-delay:${i*.07}s" data-fid="${f.id}">
      <div class="vault-card-icon">${f.icon}</div>
      <div class="card-badge card-badge--target">${isAr ? 'إطار' : 'Framework'}</div>
      <div class="vault-card-title">${title}</div>
      <div class="vault-card-when">${when}</div>
      <div class="vault-hover-hint">${isAr ? 'انقر لرؤية الإطار الكامل ←' : 'Click for full framework →'}</div>
    </div>`;
  }).join('');

  // Hover overlay
  if (typeof ensureOverlay === 'function') ensureOverlay();
  if (typeof ensureModal  === 'function') ensureModal();
  const overlay = document.getElementById('hoverOverlay');
  container.querySelectorAll('.vault-card').forEach(card => {
    card.addEventListener('mouseenter', () => overlay?.classList.add('active'));
    card.addEventListener('mouseleave', () => overlay?.classList.remove('active'));
    card.addEventListener('click', () => openFrameworkModal(card.dataset.fid));
  });
}

function openFrameworkModal(fid) {
  if (typeof ensureModal === 'function') ensureModal();
  const isAr = typeof currentLang !== 'undefined' && currentLang === 'ar';
  const f = ESSAY_FRAMEWORKS.find(x => x.id === fid);
  if (!f) return;

  const TL = (typeof T !== 'undefined' ? T[isAr ? 'ar' : 'en']?.vault : null) || {};
  const title   = isAr ? f.titleAr   : f.titleEn;
  const when    = isAr ? f.whenAr    : f.whenEn;
  const dont    = isAr ? f.dontAr    : f.dontEn;
  const outline = isAr ? f.outlineAr : f.outlineEn;
  const opening = isAr ? f.openingAr : f.openingEn;
  const mistakes= isAr ? f.mistakesAr: f.mistakesEn;

  const body = document.getElementById('cardModalBody');
  body.innerHTML = `
    <button class="card-modal-close" onclick="closeCardModal()">✕</button>
    <div class="card-modal-header">
      <div class="card-modal-flag">${f.icon}</div>
      <div style="padding-inline-end:36px">
        <div class="card-modal-title">${title}</div>
        <div class="card-modal-sub">${isAr ? 'إطار مقالة' : 'Essay Framework'}</div>
      </div>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">${TL.whenLabel || 'When to use'}</div>
      <p style="font-size:.84rem;color:var(--text-body);line-height:1.65">${when}</p>
    </div>

    <div class="vault-dont-box">
      <strong>${TL.dontLabel || '❌ What NOT to do'}</strong>${dont}
    </div>

    <div class="modal-section">
      <div class="modal-section-title">${TL.outlineLabel || 'Structure'}</div>
      <ol class="vault-outline-list">${outline.map(s => `<li>${s}</li>`).join('')}</ol>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">${TL.openingLabel || 'Strong Opening Line'}</div>
      <div class="vault-opening-line">${opening}</div>
    </div>

    <div class="modal-section">
      <div class="modal-section-title" style="color:#b91c1c">${TL.mistakesLabel || 'Common Saudi Student Mistakes'}</div>
      <ul class="vault-mistakes-list">${mistakes.map(m => `<li>${m}</li>`).join('')}</ul>
    </div>`;

  document.getElementById('cardModalOverlay').classList.add('open');
}

/* ── AI Essay Analyzer ──────────────────────────────────── */
function submitEssayVault(event) {
  event.preventDefault();
  const isAr  = typeof currentLang !== 'undefined' && currentLang === 'ar';
  const TL    = (typeof T !== 'undefined' ? T[isAr ? 'ar' : 'en']?.vault : null) || {};
  const draft = document.getElementById('vaultDraft')?.value?.trim();
  const prompt= document.getElementById('vaultPrompt')?.value || '';
  const fwork = document.getElementById('vaultFramework')?.value || 'other';
  if (!draft || draft.split(' ').length < 50) {
    alert(isAr ? 'الرجاء لصق مقالة كاملة (50 كلمة على الأقل).' : 'Please paste a complete essay draft (at least 50 words).');
    return;
  }

  const userMsg = isAr
    ? `مسودة مقالتي:\n\n${draft}\n\nسؤال Common App: ${prompt || 'لم يُحدد'}\nنوع الإطار: ${fwork}\n\nحلّل مقالتي وأعطني JSON فقط.`
    : `My essay draft:\n\n${draft}\n\nCommon App prompt: ${prompt || 'Not specified'}\nEssay framework type: ${fwork}\n\nAnalyze my essay and return JSON only.`;

  const loadEl   = document.getElementById('vaultLoading');
  const resultEl = document.getElementById('vaultOutput');
  const resultBox= document.getElementById('vaultResult');
  if (loadEl)   loadEl.classList.add('visible');
  if (resultBox) resultBox.classList.remove('visible');

  if (typeof callAI !== 'function') return;
  callAI(
    [{ role:'system', content: VAULT_SYSTEM_PROMPT(isAr) },
     { role:'user',   content: userMsg }],
    () => {},
    (full) => {
      if (loadEl)    loadEl.classList.remove('visible');
      if (resultBox) resultBox.classList.add('visible');
      try {
        const m = full.match(/\{[\s\S]*\}/);
        const data = JSON.parse(m[0]);
        renderEssayAnalysis(data, resultEl, isAr, TL);
      } catch {
        if (resultEl) resultEl.textContent = full;
      }
    },
    (err) => {
      if (loadEl)    loadEl.classList.remove('visible');
      if (resultBox) resultBox.classList.add('visible');
      if (resultEl)  resultEl.textContent = `❌ ${err.message}`;
    }
  );
}

function renderEssayAnalysis(data, container, isAr, TL) {
  const tierMeta = {
    memorable:  { label: TL.tierMemorable  || 'Memorable',  cls:'memorable',  pct:100, color:'#059669' },
    strong:     { label: TL.tierStrong     || 'Strong',     cls:'strong',     pct:78,  color:'' },
    'needs-work':{ label: TL.tierNeedsWork || 'Needs Work', cls:'needs-work', pct:50,  color:'#f97316' },
    'needs work':{ label: TL.tierNeedsWork || 'Needs Work', cls:'needs-work', pct:50,  color:'#f97316' },
    'start-over':{ label: TL.tierStartOver || 'Start Over', cls:'start-over', pct:25,  color:'#ef4444' },
    'start over':{ label: TL.tierStartOver || 'Start Over', cls:'start-over', pct:25,  color:'#ef4444' },
  };
  const tier = tierMeta[(data.tier||'').toLowerCase()] || tierMeta.strong;

  let html = `<div class="essay-tier-box">
    <div class="essay-tier-label">${isAr ? 'التقييم الإجمالي' : 'Overall Tier'}</div>
    <div class="essay-tier-value">${tier.label}</div>
    <div class="essay-tier-bar-wrap"><div class="essay-tier-bar ${tier.cls}" style="width:0%" id="tierBar"></div></div>
    <div class="essay-tier-summary">${data.summary || ''}</div>
  </div>`;

  const sections = [
    { key:'strengths',   label: TL.strengthsLabel   || 'Strengths',   icon:'✅', cls:'strength' },
    { key:'weaknesses',  label: TL.weaknessesLabel  || 'Weaknesses',  icon:'⚠️', cls:'weakness' },
    { key:'saudiLens',   label: TL.saudiLensLabel   || 'Saudi Lens',  icon:'🌙', cls:'saudi'    },
    { key:'rewrites',    label: TL.rewritesLabel     || 'Rewrites',    icon:'✏️', cls:'rewrite'  },
  ];
  sections.forEach(({ key, label, icon, cls }) => {
    const items = data[key];
    if (!items?.length) return;
    html += `<div class="essay-result-group">
      <div class="ccard-section-label">${icon} ${label}</div>
      ${items.map((item, i) => `<div class="essay-analysis-card ${cls}" style="animation-delay:${i*.06}s">
        <span class="essay-analysis-icon">${icon}</span>
        <span class="essay-analysis-text">${item}</span>
      </div>`).join('')}
    </div>`;
  });

  container.innerHTML = html;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.getElementById('tierBar')?.style.setProperty('width', `${tier.pct}%`);
  }));
}

const VAULT_SYSTEM_PROMPT = (isAr) => `You are Daleel, an expert essay coach for Saudi students applying to Western universities.
You understand Saudi culture, Islamic identity, Vision 2030, regional context, and what resonates with US/UK admissions officers.
Be honest and specific — quote the student's exact phrases.

${isAr ? 'Respond in Arabic only.' : 'Respond in English only.'}

CRITICAL: Return ONLY valid JSON. No markdown. No text outside JSON:
{"tier":"memorable|strong|needs-work|start-over","summary":"3 honest sentences","strengths":["specific strength with quote or reference"],"weaknesses":["specific weakness with exact line or phrase"],"saudiLens":["how this reads to a Western adcom — what to clarify vs keep mysterious"],"rewrites":["Original: '...' → Rewrite: '...'"]}`;

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('frameworkGrid')) {
    renderFrameworks();
    document.getElementById('vaultAnalyzeForm')?.addEventListener('submit', submitEssayVault);
    // Tab switching
    document.querySelectorAll('.vault-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.vault-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.vault-tab-pane').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab)?.classList.add('active');
      });
    });
  }
});
