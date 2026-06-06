/**
 * Daleel Auth Module — Local Storage Accounts
 * Simple email + password auth using localStorage. No backend needed.
 * WARNING: Not secure for real passwords. For testing/demo only.
 */

const AUTH_USERS_KEY = 'daleel_users'; // Storage for all accounts: {email: {password_hash, created}}
const AUTH_SESSION_KEY = 'daleel_session'; // Current user: {email, sessionToken}

/**
 * Simple hash for passwords (NOT cryptographically secure, demo only)
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return 'h_' + Math.abs(hash).toString(36);
}

/**
 * Get all user accounts from localStorage
 */
function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || '{}');
  } catch {
    return {};
  }
}

/**
 * Save all user accounts to localStorage
 */
function saveUsers(users) {
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
}

/**
 * Get current session user
 */
function getSessionUser() {
  try {
    const session = JSON.parse(localStorage.getItem(AUTH_SESSION_KEY) || 'null');
    return session ? session.email : null;
  } catch {
    return null;
  }
}

/**
 * Sign up with email + password
 */
function signUp(email, password) {
  if (!email || !password) throw new Error('Email and password required');
  if (password.length < 6) throw new Error('Password must be at least 6 characters');

  const users = getUsers();
  if (users[email]) throw new Error('Account already exists');

  users[email] = {
    password_hash: simpleHash(password),
    created: new Date().toISOString(),
  };
  saveUsers(users);

  // Auto sign-in after signup
  signIn(email, password);
}

/**
 * Sign in with email + password
 */
function signIn(email, password) {
  if (!email || !password) throw new Error('Email and password required');

  const users = getUsers();
  const user = users[email];

  if (!user) throw new Error('Account not found');
  if (user.password_hash !== simpleHash(password)) throw new Error('Incorrect password');

  // Create session
  const session = {
    email,
    sessionToken: Math.random().toString(36).substr(2) + Date.now().toString(36),
    signedInAt: new Date().toISOString(),
  };
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  console.log('Signed in:', email);

  // Redirect
  setTimeout(() => {
    location.href = '/profile.html';
  }, 300);
}

/**
 * Sign out
 */
function signOut() {
  localStorage.removeItem(AUTH_SESSION_KEY);
  console.log('Signed out');
  location.href = '/auth.html';
}

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
  return !!getSessionUser();
}

/**
 * Protect a page: redirect to auth if not signed in
 */
function requireAuth() {
  if (!isAuthenticated()) {
    sessionStorage.setItem('auth_redirect', window.location.pathname);
    location.href = '/auth.html';
  }
  return getSessionUser();
}

/**
 * Switch between sign-up and sign-in forms (and update tab styling)
 */
function switchForm(form) {
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  document.querySelectorAll('.auth-error').forEach(e => e.classList.remove('show'));
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));

  if (form === 'signup') {
    document.getElementById('signupForm')?.classList.add('active');
    document.querySelectorAll('.auth-tab')[0]?.classList.add('active');
  } else {
    document.getElementById('signinForm')?.classList.add('active');
    document.querySelectorAll('.auth-tab')[1]?.classList.add('active');
  }
}

/**
 * Initialize on page load
 */
document.addEventListener('DOMContentLoaded', () => {
  updateAuthNav();

  if (window.location.pathname.includes('auth.html')) {
    const signupForm = document.getElementById('signupForm');
    const signinForm = document.getElementById('signinForm');

    if (signupForm) {
      signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const confirm = document.getElementById('signupPasswordConfirm').value;
        const errorEl = document.getElementById('signupError');
        const btn = document.getElementById('signupBtn');

        errorEl.classList.remove('show');

        if (password !== confirm) {
          errorEl.textContent = 'Passwords do not match';
          errorEl.classList.add('show');
          return;
        }

        btn.disabled = true;
        btn.innerHTML = '<span class="auth-loading"></span>Creating account...';

        try {
          signUp(email, password);
        } catch (err) {
          errorEl.textContent = err.message;
          errorEl.classList.add('show');
          btn.disabled = false;
          btn.innerHTML = 'Create Account';
        }
      });
    }

    if (signinForm) {
      signinForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('signinEmail').value;
        const password = document.getElementById('signinPassword').value;
        const errorEl = document.getElementById('signinError');
        const btn = document.getElementById('signinBtn');

        errorEl.classList.remove('show');
        btn.disabled = true;
        btn.innerHTML = '<span class="auth-loading"></span>Signing in...';

        try {
          signIn(email, password);
        } catch (err) {
          errorEl.textContent = err.message;
          errorEl.classList.add('show');
          btn.disabled = false;
          btn.innerHTML = 'Sign In';
        }
      });
    }
  }
});

/**
 * Show "My Profile" link in navbar if user is signed in
 */
function updateAuthNav() {
  const navProfile = document.getElementById('navProfile');
  const userEmail = getSessionUser();

  if (navProfile) {
    if (userEmail) {
      navProfile.style.display = 'inline-block';
      navProfile.href = '/profile.html';
      navProfile.textContent = `👤 ${userEmail.split('@')[0]}`;
      navProfile.onclick = null;
    } else {
      navProfile.style.display = 'none';
    }
  }
}

// Export for use
window.daleel = window.daleel || {};
window.daleel.auth = {
  signUp,
  signIn,
  signOut,
  getSessionUser,
  isAuthenticated,
  requireAuth,
  updateAuthNav,
};
