/* Daleel — Profile Strength Score (live client-side calculation) */

/* ── Scoring Formula ────────────────────────────────────────────
   Academic (30 pts):
     GPA:          ≥90=12, ≥85=10, ≥80=7, ≥75=4, else 2
     SAT Math:     ≥750=8, ≥700=6, ≥650=4, ≥600=2, else 0
     OR Qudurat:   ≥95=8,  ≥90=6,  ≥80=3,  else 0    (whichever higher if both)
     Math/Sci GPA: ≥90=5,  ≥85=3,  else 0
     AP Courses:   many=4, some=2, none=0  (max total 30 → clamp)

   Extracurriculars (25 pts):
     EC tier:  exceptional=25, strong=18, moderate=12, developing=5, none=0

   Application Materials (25 pts):
     PS:    complete=15, draft=8, not-started=0
     Recs:  3=10, 2=6, 1=3, 0=0

   Saudi-Specific (20 pts):
     CPP eligible=8, borderline=4, not-eligible=0
     International/Out-of-Kingdom school=5, else 0
     KASP potential (GPA≥85 + Saudi)=4
     Vision 2030 major bonus=3   (energy/ai/healthcare/tourism/tech)
 ─────────────────────────────────────────────────────────────── */

const V2030_MAJORS = ['energy','ai','artificial','healthcare','health','tourism','tech','information','renewable','biotech','data'];

function getScoreInputs() {
  const v = id => document.getElementById(id)?.value;
  const n = id => parseFloat(v(id)) || 0;
  return {
    gpa:      n('psGpa'),
    mathGpa:  n('psMathGpa'),
    satMath:  n('psSatMath'),
    satTotal: n('psSatTotal'),
    qudurat:  n('psQudurat'),
    school:   v('psSchool') || '',
    major:    (v('psMajor') || '').toLowerCase(),
    ecNum:    n('psEcNum'),
    ecTier:   v('psEcTier') || 'none',
    ps:       v('psPS') || 'not-started',
    recs:     parseInt(v('psRecs') || '0'),
    ap:       v('psAP') || 'none',
  };
}

function calcAcademic(inp) {
  let pts = 0;
  // GPA
  if (inp.gpa >= 90)      pts += 12;
  else if (inp.gpa >= 85) pts += 10;
  else if (inp.gpa >= 80) pts += 7;
  else if (inp.gpa >= 75) pts += 4;
  else if (inp.gpa > 0)   pts += 2;

  // Math/Sci GPA bonus
  if (inp.mathGpa >= 90)      pts += 5;
  else if (inp.mathGpa >= 85) pts += 3;

  // Test: SAT Math or Qudurat (take better)
  let testPts = 0;
  if (inp.satMath >= 750)      testPts = Math.max(testPts, 8);
  else if (inp.satMath >= 700) testPts = Math.max(testPts, 6);
  else if (inp.satMath >= 650) testPts = Math.max(testPts, 4);
  else if (inp.satMath >= 600) testPts = Math.max(testPts, 2);
  if (inp.qudurat >= 95)      testPts = Math.max(testPts, 8);
  else if (inp.qudurat >= 90) testPts = Math.max(testPts, 6);
  else if (inp.qudurat >= 80) testPts = Math.max(testPts, 3);
  pts += testPts;

  // AP/Advanced courses
  if (inp.ap === 'many' || inp.ap === 'كثير (4+)') pts += 4;
  else if (inp.ap === 'some' || inp.ap.includes('1') || inp.ap.includes('بعض')) pts += 2;

  return Math.min(pts, 30);
}

function calcEC(inp) {
  const tierMap = { exceptional:25, strong:18, moderate:12, developing:5, none:0,
    'استثنائي':25, 'قوي':18, 'متوسط':12, 'متطور':5, 'لا يوجد':0 };
  return tierMap[inp.ecTier] ?? 0;
}

function calcMaterials(inp) {
  let pts = 0;
  if (inp.ps === 'complete' || inp.ps === 'مكتمل')     pts += 15;
  else if (inp.ps === 'draft' || inp.ps === 'مسودة')   pts += 8;
  const recMap = [0,3,6,10];
  pts += recMap[Math.min(inp.recs, 3)] || 0;
  return Math.min(pts, 25);
}

