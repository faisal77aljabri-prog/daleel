/* Daleel — Core App JS
   Language toggle, Grok AI streaming, shared utilities
   ---------------------------------------------------------------- */

// ── State ──────────────────────────────────────────────────────────
let currentLang = localStorage.getItem('daleel_lang') || 'en';

// ── Init ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  applyLanguage(currentLang);
  highlightActiveNav();
  initMobileMenu();
});

// ── Language Toggle ────────────────────────────────────────────────
function toggleLanguage() {
  currentLang = currentLang === 'en' ? 'ar' : 'en';
  localStorage.setItem('daleel_lang', currentLang);
  applyLanguage(currentLang);
}

function applyLanguage(lang) {
  const html = document.documentElement;
  html.setAttribute('lang', lang);
  html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');

  // Update all data-i18n elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const text = getTranslation(lang, key);
    if (text !== undefined) el.textContent = text;
  });

  // Update placeholder translations
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const text = getTranslation(lang, key);
    if (text !== undefined) el.setAttribute('placeholder', text);
  });

  // Update lang toggle button
  document.querySelectorAll('.lang-toggle').forEach(btn => {
    btn.textContent = lang === 'ar' ? 'English' : 'عربي';
  });

  // Update page title if set
  const titleKey = document.body.getAttribute('data-title-key');
  if (titleKey) {
    const t = getTranslation(lang, titleKey);
    if (t) document.title = `${t} — دليل`;
  }
}

function getTranslation(lang, key) {
  const keys = key.split('.');
  let obj = T[lang];
  for (const k of keys) {
    if (obj === undefined) return undefined;
    obj = obj[k];
  }
  return obj;
}

function t(key) {
  return getTranslation(currentLang, key) ?? getTranslation('en', key) ?? key;
}

// ── Navbar Active State ────────────────────────────────────────────
function highlightActiveNav() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .mobile-menu a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === path || (path === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
}

// ── Mobile Menu ────────────────────────────────────────────────────
function initMobileMenu() {
  const hamburger = document.querySelector('.hamburger');
  const menu = document.querySelector('.mobile-menu');
  if (!hamburger || !menu) return;

  hamburger.addEventListener('click', () => {
    menu.classList.toggle('open');
  });
}

// ── Grok AI Streaming ──────────────────────────────────────────────
async function callGrok(messages, outputEl, loadingEl, resultContainer) {
  if (loadingEl) loadingEl.classList.add('visible');
  if (resultContainer) resultContainer.classList.remove('visible');
  if (outputEl) outputEl.textContent = '';

  try {
    const res = await fetch('/api/grok', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const contentType = res.headers.get('Content-Type') || '';

    if (contentType.includes('text/event-stream')) {
      // Streaming response
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (loadingEl) loadingEl.classList.remove('visible');
      if (resultContainer) resultContainer.classList.add('visible');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;

          try {
            const json = JSON.parse(data);
            const token = json.choices?.[0]?.delta?.content;
            if (token && outputEl) {
              outputEl.textContent += token;
              outputEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          } catch {
            // Ignore malformed lines
          }
        }
      }
    } else {
      // Fallback: full JSON response
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '';
      if (loadingEl) loadingEl.classList.remove('visible');
      if (resultContainer) resultContainer.classList.add('visible');
      if (outputEl) outputEl.textContent = content;
    }
  } catch (err) {
    if (loadingEl) loadingEl.classList.remove('visible');
    if (resultContainer) resultContainer.classList.add('visible');
    if (outputEl) {
      outputEl.textContent = currentLang === 'ar'
        ? `❌ خطأ: ${err.message}\n\nتأكد من إعداد GROK_API_KEY في إعدادات Vercel.`
        : `❌ Error: ${err.message}\n\nMake sure GROK_API_KEY is set in your Vercel environment variables.`;
    }
  }
}

