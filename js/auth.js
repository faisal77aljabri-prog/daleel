/**
 * Daleel Auth Module — Supabase Authentication
 * Handles sign-up, sign-in, sign-out, and session persistence.
 * Requires SUPABASE_URL and SUPABASE_ANON_KEY in Vercel env.
 */

const SUPABASE_URL = import.meta?.env?.VITE_SUPABASE_URL || localStorage.getItem('supabase_url') || '';
const SUPABASE_ANON_KEY = import.meta?.env?.VITE_SUPABASE_ANON_KEY || localStorage.getItem('supabase_key') || '';

let supabaseClient = null;

/**
 * Initialize Supabase client. If keys are available, set up auth listener.
 */
async function initAuth() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('Supabase keys not configured. Auth disabled.');
    // For now, show a dev notice
    if (document.body) {
      const notice = document.createElement('div');
      notice.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#ffd700;padding:10px;z-index:9999;text-align:center;font-size:12px;color:#333';
      notice.textContent = '⚠️ Supabase keys not configured. Add SUPABASE_URL and SUPABASE_ANON_KEY to Vercel env.';
      document.body.insertBefore(notice, document.body.firstChild);
    }
    return;
  }

  // Import Supabase JS library (loaded from CDN if not bundled)
  if (!window.supabase) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.onload = () => {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      setupAuthListeners();
    };
    document.head.appendChild(script);
  } else {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    setupAuthListeners();
  }
}

/**
 * Listen for auth state changes and update UI accordingly.
 */
function setupAuthListeners() {
  if (!supabaseClient) return;

  supabaseClient.auth.onAuthStateChange((event, session) => {
    const token = session?.access_token;
    if (token) {
      localStorage.setItem('daleel_auth_token', token);
      localStorage.setItem('daleel_user_id', session.user.id);
      localStorage.setItem('daleel_user_email', session.user.email);
      onUserSignedIn(session.user);
    } else {
      localStorage.removeItem('daleel_auth_token');
      localStorage.removeItem('daleel_user_id');
      localStorage.removeItem('daleel_user_email');
      onUserSignedOut();
    }
  });
}

/**
 * Called when user successfully signs up or signs in.
 */
function onUserSignedIn(user) {
  // Redirect to profile or home based on context
  const nextUrl = sessionStorage.getItem('auth_redirect') || '/profile.html';
  sessionStorage.removeItem('auth_redirect');
  location.href = nextUrl;
}

/**
 * Called when user signs out.
 */
function onUserSignedOut() {
  // Redirect to auth page
  if (window.location.pathname !== '/auth.html') {
    location.href = '/auth.html';
  }
}

/**
 * Get current signed-in user (from localStorage or Supabase session).
 */
async function getCurrentUser() {
  const token = localStorage.getItem('daleel_auth_token');
  const userId = localStorage.getItem('daleel_user_id');
  const email = localStorage.getItem('daleel_user_email');

  if (token && userId && email) {
    return { id: userId, email };
  }

  if (supabaseClient) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    return user;
  }

  return null;
}

/**
 * Sign up with email and password.
 */
async function signUp(email, password) {
  if (!supabaseClient) throw new Error('Supabase not initialized');
  if (password.length < 6) throw new Error('Password must be at least 6 characters');

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

/**
 * Sign in with email and password.
 */
async function signIn(email, password) {
  if (!supabaseClient) throw new Error('Supabase not initialized');

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

/**
 * Sign out the current user.
 */
async function signOut() {
  if (!supabaseClient) throw new Error('Supabase not initialized');

  const { error } = await supabaseClient.auth.signOut();
  if (error) throw error;
}

/**
 * Check if user is authenticated.
 */
async function isAuthenticated() {
  const user = await getCurrentUser();
  return !!user;
}

/**
 * Auth page: Switch between sign-up and sign-in forms.
 */
function switchForm(form) {
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  document.querySelectorAll('.auth-error').forEach(e => e.classList.remove('show'));

  if (form === 'signup') {
    document.getElementById('signupForm').classList.add('active');
  } else {
    document.getElementById('signinForm').classList.add('active');
  }
}

/**
 * Auth page: Handle sign-up submission.
 */
async function handleSignUp(e) {
  e.preventDefault();
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  const passwordConfirm = document.getElementById('signupPasswordConfirm').value;
  const errorEl = document.getElementById('signupError');
  const btn = document.getElementById('signupBtn');

  errorEl.classList.remove('show');

  if (password !== passwordConfirm) {
    errorEl.textContent = 'Passwords do not match';
    errorEl.classList.add('show');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="auth-loading"></span>Creating account...';

  try {
    await signUp(email, password);
    // Success — auth listener will handle redirect
  } catch (err) {
    errorEl.textContent = err.message || 'Failed to create account';
    errorEl.classList.add('show');
    btn.disabled = false;
    btn.innerHTML = 'Create Account';
  }
}

/**
 * Auth page: Handle sign-in submission.
 */
async function handleSignIn(e) {
  e.preventDefault();
  const email = document.getElementById('signinEmail').value;
  const password = document.getElementById('signinPassword').value;
  const errorEl = document.getElementById('signinError');
  const btn = document.getElementById('signinBtn');

  errorEl.classList.remove('show');
  btn.disabled = true;
  btn.innerHTML = '<span class="auth-loading"></span>Signing in...';

  try {
    await signIn(email, password);
    // Success — auth listener will handle redirect
  } catch (err) {
    errorEl.textContent = err.message || 'Failed to sign in';
    errorEl.classList.add('show');
    btn.disabled = false;
    btn.innerHTML = 'Sign In';
  }
}

/**
 * Protect a page: redirect unauthenticated users to auth page.
 */
async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    sessionStorage.setItem('auth_redirect', window.location.pathname);
    location.href = '/auth.html';
  }
  return user;
}

/**
 * Initialize auth on page load (for auth.html only).
 */
document.addEventListener('DOMContentLoaded', () => {
  initAuth();

  // Only set up form handlers on auth.html
  if (window.location.pathname.includes('auth.html')) {
    const signupForm = document.getElementById('signupForm');
    const signinForm = document.getElementById('signinForm');

    if (signupForm) signupForm.addEventListener('submit', handleSignUp);
    if (signinForm) signinForm.addEventListener('submit', handleSignIn);
  }
});

// Export for use in other modules
window.daleel = window.daleel || {};
window.daleel.auth = {
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  isAuthenticated,
  requireAuth,
  initAuth,
};