function calcSaudi(inp) {
  let pts = 0;
  const isIntl = inp.school.includes('International') || inp.school.includes('Out-of-Kingdom') || inp.school.includes('دولية') || inp.school.includes('خارج');

  // CPP eligibility
  const gpaOk   = inp.gpa >= 85 && inp.mathGpa >= 85;
  const testOk  = inp.satMath >= 630 || inp.qudurat >= 90;
  const schoolOk= isIntl;
  if (gpaOk && testOk && schoolOk) pts += 8;
  else if ((gpaOk ? 1:0) + (testOk ? 1:0) + (schoolOk ? 1:0) >= 2) pts += 4;

  // International school
  if (isIntl) pts += 5;

  // KASP potential (GPA ≥85)
  if (inp.gpa >= 85) pts += 4;

  // Vision 2030 major
  if (V2030_MAJORS.some(kw => inp.major.includes(kw))) pts += 3;

  return Math.min(pts, 20);
}

function getCPPStatus(inp) {
  const isIntl  = inp.school.includes('International') || inp.school.includes('Out-of-Kingdom') || inp.school.includes('دولية') || inp.school.includes('خارج');
  const isSaudi = inp.school.includes('Public') || inp.school.includes('حكومية');
  const gpaOk   = inp.gpa >= 85 && inp.mathGpa >= 85;
  const testOk  = inp.satMath >= 630 || inp.qudurat >= 90;
  if (isSaudi) return 'not-eligible';
  const met = (gpaOk ? 1:0) + (testOk ? 1:0) + (isIntl ? 1:0);
  if (met === 3) return 'eligible';
  if (met >= 2)  return 'borderline';
  return 'not-eligible';
}

function buildActionCards(inp, scores) {
  const isAr = typeof currentLang !== 'undefined' && currentLang === 'ar';
  const actions = [];

  // GPA actions
  if (inp.gpa < 85) actions.push({ pts: inp.gpa < 80 ? 6 : 3, icon:'📈', text: isAr ? `ارفع المعدل التراكمي إلى 85%+: يفتح أهلية CPP ويرفع درجتك الأكاديمية` : `Raise cumulative GPA to 85%+: unlocks CPP eligibility and boosts academic score` });
  if (inp.mathGpa < 85 && inp.gpa > 0) actions.push({ pts: 3, icon:'🧮', text: isAr ? `ارفع معدل الرياضيات/العلوم إلى 85%+: مطلوب لـ CPP` : `Raise Math & Science GPA to 85%+: required for CPP eligibility` });

  // Test score actions
  if (inp.satMath < 630 && inp.qudurat < 90) {
    const satGap = Math.max(0, 630 - inp.satMath);
    const qGap   = Math.max(0, 90  - inp.qudurat);
    if (inp.satMath > 0) actions.push({ pts: 4, icon:'📝', text: isAr ? `ارفع SAT Math بمقدار ${satGap} نقطة إلى 630+` : `Raise SAT Math by ${satGap} points to 630+` });
    else                 actions.push({ pts: 6, icon:'📝', text: isAr ? `أخذ SAT Math والوصول إلى 630+: يفتح أهلية CPP ويضيف +6 نقاط` : `Take SAT Math and reach 630+: unlocks CPP eligibility and adds +6 pts` });
    if (inp.qudurat > 0) actions.push({ pts: 3, icon:'📝', text: isAr ? `ارفع القدرات بمقدار ${qGap} نقطة إلى 90+: يُعادل SAT Math 630` : `Raise Qudurat by ${qGap} points to 90+: equivalent to SAT Math 630 for CPP` });
  } else if (inp.satMath < 750 && inp.satMath > 0) {
    actions.push({ pts: 2, icon:'📝', text: isAr ? `ارفع SAT Math إلى 750+: أضف نقطتين إضافيتين للأكاديمي` : `Raise SAT Math to 750+: adds 2 more academic points` });
  }

  // PS
  if (inp.ps === 'not-started' || inp.ps === 'لم يبدأ') actions.push({ pts: 15, icon:'✍️', text: isAr ? `اكتب البيان الشخصي (مكتمل): +15 نقطة` : `Complete your personal statement: +15 pts` });
  else if (inp.ps === 'draft' || inp.ps === 'مسودة')   actions.push({ pts: 7,  icon:'✍️', text: isAr ? `أنهِ مسودة البيان الشخصي: +7 نقاط إضافية` : `Finalize your personal statement draft: +7 more pts` });

  // Recs
  if (inp.recs < 2) actions.push({ pts: inp.recs === 0 ? 6 : 3, icon:'📨', text: isAr ? `احصل على ${2 - inp.recs} رسالة توصية إضافية (الهدف: 2–3)` : `Get ${2 - inp.recs} more recommendation letter${inp.recs===0?'s':''} (target: 2–3)` });

  // EC tier
  const ecPotential = { none:18, developing:13, moderate:7, 'لا يوجد':18, 'متطور':13, 'متوسط':7 };
  if (ecPotential[inp.ecTier]) actions.push({ pts: ecPotential[inp.ecTier], icon:'⚡', text: isAr ? `طوّر أنشطتك اللاصفية إلى مستوى أعلى: أكبر مكسب محتمل` : `Develop extracurriculars to a higher tier: highest potential gain` });

  // AP courses
  if (inp.ap === 'none' || inp.ap === 'لا يوجد') actions.push({ pts: 4, icon:'📚', text: isAr ? `التسجيل في مواد AP أو متقدمة: +4 نقاط` : `Enroll in AP or advanced courses: +4 pts` });

  // Sort by points descending
  return actions.sort((a,b) => b.pts - a.pts).slice(0, 8);
}