// ── System Prompts ─────────────────────────────────────────────────
const SYSTEM_PROMPTS = {
  collegeList: (lang) => `You are Daleel, an AI college advisor built exclusively for Saudi students applying to international universities. You have deep knowledge of:
- The Saudi GPA system (percentages, not 4.0 scale; 85%+ is strong)
- Saudi standardized tests: Qudurat (قدرات) out of 100, Scientific Qudurat, Tahsili (تحصيلي)
- Saudi school types and how they affect applications
- Aramco CPP (College Degree Program): eligibility requires SAT Math 630+ OR Qudurat 90+, GPA 85%+ cumulative, GPA 85%+ in Math & Science subjects. Only for international school graduates. Application opens February/March. CPP Waiver: unconditional offer from Top 30 global university skips prep year.
- King Abdullah Scholarship Program (KASP), Mawhiba, SABIC, STC scholarships
- Saudi cultural context: family approval, halal considerations, campus culture, Saudi student communities abroad
- Vision 2030 and its impact on Saudi career pathways

You MUST respond in ${lang === 'ar' ? 'Arabic (العربية)' : 'English'} only.

When generating a college list:
1. Provide EXACTLY: 3 reach schools, 3 target schools, 3 safety schools
2. For each school provide: name, location, acceptance rate, median SAT, CPP-eligible (Top 30?), Saudi community notes, scholarship availability
3. Be HONEST — if a profile is weak, say so directly with specific, actionable improvements
4. Always filter advice through Saudi student lens — consider CPP eligibility, scholarship opportunities, Saudi community size, halal food availability
5. Start with a one-paragraph honest assessment of the student's profile
6. Tone: like a knowledgeable older sibling who has been through the process — direct, not corporate, not overly formal
7. Never give generic American advice — every recommendation must be Saudi-specific`,

  scholarships: (lang) => `You are Daleel, a scholarship advisor for Saudi students. You know everything about:
- Aramco CPP (College Degree Program): SAT Math 630+ OR Qudurat 90+, GPA 85%+ cumulative AND 85%+ in Math & Science. International school graduates only. Application February/March, screening tests May 1-2, career fair June 3-4, orientation August 2. CPP Waiver for Top 30 admits.
- King Abdullah Scholarship Program (KASP): Government scholarship for Saudi students at accredited international universities. Full funding for approved programs.
- Mawhiba: For gifted students identified by the National Center for Gifted & Creativity.
- SABIC Scholarship: For students in chemistry, chemical engineering, materials science fields.
- STC Scholarship: For students in technology, telecommunications, computer science.
- Individual university scholarships and need-based aid for Saudi students.

You MUST respond in ${lang === 'ar' ? 'Arabic (العربية)' : 'English'} only.

For each scholarship assessment:
1. Tell the student DIRECTLY whether they are: ELIGIBLE, BORDERLINE, or NOT ELIGIBLE for Aramco CPP
2. If borderline or ineligible, give SPECIFIC numbers they need to hit
3. List all other scholarships they may qualify for with eligibility status
4. Be honest — Saudi students need real information, not encouragement
5. Tone: direct, specific, actionable — like a mentor who has seen many CPP applications`,

  satGuide: (lang) => `You are Daleel, a test strategy advisor for Saudi students. You know:
- Qudurat (القدرات): General Aptitude Test by Qiyas. Score out of 100. Required for Saudi public universities.
- Scientific Qudurat: For engineering/science tracks at Saudi universities.
- Tahsili (التحصيلي): Achievement Test by Qiyas. Subject-specific. Score out of 100. Required alongside Qudurat for Saudi public universities.
- SAT: US College Board test. Out of 1600 (Math 800 + EBRW 800). Used for international university admissions.
- SAT at Saudi universities: KFUPM accepts SAT in place of Qudurat. Taibah University accepts SAT. Prince Sultan University accepts SAT. Al-Faisal University uses SAT natively.
- Aramco CPP: SAT Math 630+ substitutes for Qudurat 90+. This is the key threshold.
- Score equivalencies (approximate): Qudurat 90 ≈ SAT Math 630; Qudurat 95 ≈ SAT Math 680-700; Qudurat 85 ≈ SAT Math 580-600

You MUST respond in ${lang === 'ar' ? 'Arabic (العربية)' : 'English'} only.

When advising on tests:
1. Tell the student exactly which tests they still need for each target
2. Be specific about SAT Math vs total SAT — for CPP, only SAT Math matters
3. Flag if they are close to the CPP threshold (SAT Math 630 / Qudurat 90)
4. Give a clear action plan with priorities
5. Never assume all students need the SAT — some routes only need Qudurat/Tahsili`,

  essay: (lang) => `You are Daleel, an essay coach who specializes in helping Saudi students write compelling personal statements for US, UK, and Canadian universities.

You deeply understand:
- What Western admissions officers find compelling about Saudi applicants: regional firsts, Islamic identity handled with confidence and specificity (not apologetically), Arabic language as intellectual passion, Vision 2030 entrepreneurship, family and generational narratives
- Saudi cultural context: the significance of Mecca and Medina, tribal identity, the weight of being the first in your family to study abroad, the Saudi education system
- Common App personal statement (650 words) and its 7 prompts
- UK UCAS personal statement (4000 characters)
- What to avoid: over-explaining Islamic concepts to Western readers, apologizing for cultural differences, writing about Mecca/Medina in a way that feels performative for a non-Muslim audience, being too general about "Saudi culture"

Saudi story angles that resonate:
1. Building something in your city (startup, community project, innovation) — Saudi entrepreneurship is compelling
2. Islamic identity handled with intellectual confidence — not apologetic, not performative, specific
3. Arabic language as an intellectual passion — language, poetry, literature, identity
4. Family and generational narratives — first to study abroad, grandmother's stories, father's generation
5. Vision 2030 context — a country transforming, being part of it
6. STEM in a Saudi context — robotics in Medina, coding in Riyadh, science competitions
7. Regional firsts — "first in my city/school/family to..."

You MUST respond in ${lang === 'ar' ? 'Arabic (العربية)' : 'English'} only.

When giving feedback:
1. Be specific — quote their draft and suggest improvements
2. Tell them directly what is working and what is not
3. Flag any cultural missteps (over-explaining, apologizing, performative)
4. Suggest specific Saudi angles if their draft is generic
5. Keep feedback actionable — every comment should lead to a specific change
6. Tone: encouraging but honest — like a friend who got into their dream school and is helping you apply`,
};

