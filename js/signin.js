// js/signin.js — GitHub OAuth capture + authorization gate for the editor

const WORKER_LOGIN = 'https://858-builder.faroukalaofa.workers.dev/login';
const GH_OWNER  = 'farouk858';
const GH_REPO   = 'farouk858-site';
const GH_BRANCH = 'main';

const $ = (sel) => document.querySelector(sel);
const btnLogin  = $('#gh-login');
const btnEditor = $('#go-editor');
const $ok = $('#status');
const $err = $('#error');

function show(el, on=true){ el.style.display = on ? '' : 'none'; }

function redirectToEditor() {
  window.location.href = '/farouk858-site/editor.html';
}

// 1) If redirected back from OAuth, capture access_token
(function captureTokenFromHash() {
  const m = location.hash.match(/access_token=([^&]+)/);
  if (m) {
    const token = decodeURIComponent(m[1]);
    localStorage.setItem('gh_token', token);
    history.replaceState({}, document.title, location.pathname + location.search);
  }
})();

function getToken() {
  return localStorage.getItem('gh_token') || null;
}

async function verifyAccess() {
  const token = getToken();
  if (!token) return { ok: false, reason: 'No token' };

  // Who am I?
  const u = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
  });
  if (!u.ok) return { ok: false, reason: `GitHub /user: ${u.status}` };
  const user = await u.json();
  if (user.login !== GH_OWNER) {
    return { ok: false, reason: `User ${user.login} is not allowed.` };
  }

  // Do I have repo access?
  const r = await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
  });
  if (!r.ok) return { ok: false, reason: `Repo check: ${r.status}` };
  const repo = await r.json();

  // Basic write permission check (admin or push)
  const perm = repo.permissions || {};
  if (!perm.push && !perm.admin) {
    return { ok: false, reason: 'Missing push/admin permission on the repo.' };
  }

  return { ok: true, user };
}

async function init() {
  btnLogin.addEventListener('click', () => window.location.href = WORKER_LOGIN);
  btnEditor.addEventListener('click', redirectToEditor);

  // If token present, verify; otherwise show login
  if (getToken()) {
    show($ok, true); $ok.textContent = 'Verifying your GitHub access…';
    const res = await verifyAccess();
    if (res.ok) {
      $ok.textContent = `Signed in as ${res.user.login}. Access granted.`;
      show(btnEditor, true);
    } else {
      localStorage.removeItem('gh_token');
      show($ok, false);
      show($err, true); $err.textContent = `Access denied: ${res.reason}`;
    }
  }
}

init();
