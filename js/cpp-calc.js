/* Daleel — CPP Eligibility Calculator (pure logic, no AI) */

let cppTestMode = 'sat'; // 'sat' | 'qudurat'

function cppSetTestMode(mode) {
  cppTestMode = mode;
  document.getElementById('satField').style.display  = mode === 'sat' ? '' : 'none';
  document.getElementById('qField').style.display    = mode === 'qudurat' ? '' : 'none';
  document.querySelectorAll('.cpp-test-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  calculateCPP();
}

function calculateCPP() {
  const isAr  = typeof currentLang !== 'undefined' && currentLang === 'ar';
  const TL    = (typeof T !== 'undefined' && T[isAr ? 'ar' : 'en']?.cpp) || {};
  const gpa      = parseFloat(document.getElementById('cppGpa')?.value) || 0;
  const mathGpa  = parseFloat(document.getElementById('cppMathGpa')?.value) || 0;
  const school   = document.getElementById('cppSchool')?.value || '';
  const satMath  = parseFloat(document.getElementById('cppSat')?.value) || 0;
  const qudurat  = parseFloat(document.getElementById('cppQudurat')?.value) || 0;
  const hasWaiver = document.getElementById('cppWaiver')?.checked || false;

  // Nothing filled yet — hide result
  if (!gpa && !mathGpa && !school) {
    document.getElementById('cppResult').style.display = 'none';
    return;
  }

  const isIntl = school.includes('International') || school.includes('Out-of-Kingdom') || school.includes('دولية') || school.includes('خارج');
  const isSaudiPublic = school.includes('Public') || school.includes('حكومية');

  // Per-criterion evaluation
  const criteria = {
    gpa:       { pass: gpa >= 85,     val: gpa,      need: 85,  gap: Math.max(0, 85 - gpa).toFixed(1) },
    mathGpa:   { pass: mathGpa >= 85, val: mathGpa,  need: 85,  gap: Math.max(0, 85 - mathGpa).toFixed(1) },
    test:      { pass: (cppTestMode === 'sat' ? satMath >= 630 : qudurat >= 90), satMath, qudurat },
    school:    { pass: isIntl,         isSaudi: isSaudiPublic },
  };

  const metCount = [criteria.gpa.pass, criteria.mathGpa.pass, criteria.test.pass, criteria.school.pass].filter(Boolean).length;
  let overallStatus = metCount === 4 ? 'eligible' : metCount >= 2 ? 'borderline' : 'not-eligible';
  if (isSaudiPublic) overallStatus = 'not-eligible'; // school type alone blocks CPP

  // Build criteria HTML
  const criteriaItems = buildCriteriaHTML(criteria, isAr, TL);

  // Build improvement tips
  const improvements = buildImprovements(criteria, isAr, metCount);

  // Build result HTML
  let html = '';

  // Main result box
  const titles = { eligible: TL.eligibleTitle || '✅ Eligible', borderline: TL.borderlineTitle || '⚠️ Borderline', 'not-eligible': TL.notEligibleTitle || '❌ Not Eligible' };
  const subs   = { eligible: TL.eligibleSub || '', borderline: TL.borderlineSub || '', 'not-eligible': TL.notEligibleSub || '' };
  html += `<div class="cpp-result-box ${overallStatus}">
    <div class="cpp-result-title">${titles[overallStatus]}</div>
    <div class="cpp-result-sub">${subs[overallStatus]}</div>
    <div class="cpp-criteria-list">${criteriaItems}</div>
  </div>`;

  // Waiver box
  if (hasWaiver && overallStatus !== 'not-eligible') {
    html += `<div class="cpp-waiver-box">
      <div class="cpp-waiver-title">${TL.waiverTitle || '🎓 CPP Prep-Year Waiver Available'}</div>
      <div class="cpp-waiver-text">${TL.waiverText || 'With an unconditional Top-30 offer, you can skip the CPP prep year and go directly to university. Inform Saudi Aramco HR during the application process.'}</div>
    </div>`;
  }

  // Improvement tips
  if (improvements.length) {
    html += `<div class="callout callout-gold" style="margin-bottom:20px">
      <span class="callout-icon">💡</span>
      <div class="callout-content">
        <h4>${TL.improveTitle || 'What You Can Do to Improve'}</h4>
        <div class="cpp-improve-list">${improvements.map(i => `<div class="cpp-improve-item"><span class="cpp-improve-icon">${i.icon}</span><span>${i.text}</span></div>`).join('')}</div>
      </div>
    </div>`;
  }

  // Share button
  html += `<div style="margin-bottom:24px">
    <button class="cpp-share-btn" onclick="cppShare('${overallStatus}')">
      ${TL.shareBtn || '📤 Share My Result'}
    </button>
  </div>`;

  const resultEl = document.getElementById('cppResult');
  resultEl.innerHTML = html;
  resultEl.style.display = '';
}

function buildCriteriaHTML(c, isAr, TL) {
  const labels = {
    gpa:     TL.criteriaGPA     || 'Cumulative GPA 85%+',
    mathGpa: TL.criteriaMathGPA || 'Math & Science GPA 85%+',
    test:    TL.criteriaTest    || 'SAT Math 630+ OR Qudurat 90+',
    school:  TL.criteriaSchool  || 'International school graduate',
  };

  let html = '';

  // GPA
  if (c.gpa.val > 0) {
    if (c.gpa.pass) {
      html += criterion('pass', '✅', labels.gpa, isAr
        ? `معدلك ${c.gpa.val}% يستوفي الحد الأدنى 85%`
        : `Your GPA ${c.gpa.val}% meets the 85% minimum.`);
    } else {
      html += criterion('fail', '❌', labels.gpa, isAr
        ? `معدلك ${c.gpa.val}% — تحتاج 85%. الفجوة: ${c.gpa.gap} نقطة مئوية.`
        : `Your GPA is ${c.gpa.val}% — you need 85%. Gap: ${c.gpa.gap} percentage points.`);
    }
  }

  // Math GPA
  if (c.mathGpa.val > 0) {
    if (c.mathGpa.pass) {
      html += criterion('pass', '✅', labels.mathGpa, isAr
        ? `معدل الرياضيات والعلوم ${c.mathGpa.val}% يستوفي الحد الأدنى`
        : `Your Math & Science GPA ${c.mathGpa.val}% meets the 85% minimum.`);
    } else {
      html += criterion('fail', '❌', labels.mathGpa, isAr
        ? `معدل الرياضيات والعلوم ${c.mathGpa.val}% — تحتاج 85%. الفجوة: ${c.mathGpa.gap} نقطة مئوية.`
        : `Your Math & Science GPA is ${c.mathGpa.val}% — you need 85%. Gap: ${c.mathGpa.gap} percentage points.`);
    }
  }

  // Test score
  if (c.test.satMath > 0 || c.test.qudurat > 0) {
    if (c.test.pass) {
      const val = cppTestMode === 'sat' ? `SAT Math ${c.test.satMath}` : `Qudurat ${c.test.qudurat}/100`;
      html += criterion('pass', '✅', labels.test, isAr
        ? `${val} — يستوفي متطلب الاختبار`
        : `${val} — meets the test requirement.`);
    } else {
      if (cppTestMode === 'sat' && c.test.satMath > 0) {
        const gap = Math.max(0, 630 - c.test.satMath);
        html += criterion('gap', '⚠️', labels.test, isAr
          ? `SAT Math ${c.test.satMath} — تحتاج 630. الفجوة: ${gap} نقطة. أو يمكنك بدلاً من ذلك الوصول إلى قدرات 90+.`
          : `SAT Math ${c.test.satMath} — you need 630. Gap: ${gap} points. Alternatively, Qudurat 90+ would also qualify.`);
      } else if (c.test.qudurat > 0) {
        const gap = Math.max(0, 90 - c.test.qudurat);
        html += criterion('gap', '⚠️', labels.test, isAr
          ? `قدرات ${c.test.qudurat}/100 — تحتاج 90. الفجوة: ${gap} نقطة. أو SAT Math 630+ مقبول أيضاً.`
          : `Qudurat ${c.test.qudurat}/100 — you need 90. Gap: ${gap} points. SAT Math 630+ also qualifies.`);
      }
    }
  }

  // School type
  if (c.school.isSaudi) {
    html += criterion('fail', '❌', labels.school, isAr
      ? 'المدارس الحكومية السعودية غير مؤهلة لـ CPP. يتطلب CPP خريج مدرسة دولية.'
      : 'Saudi public school graduates are not eligible for CPP. CPP requires international school graduation.');
  } else if (c.school.pass) {
    html += criterion('pass', '✅', labels.school, isAr
      ? 'مدرستك الدولية مؤهلة لـ CPP.'
      : 'Your international school type qualifies for CPP.');
  }

  return html;
}

function criterion(type, icon, label, detail) {
  return `<div class="cpp-criterion ${type}">
    <span class="cpp-criterion-icon">${icon}</span>
    <span class="cpp-criterion-text"><strong>${label}</strong>${detail}</span>
  </div>`;
}

function buildImprovements(c, isAr, metCount) {
  const tips = [];
  if (!c.gpa.pass && c.gpa.val > 0) {
    tips.push({ icon: '📈', text: isAr
      ? `ركّز على المواد الرئيسية لرفع المعدل التراكمي من ${c.gpa.val}% إلى 85%+. كل درجة مهمة في السنة الأخيرة.`
      : `Focus on core subjects to raise your cumulative GPA from ${c.gpa.val}% to 85%+. Every point in your final year counts.` });
  }
  if (!c.mathGpa.pass && c.mathGpa.val > 0) {
    tips.push({ icon: '🧮', text: isAr
      ? `معدل الرياضيات والعلوم يحتاج تحسيناً من ${c.mathGpa.val}% إلى 85%+. اطلب مساعدة إضافية في الرياضيات والفيزياء والكيمياء.`
      : `Your Math & Science GPA needs to move from ${c.mathGpa.val}% to 85%+. Seek extra support in Math, Physics, and Chemistry.` });
  }
  if (!c.test.pass) {
    if (cppTestMode === 'sat') {
      const gap = c.test.satMath > 0 ? Math.max(0, 630 - c.test.satMath) : 630;
      tips.push({ icon: '📝', text: isAr
        ? `اعمل على رفع SAT Math بمقدار ${gap} نقطة إلى 630+. استهدف 650+ كهامش أمان. Khan Academy مجاني ورسمي.`
        : `Work on raising your SAT Math by ${gap} points to 630+. Target 650+ as a safety margin. Khan Academy is free and official.` });
    } else {
      const gap = c.test.qudurat > 0 ? Math.max(0, 90 - c.test.qudurat) : 90;
      tips.push({ icon: '📝', text: isAr
        ? `اعمل على رفع درجة القدرات بمقدار ${gap} نقطة إلى 90+. ممارسة الاختبارات التجريبية بانتظام هي أكثر الطرق فاعلية.`
        : `Work on raising your Qudurat score by ${gap} points to 90+. Regular practice tests are the most effective method.` });
    }
    tips.push({ icon: '🔄', text: isAr
      ? 'SAT Math 630+ أو قدرات 90+ — كلاهما مقبول. إذا كانت درجة القدرات أعلى، قد لا تحتاج SAT.'
      : 'Remember: SAT Math 630+ OR Qudurat 90+ — either qualifies. If your Qudurat is stronger, you may not need the SAT at all for CPP.' });
  }
  if (c.school.isSaudi) {
    tips.push({ icon: '🏫', text: isAr
      ? 'CPP يتطلب الخريج من مدرسة دولية. إذا انتقلت إلى مدرسة دولية قبل التخرج، فقد تتغير أهليتك. راجع أرامكو للتأكد.'
      : 'CPP requires international school graduation. If you transfer to an international school before graduation, your eligibility may change. Check with Aramco HR.' });
  }
  return tips;
}

function cppShare(status) {
  const isAr = typeof currentLang !== 'undefined' && currentLang === 'ar';
  const msgs = {
    eligible:     isAr ? '✅ أنا مؤهل لبرنامج أرامكو CPP! تحقق من أهليتك أنت أيضاً:'    : '✅ I appear eligible for Aramco CPP! Check yours:',
    borderline:   isAr ? '⚠️ أنا على الحدود لبرنامج أرامكو CPP. تحقق من أهليتك:'           : '⚠️ I\'m borderline for Aramco CPP. Check yours:',
    'not-eligible': isAr ? '❌ غير مؤهل لـ CPP حالياً — تحقق من ملفك في دليل:'             : '❌ Not eligible for CPP yet — check your profile on دليل:',
  };
  const text = `${msgs[status]} https://daleel-beta.vercel.app/cpp-calculator.html`;
  if (navigator.share) {
    navigator.share({ title: 'Aramco CPP Eligibility — دليل', text });
  } else {
    navigator.clipboard?.writeText(text).then(() => alert(isAr ? 'تم نسخ الرابط!' : 'Link copied!'));
  }
}

/* Timeline rendered from HTML — no JS needed; called on page init to show timeline */
function initCPPPage() {
  // Set up test mode toggle event listeners
  document.querySelectorAll('.cpp-test-btn').forEach(btn => {
    btn.addEventListener('click', () => cppSetTestMode(btn.dataset.mode));
  });
  // Attach live calculation to all inputs
  document.querySelectorAll('#cppGpa,#cppMathGpa,#cppSchool,#cppSat,#cppQudurat,#cppWaiver').forEach(el => {
    el.addEventListener('input', calculateCPP);
    el.addEventListener('change', calculateCPP);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('cppResult')) initCPPPage();
});