// ── College List Form ──────────────────────────────────────────────
function submitCollegeList(event) {
  event.preventDefault();
  const form = event.target;

  const gpa = form.querySelector('#gpa')?.value?.trim();
  const gpaMath = form.querySelector('#gpaMath')?.value?.trim();
  const schoolType = form.querySelector('#schoolType')?.value;
  const satMath = form.querySelector('#satMath')?.value?.trim();
  const satTotal = form.querySelector('#satTotal')?.value?.trim();
  const qudurat = form.querySelector('#qudurat')?.value?.trim();
  const tahsili = form.querySelector('#tahsili')?.value?.trim();
  const major = form.querySelector('#major')?.value?.trim();
  const country = form.querySelector('#country')?.value;
  const budget = form.querySelector('#budget')?.value;
  const ec = form.querySelector('#ec')?.value;

  if (!gpa || !schoolType || !major || !budget || !ec) {
    alert(currentLang === 'ar' ? 'يرجى ملء الحقول الإلزامية.' : 'Please fill in all required fields.');
    return;
  }

  const profileLines = [
    `School type: ${schoolType}`,
    `Cumulative GPA: ${gpa}%`,
    gpaMath ? `Math & Science GPA: ${gpaMath}%` : 'Math & Science GPA: not provided',
    satMath ? `SAT Math: ${satMath}` : 'SAT Math: not taken',
    satTotal ? `SAT Total: ${satTotal}` : 'SAT Total: not taken',
    qudurat ? `Qudurat score: ${qudurat}/100` : 'Qudurat: not taken',
    tahsili ? `Tahsili score: ${tahsili}/100` : 'Tahsili: not taken',
    `Intended major: ${major}`,
    `Preferred country: ${country || 'No preference'}`,
    `Funding situation: ${budget}`,
    `Extracurricular strength: ${ec}`,
  ];

  const userMessage = currentLang === 'ar'
    ? `هذا ملفي الأكاديمي. أرجو بناء قائمة جامعات مخصصة لي:\n\n${profileLines.join('\n')}\n\nأريد ٣ جامعات طموح، ٣ مناسبة، ٣ آمنة مع تقييم صادق لملفي.`
    : `Here is my academic profile. Please build me a personalized college list:\n\n${profileLines.join('\n')}\n\nI want 3 reaches, 3 targets, and 3 safeties with an honest assessment of my profile.`;

  const outputEl = document.getElementById('aiOutput');
  const loadingEl = document.getElementById('aiLoading');
  const resultEl = document.getElementById('aiResult');

  callGrok(
    [
      { role: 'system', content: SYSTEM_PROMPTS.collegeList(currentLang) },
      { role: 'user', content: userMessage },
    ],
    outputEl,
    loadingEl,
    resultEl
  );
}