function calculateLiveScore() {
  const inp = getScoreInputs();
  const isAr = typeof currentLang !== 'undefined' && currentLang === 'ar';

  const academic  = calcAcademic(inp);
  const ec        = calcEC(inp);
  const materials = calcMaterials(inp);
  const saudi     = calcSaudi(inp);
  const total     = academic + ec + materials + saudi;

  // Grade label
  let grade, gradeCls;
  if      (total >= 85) { grade = isAr ? 'استثنائي' : 'Exceptional'; gradeCls = 'exceptional'; }
  else if (total >= 70) { grade = isAr ? 'قوي'      : 'Strong';      gradeCls = 'strong'; }
  else if (total >= 55) { grade = isAr ? 'جيد'      : 'Good';        gradeCls = 'good'; }
  else if (total >= 35) { grade = isAr ? 'متطور'    : 'Developing';  gradeCls = 'developing'; }
  else                  { grade = isAr ? 'بداية'    : 'Early Stage'; gradeCls = 'early'; }

  // SVG ring — radius 80, cx=cy=95
  const R = 80, circumference = 2 * Math.PI * R;
  const offset = circumference * (1 - total / 100);
  const fillEl = document.getElementById('scoreRingFill');
  const numEl  = document.getElementById('scoreNum');
  const gradeEl= document.getElementById('scoreGrade');
  if (fillEl) { fillEl.style.strokeDasharray = circumference; fillEl.style.strokeDashoffset = offset; }
  if (numEl)  numEl.textContent = total;
  if (gradeEl){ gradeEl.textContent = grade; gradeEl.className = `score-grade ${gradeCls}`; }

  // Category bars
  const cats = [
    { id:'catAcademic',  score:academic,  max:30 },
    { id:'catEC',        score:ec,        max:25 },
    { id:'catMaterials', score:materials, max:25 },
    { id:'catSaudi',     score:saudi,     max:20 },
  ];
  cats.forEach(({ id, score, max }) => {
    const bar  = document.getElementById(`${id}Bar`);
    const val  = document.getElementById(`${id}Val`);
    if (bar) bar.style.width = `${(score/max)*100}%`;
    if (val) val.textContent = `${score}/${max}`;
  });

  // CPP eligibility strip
  const cppStatus = getCPPStatus(inp);
  const cppEl = document.getElementById('cppStrip');
  if (cppEl) {
    const labels = {
      eligible:     isAr ? '✅ مؤهل لـ CPP أرامكو' : '✅ Aramco CPP Eligible',
      borderline:   isAr ? '⚠️ حدود CPP' : '⚠️ CPP Borderline',
      'not-eligible': isAr ? '❌ غير مؤهل لـ CPP' : '❌ CPP Not Eligible',
    };
    const details = {
      eligible:     isAr ? 'ملفك يستوفي جميع متطلبات CPP' : 'Your profile meets all CPP requirements.',
      borderline:   isAr ? 'تستوفي بعض المعايير. استخدم حاسبة CPP لمعرفة الفجوات.' : 'You meet some criteria. Use the CPP Calculator to see exact gaps.',
      'not-eligible': isAr ? 'لا تستوفي المعايير حالياً. انقر حاسبة CPP للتفاصيل.' : 'Not currently eligible. Click CPP Calculator for full details.',
    };
    cppEl.className = `cpp-eligibility-strip ${cppStatus}`;
    cppEl.innerHTML = `<span style="font-size:1.2rem">${cppStatus==='eligible'?'✅':cppStatus==='borderline'?'⚠️':'❌'}</span>
      <span class="cpp-strip-label ${cppStatus}">${labels[cppStatus]}</span>
      <span class="cpp-strip-detail">${details[cppStatus]}</span>
      <a href="cpp-calculator.html" style="margin-inline-start:auto;font-size:.75rem;font-weight:700;color:var(--gold);text-decoration:none;white-space:nowrap">${isAr?'حاسبة CPP →':'CPP Calculator →'}</a>`;
  }

  // Action cards
  const actions = buildActionCards(inp, { academic, ec, materials, saudi, total });
  const actEl = document.getElementById('scoreActions');
  if (actEl) {
    if (!actions.length) {
      actEl.innerHTML = `<p style="color:var(--text-muted);font-size:.85rem">${isAr ? 'أدخل بياناتك أعلاه لرؤية خطوات التحسين.' : 'Fill in your profile above to see improvement actions.'}</p>`;
    } else {
      actEl.innerHTML = actions.map((a,i) =>
        `<div class="score-action-card" style="animation-delay:${i*.05}s">
          <span class="score-action-icon">${a.icon}</span>
          <span class="score-action-text">${a.text}</span>
          <span class="score-action-pts">+${a.pts}</span>
        </div>`).join('');
    }
  }
}

