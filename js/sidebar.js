/**
 * Sidebar Navigation — Injected on all pages
 */

function initSidebar() {
  // Don't show the sidebar on the auth/login page
  if (window.location.pathname.includes('auth.html')) {
    document.body.classList.add('auth-page');
    return;
  }

  // Inject sidebar HTML
  const sidebarHTML = `
    <div class="sidebar" id="daleel-sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <span class="logo-arabic">دليل</span>
          <span class="logo-dot">.</span>
        </div>
        <button class="sidebar-close" onclick="toggleSidebar()" title="Close menu">✕</button>
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
          <a href="/college-list.html" class="sidebar-link">🎓<span>College List</span></a>
          <a href="/college-search.html" class="sidebar-link">🔍<span>College Search</span></a>
          <a href="/commonapp-ready.html" class="sidebar-link">⚡<span>Common App Ready</span></a>
          <a href="/ec-advisor.html" class="sidebar-link">🏆<span>EC Portfolio</span></a>
          <a href="/essay-advisor.html" class="sidebar-link">✍️<span>Essay Advisor</span></a>
        </div>

        <div class="sidebar-section">
          <h5 class="sidebar-section-title">TOOLS</h5>
          <a href="/profile-score.html" class="sidebar-link">📊<span>Profile Score</span></a>
          <a href="/scholarships.html" class="sidebar-link">💰<span>Scholarships</span></a>
          <a href="/cpp-calculator.html" class="sidebar-link">📈<span>CPP Calculator</span></a>
          <a href="/sat-guide.html" class="sidebar-link">📝<span>Test Guide</span></a>
        </div>

        <div class="sidebar-section">
          <h5 class="sidebar-section-title">DISCOVER</h5>
          <a href="/my-list.html" class="sidebar-link">📋<span>My List <span class="sidebar-badge" id="sidebarBadge">0</span></span></a>
          <a href="/community.html" class="sidebar-link">💬<span>Community</span></a>
          <a href="/tips-feed.html" class="sidebar-link">💡<span>Tips</span></a>
        </div>

        <div class="sidebar-section">
          <h5 class="sidebar-section-title">TRACK</h5>
          <a href="/application-tracker.html" class="sidebar-link">✅<span>App Tracker</span></a>
          <a href="/countdown.html" class="sidebar-link">⏰<span>Countdown</span></a>
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
  // Read the session directly so this works even on pages without auth.js
  let userEmail = (typeof daleel !== 'undefined' && daleel.auth?.getSessionUser?.()) || null;
  if (!userEmail) {
    try {
      const session = JSON.parse(localStorage.getItem('daleel_session') || 'null');
      userEmail = session?.email || null;
    } catch (e) {}
  }

  const profileName = document.getElementById('sidebarProfileName');
  if (profileName) {
    profileName.textContent = userEmail ? userEmail.split('@')[0] : 'Guest';
  }

  // Update My List badge
  const list = (typeof getMyList === 'function' ? getMyList() : []) || [];
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

/**
 * Auto-collapse sidebar after a delay when mouse leaves
 */
let sidebarHoverTimeout;

function setupSidebarHover() {
  const sidebar = document.getElementById('daleel-sidebar');
  if (!sidebar) return;

  // Start collapsed
  sidebar.classList.add('collapsed');

  sidebar.addEventListener('mouseenter', () => {
    clearTimeout(sidebarHoverTimeout);
    sidebar.classList.remove('collapsed');
  });

  sidebar.addEventListener('mouseleave', () => {
    sidebarHoverTimeout = setTimeout(() => {
      sidebar.classList.add('collapsed');
    }, 300);
  });
}

/**
 * Auto-start sidebar in collapsed state
 */
function restoreSidebarState() {
  const sidebar = document.getElementById('daleel-sidebar');
  if (sidebar) {
    sidebar.classList.add('collapsed');
  }
}

// Initialize sidebar on page load
document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  setTimeout(() => {
    restoreSidebarState();
    setupSidebarHover();
  }, 50); // Defer slightly to ensure sidebar is rendered
});
