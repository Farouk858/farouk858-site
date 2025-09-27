/* =========================================================================
   858 Builder — editor.js (full)
   - GrapesJS init
   - <model-viewer> inside canvas
   - Export HTML button
   - OAuth login (Shift + A) via Cloudflare Worker
   - Save to GitHub (Shift + S) -> writes index.html (with 409 retry)
   ======================================================================= */

/* ---------- CONFIG: EDIT IF NEEDED ---------- */
const WORKER_URL = 'https://858-builder.faroukalaofa.workers.dev';
const GH_OWNER   = 'farouk858';
const GH_REPO    = 'farouk858-site';
const GH_BRANCH  = 'main';
/* ------------------------------------------- */

// -------------------- GrapesJS INIT --------------------
const editor = grapesjs.init({
  container: '#gjs',
  height: '100vh',
  fromElement: false,
  storageManager: {
    type: 'local',
    autosave: true,
    autoload: true,
    stepsBeforeSave: 1
  },
  canvas: {
    scripts: [
      'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js'
    ]
  },
  // If you use a custom plugin that registers window.modelViewerPlugin:
  // plugins: [window.modelViewerPlugin],
  // pluginsOpts: {},
});

// Starter content (only if empty)
if (!editor.getComponents().length) {
  editor.setComponents(`
    <section style="padding:40px; color:white; background:#000">
      <h1 style="font-family:system-ui;margin:0 0 16px;">farouk858 — new portfolio</h1>
      <p style="font-family:system-ui;opacity:.8;margin:0 0 24px;">
        Press <strong>Shift + A</strong> to sign in · <strong>Shift + S</strong> to save to GitHub.
      </p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
        <model-viewer src="models/sample.glb" alt="Sample"
          camera-controls disable-zoom auto-rotate
          style="width:100%;height:420px;background:transparent"
          exposure="1.2" shadow-intensity="1" environment-image="neutral"></model-viewer>
        <div>
          <h2 style="font-family:system-ui;margin-top:0;">Content</h2>
          <p style="font-family:system-ui;">Add blocks, then export or save to GitHub.</p>
        </div>
      </div>
    </section>
  `);
}

// -------------------- Tiny toast --------------------
function toast(msg, ms = 1800) {
  let el = document.getElementById('gh-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'gh-toast';
    el.style.cssText = `
      position:fixed; right:16px; bottom:16px; z-index:99999;
      background:rgba(0,0,0,.85); color:#fff; padding:10px 14px;
      border-radius:10px; font:13px/1.2 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;
      box-shadow:0 6px 20px rgba(0,0,0,.35); transition:opacity .2s;
    `;
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => (el.style.opacity = '0'), ms);
}

// -------------------- Export (download) button --------------------
const pn = editor.Panels;
pn.addButton('options', {
  id: 'export-html',
  className: 'fa fa-download',
  attributes: { title: 'Export HTML' },
  command: editor => {
    const html = editor.getHtml({ cleanId: true });
    const css  = editor.getCss();
    const blob = new Blob(
      [`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"><\/script><style>${css}</style></head><body>${html}</body></html>`],
      { type: 'text/html' }
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'exported.html';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Exported HTML downloaded.');
  }
});

// -------------------- Auth helpers --------------------
function getTokenFromHash() {
  if (location.hash && location.hash.includes('access_token=')) {
    const match = location.hash.match(/access_token=([^&]+)/);
    if (match) {
      const token = decodeURIComponent(match[1]);
      localStorage.setItem('gh_token', token);
      history.replaceState({}, document.title, location.pathname + location.search);
      return token;
    }
  }
  return localStorage.getItem('gh_token') || null;
}
function isAuthed() { return !!getTokenFromHash(); }

// -------------------- GitHub API helpers --------------------
async function getFileSha({ token, owner, repo, path, branch = 'main' }) {
  const r = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${branch}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } }
  );
  if (r.status === 404) return null; // new file
  if (!r.ok) throw new Error('Failed to load file: ' + r.status);
  const j = await r.json();
  return j.sha || null;
}

async function putFile({ token, owner, repo, path, content, message, branch = 'main', sha = null }) {
  const body = {
    message,
    branch,
    content: btoa(unescape(encodeURIComponent(content))) // base64
  };
  if (sha) body.sha = sha;

  const r = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
      body: JSON.stringify(body)
    }
  );

  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`PUT failed ${r.status}: ${txt}`);
  }
  return r.json();
}

// -------------------- Save to GitHub (with 409 retry) --------------------
async function saveToGitHub() {
  const token = getTokenFromHash();
  if (!token) { toast('Not signed in. Press Shift + A to sign in.'); return; }

  const html = editor.getHtml({ cleanId: true });
  const css  = editor.getCss();

  const page = `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>farouk858 — portfolio</title>
<script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"></script>
<style>${css}</style>
</head><body>
${html}
</body></html>`.trim();

  const path = 'index.html';

  const doPut = (sha) => putFile({
    token, owner: GH_OWNER, repo: GH_REPO, path,
    content: page,
    message: 'chore: save from visual editor',
    branch: GH_BRANCH,
    sha: sha || undefined
  });

  try {
    // 1) Fetch latest SHA (null if file doesn't exist)
    let sha = await getFileSha({ token, owner: GH_OWNER, repo: GH_REPO, path, branch: GH_BRANCH });

    // 2) Attempt save
    try {
      await doPut(sha);
      toast('Saved to GitHub ✔  (Pages will update shortly)');
      return;
    } catch (err) {
      // 3) If conflict (409), refetch SHA and retry once
      if ((err.message || '').includes('409')) {
        const freshSha = await getFileSha({ token, owner: GH_OWNER, repo: GH_REPO, path, branch: GH_BRANCH });
        await doPut(freshSha);
        toast('Saved to GitHub ✔  (Pages will update shortly)');
        return;
      }
      throw err;
    }
  } catch (err) {
    console.error(err);
    toast('Save failed: ' + err.message, 4000);
  }
}

// -------------------- Keyboard shortcuts --------------------
document.addEventListener('keydown', (e) => {
  // Shift + A → Sign in (OAuth via Cloudflare Worker)
  if (e.shiftKey && e.key.toLowerCase() === 'a') {
    e.preventDefault();
    toast('Redirecting to GitHub sign-in…');
    window.location.href = `${WORKER_URL}/login`;
  }
  // Shift + S → Save to GitHub
  if (e.shiftKey && e.key.toLowerCase() === 's') {
    e.preventDefault();
    saveToGitHub();
  }
});

// -------------------- Optional: wire a visible Save button if present --------------------
const saveBtn = document.getElementById('gh-save');
function syncSaveBtn() { if (saveBtn) saveBtn.disabled = !isAuthed(); }
document.addEventListener('DOMContentLoaded', () => {
  syncSaveBtn();
  if (isAuthed()) toast('Signed in to GitHub ✓  (Shift + S to save)');
});
if (saveBtn) saveBtn.addEventListener('click', saveToGitHub);
