// js/auth.js — global login helper with iframe support + visible buttons

const WORKER_URL = 'https://858-builder.faroukalaofa.workers.dev';

function redirectToLogin() {
  try {
    window.location.href = `${WORKER_URL}/login`;
  } catch (e) {
    console.error('[auth] redirect failed', e);
  }
}

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

// Robust key handler: host window + document (capture), and any iframes
function keyHandler(e) {
  // Normalize "Shift + A"
  const key = (e.key || '').toLowerCase();
  if (e.shiftKey && key === 'a') {
    e.preventDefault();
    e.stopPropagation();
    redirectToLogin();
  }
}

// Attach on host
window.addEventListener('keydown', keyHandler, true);
document.addEventListener('keydown', keyHandler, true);

// Try to attach into any iframes (e.g., GrapesJS canvas)
function bindIframeKeys(iframe) {
  if (!iframe || !iframe.contentWindow) return;
  try {
    iframe.contentWindow.addEventListener('keydown', keyHandler, true);
    iframe.contentDocument?.addEventListener('keydown', keyHandler, true);
  } catch (e) {
    // cross-origin iframes will throw; GrapesJS canvas is same-origin so it's fine
  }
}

// Bind existing iframes
document.querySelectorAll('iframe').forEach(bindIframeKeys);

// Watch for new iframes being added later
const mo = new MutationObserver((muts) => {
  muts.forEach(m => {
    m.addedNodes.forEach(n => {
      if (n.tagName === 'IFRAME') bindIframeKeys(n);
      // GrapesJS wraps iframe in a div; also scan descendants
      if (n.querySelectorAll) n.querySelectorAll('iframe').forEach(bindIframeKeys);
    });
  });
});
mo.observe(document.documentElement, { childList: true, subtree: true });

// Visible “Sign in” buttons (top bar fallback + floating)
(function addVisibleButtons() {
  // Floating button (bottom-left)
  const fab = document.createElement('button');
  fab.textContent = 'Sign in';
  fab.style.cssText = `
    position: fixed; left: 16px; bottom: 16px; z-index: 99998;
    padding: 8px 12px; border-radius: 10px; cursor: pointer;
    background: #1f6feb; color: #fff; border: 0; font: 600 13px system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    box-shadow: 0 6px 16px rgba(0,0,0,.35);
  `;
  fab.addEventListener('click', redirectToLogin);
  document.body.appendChild(fab);

  // If GrapesJS later adds top panels, we’ll inject a button there too (from editor.js)
})();
