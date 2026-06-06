/**
 * Daleel Auth Module — Supabase Authentication
 * Handles sign-up, sign-in, sign-out, and session persistence.
 * Requires SUPABASE_URL and SUPABASE_ANON_KEY in Vercel env.
 */

let SUPABASE_URL = localStorage.getItem('supabase_url') || '';
let SUPABASE_ANON_KEY = localStorage.getItem('supabase_key') || '';
let supabaseClient = null;

/**
 * Initialize Supabase client. If keys are available, set up auth listener.
 */
async function initAuth() {
  try {
    // Fetch config from API endpoint
    const configRes = await fetch('/api/config');
    const config = await configRes.json();
    SUPABASE_URL = config.supabaseUrl;
    SUPABASE_ANON_KEY = config.supabaseAnonKey;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Supabase keys not returned from config endpoint');
    }

    // Cache for next time
    localStorage.setItem('supabase_url', SUPABASE_URL);
    localStorage.setItem('supabase_key', SUPABASE_ANON_KEY);
  } catch (err) {
    console.error('Failed to load Supabase config:', err);
    if (document.body) {
      const notice = document.createElement('div');
      notice.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#ff4444;padding:10px;z-index:9999;text-align:center;font-size:12px;color:white';
      notice.textContent = '❌ Supabase configuration failed. Check Vercel env vars and redeploy.';
      document.body.insertBefore(notice, document.body.firstChild);
    }
    return;
  }

  // Load Supabase JS library from CDN
  if (!window.supabase) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.onload = () => {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      setupAuthListeners();
    };
    script.onerror = () => {
      console.error('Failed to load Supabase JS library');
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
  if (!supabaseClient) {
    console.error('setupAuthListeners: supabaseClient not initialized');
    return;
  }

  console.log('Auth listeners setup. Checking initial session...');
  supabaseClient.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event, 'Session:', session?.user?.email);
    const token = session?.access_token;
    if (token) {
      console.log('User has valid token, signing in:', session.user.email);
      localStorage.setItem('daleel_auth_token', token);
      localStorage.setItem('daleel_user_id', session.user.id);
      localStorage.setItem('daleel_user_email', session.user.email);
      onUserSignedIn(session.user);
    } else {
      console.log('No valid token, signing out');
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
  console.log('onUserSignedIn called for:', user.email);
  // After verification or sign-in, go to profile hub
  const nextUrl = sessionStorage.getItem('auth_redirect') || '/profile.html';
  const redirect = sessionStorage.getItem('auth_redirect');
  sessionStorage.removeItem('auth_redirect');
  console.log('Auth redirect value:', redirect);
  console.log('Going to:', nextUrl);
  // Use a small delay to ensure session is set
  setTimeout(() => {
    console.log('Redirecting to:', nextUrl);
    location.href = nextUrl;
  }, 500);
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
  // First check Supabase session (most reliable after email verification)
  if (supabaseClient) {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) {
        console.log('Found user from Supabase:', user.email);
        return user;
      }
    } catch (err) {
      console.error('Error getting Supabase user:', err);
    }
  }

  // Fall back to localStorage
  const token = localStorage.getItem('daleel_auth_token');
  const userId = localStorage.getItem('daleel_user_id');
  const email = localStorage.getItem('daleel_user_email');

  if (token && userId && email) {
    console.log('Found user from localStorage:', email);
    return { id: userId, email };
  }

  console.log('No user found');
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
    if (!supabaseClient) {
      throw new Error('Supabase not initialized. Check console for errors.');
    }
    await signUp(email, password);
    // Success — auth listener will handle redirect
  } catch (err) {
    console.error('Sign-up error:', err);
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
    if (!supabaseClient) {
      throw new Error('Supabase not initialized. Check console for errors.');
    }
    await signIn(email, password);
    // Success — auth listener will handle redirect
  } catch (err) {
    console.error('Sign-in error:', err);
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
