/**
 * Sidebar Navigation — Injected on all pages
 */

function initSidebar() {
  // Inject sidebar HTML
  const sidebarHTML = `
    <div class="sidebar" id="daleel-sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <span class="logo-arabic">دليل</span>
          <span class="logo-dot">.</span>
        </div>
        <button class="sidebar-close" onclick="toggleSidebar()">✕</button>
      </div>

      <div class="sidebar-profile">
        <div class="sidebar-profile-avatar">👤</div>
        <div>
          <div class="sidebar-profile-name" id="sidebarProfileName">Guest</div>
          <a href="/profile.html" class="sidebar-profile-link">View Profile →</a>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div class="sidebar-section">
          <h5 class="sidebar-section-title">BUILD</h5>
          <a href="/college-list.html" class="sidebar-link">🎓 College List</a>
          <a href="/ec-advisor.html" class="sidebar-link">⚡ EC Portfolio</a>
          <a href="/essay-advisor.html" class="sidebar-link">✍️ Essay Advisor</a>
        </div>

        <div class="sidebar-section">
          <h5 class="sidebar-section-title">TOOLS</h5>
          <a href="/profile-score.html" class="sidebar-link">📊 Profile Score</a>
          <a href="/scholarships.html" class="sidebar-link">💰 Scholarships</a>
          <a href="/cpp-calculator.html" class="sidebar-link">📈 CPP Calculator</a>
          <a href="/sat-guide.html" class="sidebar-link">📝 Test Guide</a>
        </div>

        <div class="sidebar-section">
          <h5 class="sidebar-section-title">DISCOVER</h5>
          <a href="/my-list.html" class="sidebar-link">📋 My List <span class="sidebar-badge" id="sidebarBadge">0</span></a>
          <a href="/community.html" class="sidebar-link">💬 Community</a>
          <a href="/tips-feed.html" class="sidebar-link">💡 Tips</a>
        </div>

        <div class="sidebar-section">
          <h5 class="sidebar-section-title">TRACK</h5>
          <a href="/application-tracker.html" class="sidebar-link">✅ App Tracker</a>
          <a href="/countdown.html" class="sidebar-link">⏰ Countdown</a>
        </div>
      </nav>

      <div class="sidebar-footer">
        <button class="sidebar-btn" onclick="toggleLanguage()">عربي / EN</button>
        <button class="sidebar-btn" onclick="handleSidebarSignOut()">🚪 Sign Out</button>
      </div>
    </div>

    <div class="sidebar-overlay" id="sidebarOverlay" onclick="toggleSidebar()"></div>
  `;

  // Inject sidebar into page
  if (!document.getElementById('daleel-sidebar')) {
    document.body.insertAdjacentHTML('afterbegin', sidebarHTML);
    updateSidebarProfile();
  }

  // Add sidebar toggle button to navbar if it doesn't exist
  const navbar = document.querySelector('.navbar');
  if (navbar && !navbar.querySelector('.sidebar-toggle')) {
    const toggle = document.createElement('button');
    toggle.className = 'sidebar-toggle';
    toggle.innerHTML = '☰';
    toggle.onclick = toggleSidebar;
    navbar.querySelector('.nav-right').insertBefore(toggle, navbar.querySelector('.hamburger'));
  }
}

/**
 * Toggle sidebar visibility
 */
function toggleSidebar() {
  const sidebar = document.getElementById('daleel-sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar?.classList.toggle('open');
  overlay?.classList.toggle('open');
}

/**
 * Update sidebar profile info
 */
function updateSidebarProfile() {
  const userEmail = (typeof daleel !== 'undefined' && daleel.auth?.getSessionUser?.()) || localStorage.getItem('daleel_user_email');
  const profileName = document.getElementById('sidebarProfileName');

  if (userEmail && profileName) {
    profileName.textContent = userEmail.split('@')[0];
  }

  // Update My List badge
  const list = getMyList?.() || [];
  const badge = document.getElementById('sidebarBadge');
  if (badge) badge.textContent = list.length;
}

/**
 * Sign out from sidebar
 */
function handleSidebarSignOut() {
  if (confirm('Sign out?')) {
    if (typeof daleel !== 'undefined' && daleel.auth?.signOut) {
      daleel.auth.signOut();
    } else {
      localStorage.removeItem('daleel_session');
      localStorage.removeItem('daleel_user_email');
      location.href = '/auth.html';
    }
  }
}

// Initialize sidebar on page load
document.addEventListener('DOMContentLoaded', initSidebar);