function scoreShare() {
  const isAr = typeof currentLang !== 'undefined' && currentLang === 'ar';
  const score = document.getElementById('scoreNum')?.textContent || '—';
  const grade = document.getElementById('scoreGrade')?.textContent || '';
  const text = isAr
    ? `درجة ملفي الجامعي: ${score}/100 (${grade}) 📊 تحقق من ملفك على دليل: https://daleel-beta.vercel.app/profile-score.html`
    : `My college profile score: ${score}/100 (${grade}) 📊 Check yours on دليل: https://daleel-beta.vercel.app/profile-score.html`;
  if (navigator.share) {
    navigator.share({ title: 'My Profile Score — دليل', text });
  } else {
    navigator.clipboard?.writeText(text).then(() => alert(isAr ? 'تم النسخ!' : 'Copied!'));
  }
}

function submitScoreAI() {
  const inp = getScoreInputs();
  const isAr = typeof currentLang !== 'undefined' && currentLang === 'ar';
  const total = calcAcademic(inp) + calcEC(inp) + calcMaterials(inp) + calcSaudi(inp);
  const cppStatus = getCPPStatus(inp);

  const profile = `GPA: ${inp.gpa}%, Math/Sci GPA: ${inp.mathGpa}%, SAT Math: ${inp.satMath || 'not taken'}, SAT Total: ${inp.satTotal || 'not taken'}, Qudurat: ${inp.qudurat || 'not taken'}, School: ${inp.school}, Major: ${inp.major || 'undecided'}, EC tier: ${inp.ecTier}, Personal Statement: ${inp.ps}, Recs: ${inp.recs}, AP courses: ${inp.ap}, Overall score: ${total}/100, CPP status: ${cppStatus}`;

  const userMsg = isAr
    ? `ملفي الأكاديمي:\n${profile}\n\nأعطني تحليلاً معمّقاً صادقاً لملفي مع خطوات محددة لتحسين كل فئة.`
    : `My academic profile:\n${profile}\n\nGive me an honest, specific deep analysis of my profile with concrete steps to improve each category.`;

  const resultEl = document.getElementById('scoreAIResult');
  const loadEl   = document.getElementById('scoreAILoad');
  if (!resultEl || typeof callAI !== 'function') return;

  if (loadEl) loadEl.style.display = '';
  resultEl.style.display = 'none';

  callAI(
    [{ role:'system', content:`You are Daleel, a Saudi student college advisor. Analyze this student's profile honestly and give specific, actionable advice for improvement. Be direct. ${isAr ? 'Respond in Arabic only.' : 'Respond in English only.'}` },
     { role:'user', content: userMsg }],
    (token) => {
      if (loadEl) loadEl.style.display = 'none';
      resultEl.style.display = '';
      resultEl.textContent = (resultEl.textContent || '') + token;
    },
    () => { if (loadEl) loadEl.style.display = 'none'; resultEl.style.display = ''; },
    (err) => { if (loadEl) loadEl.style.display = 'none'; resultEl.style.display = ''; resultEl.textContent = `❌ ${err.message}`; }
  );
}

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('scoreNum')) return;

  // Wire live calculation to all inputs
  document.querySelectorAll('#psGpa,#psMathGpa,#psSatMath,#psSatTotal,#psQudurat,#psSchool,#psMajor,#psEcNum,#psEcTier,#psPS,#psRecs,#psAP').forEach(el => {
    el.addEventListener('input',  calculateLiveScore);
    el.addEventListener('change', calculateLiveScore);
  });

  // Initialize ring display
  const R = 80, circumference = 2 * Math.PI * R;
  const fillEl = document.getElementById('scoreRingFill');
  if (fillEl) { fillEl.style.strokeDasharray = circumference; fillEl.style.strokeDashoffset = circumference; }

  calculateLiveScore();
});