// ── Scholarship Form ───────────────────────────────────────────────
function submitScholarships(event) {
  event.preventDefault();
  const form = event.target;

  const gpa = form.querySelector('#schGpa')?.value?.trim();
  const gpaMath = form.querySelector('#schGpaMath')?.value?.trim();
  const schoolType = form.querySelector('#schSchoolType')?.value;
  const satMath = form.querySelector('#schSatMath')?.value?.trim();
  const qudurat = form.querySelector('#schQudurat')?.value?.trim();
  const major = form.querySelector('#schMajor')?.value?.trim();

  if (!gpa || !schoolType) {
    alert(currentLang === 'ar' ? 'يرجى ملء الحقول الإلزامية.' : 'Please fill in required fields.');
    return;
  }

  const profileLines = [
    `School type: ${schoolType}`,
    `Cumulative GPA: ${gpa}%`,
    gpaMath ? `Math & Science GPA: ${gpaMath}%` : 'Math & Science GPA: not provided',
    satMath ? `SAT Math: ${satMath}` : 'SAT Math: not taken',
    qudurat ? `Qudurat: ${qudurat}/100` : 'Qudurat: not taken',
    major ? `Intended major: ${major}` : '',
  ].filter(Boolean);

  const userMessage = currentLang === 'ar'
    ? `ملفي الأكاديمي:\n\n${profileLines.join('\n')}\n\nأريد تقييماً صادقاً لأهليتي لبرنامج CPP لأرامكو وجميع المنح المتاحة لي كطالب سعودي.`
    : `My academic profile:\n\n${profileLines.join('\n')}\n\nPlease give me an honest assessment of my eligibility for Aramco CPP and all other scholarships available to me as a Saudi student.`;

  const outputEl = document.getElementById('aiOutput');
  const loadingEl = document.getElementById('aiLoading');
  const resultEl = document.getElementById('aiResult');

  callGrok(
    [
      { role: 'system', content: SYSTEM_PROMPTS.scholarships(currentLang) },
      { role: 'user', content: userMessage },
    ],
    outputEl,
    loadingEl,
    resultEl
  );
}

// ── SAT Guide Form ─────────────────────────────────────────────────
function submitSatGuide(event) {
  event.preventDefault();
  const form = event.target;
  const scores = form.querySelector('#scores')?.value?.trim();

  if (!scores) {
    alert(currentLang === 'ar' ? 'يرجى إدخال درجاتك وجامعاتك المستهدفة.' : 'Please enter your scores and target schools.');
    return;
  }

  const userMessage = currentLang === 'ar'
    ? `درجاتي وجامعاتي المستهدفة: ${scores}\n\nما الاختبارات التي لا أزال أحتاجها؟ وكيف يتناسب ملفي مع متطلبات CPP لأرامكو؟`
    : `My scores and target schools: ${scores}\n\nWhat tests do I still need? And how does my profile match up against the Aramco CPP requirements?`;

  const outputEl = document.getElementById('aiOutput');
  const loadingEl = document.getElementById('aiLoading');
  const resultEl = document.getElementById('aiResult');

  callGrok(
    [
      { role: 'system', content: SYSTEM_PROMPTS.satGuide(currentLang) },
      { role: 'user', content: userMessage },
    ],
    outputEl,
    loadingEl,
    resultEl
  );
}

// ── Essay Form ─────────────────────────────────────────────────────
let selectedPrompt = '';

function selectPrompt(el, promptText) {
  document.querySelectorAll('.prompt-option').forEach(p => p.classList.remove('selected'));
  el.classList.add('selected');
  selectedPrompt = promptText;
}

function submitEssay(event) {
  event.preventDefault();
  const form = event.target;
  const draft = form.querySelector('#draft')?.value?.trim();
  const context = form.querySelector('#essayContext')?.value?.trim();

  if (!draft) {
    alert(currentLang === 'ar' ? 'يرجى إدخال مسودتك أو فكرتك.' : 'Please enter your draft or idea.');
    return;
  }

  const parts = [];
  if (selectedPrompt) parts.push(`Common App Prompt: ${selectedPrompt}`);
  parts.push(`Essay draft / idea:\n${draft}`);
  if (context) parts.push(`Additional context: ${context}`);

  const userMessage = currentLang === 'ar'
    ? `${parts.join('\n\n')}\n\nأريد تقييماً تفصيلياً لمقالتي من منظور سعودي — ما يعمل وما لا يعمل وكيف أحسّنها.`
    : `${parts.join('\n\n')}\n\nPlease give me detailed feedback on my essay from a Saudi student perspective — what's working, what's not, and how to improve it.`;

  const outputEl = document.getElementById('aiOutput');
  const loadingEl = document.getElementById('aiLoading');
  const resultEl = document.getElementById('aiResult');

  callGrok(
    [
      { role: 'system', content: SYSTEM_PROMPTS.essay(currentLang) },
      { role: 'user', content: userMessage },
    ],
    outputEl,
    loadingEl,
    resultEl
  );
}

// ── Tab switching ──────────────────────────────────────────────────
function switchTab(tabId, btn) {
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId)?.classList.add('active');
  btn.classList.add('active');
}
