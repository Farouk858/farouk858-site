// js/auth.js — global login helper (Shift + A) and token capture
const WORKER_URL = 'https://858-builder.faroukalaofa.workers.dev';

// Capture token when Worker redirects back with #access_token=...
(function captureTokenFromHash() {
  if (location.hash && location.hash.includes('access_token=')) {
    const m = location.hash.match(/access_token=([^&]+)/);
    if (m) {
      localStorage.setItem('gh_token', decodeURIComponent(m[1]));
      history.replaceState({}, document.title, location.pathname + location.search);
      console.log('[auth] GitHub token stored.');
    }
  }
})();

// Keyboard shortcut: Shift + A → start OAuth login
document.addEventListener('keydown', (e) => {
  if (e.shiftKey && e.key.toLowerCase() === 'a') {
    e.preventDefault();
    window.location.href = `${WORKER_URL}/login`;
  }
});
