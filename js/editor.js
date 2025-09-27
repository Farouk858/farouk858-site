/* =========================================================================
   858 Builder — editor.js
   - GrapesJS init
   - <model-viewer> inside canvas
   - Export HTML button
   - OAuth login (Shift + A) via Cloudflare Worker
   - Save to GitHub (Shift + S) -> writes index.html
   - Pages Manager (Shift + O, top bar button, floating button)
   ======================================================================= */

// --------- CONFIG ----------
const WORKER_URL = 'https://858-builder.faroukalaofa.workers.dev';
const GH_OWNER   = 'farouk858';
const GH_REPO    = 'farouk858-site';
const GH_BRANCH  = 'main';
// ----------------------------

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
});

// Starter content (only if empty)
if (!editor.getComponents().length) {
  editor.setComponents(`
    <section style="padding:40px; color:white; background:#000">
      <h1 style="font-family:system-ui;margin:0 0 16px;">farouk858 — new portfolio</h1>
      <p style="font-family:system-ui;opacity:.8;margin:0 0 24px;">
        Press <strong>Shift + A</strong> to sign in · <strong>Shift + S</strong> to save · <strong>Shift + O</strong> for Pages.
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
async function getFileSha({ token, owner, repo, path, branch='main' }) {
  const r = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${branch}&t=${Date.now()}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } }
  );
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('Failed to load file: ' + r.status);
  const j = await r.json();
  return j.sha || null;
}

async function putFile({ token, owner, repo, path, content, message, branch='main', sha=null }) {
  const body = {
    message,
    branch,
    content: btoa(unescape(encodeURIComponent(content)))
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
  if (!r.ok) throw new Error(`PUT failed ${r.status}: ${await r.text()}`);
  return r.json();
}

// -------------------- Save to GitHub --------------------
async function saveToGitHub(path='index.html') {
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

  try {
    const sha  = await getFileSha({ token, owner: GH_OWNER, repo: GH_REPO, path, branch: GH_BRANCH });
    await putFile({
      token, owner: GH_OWNER, repo: GH_REPO, path,
      content: page,
      message: `chore: save ${path} from visual editor`,
      branch: GH_BRANCH,
      sha
    });
    toast(`Saved ${path} to GitHub ✔  (Pages will update shortly)`);
  } catch (err) {
    console.error(err);
    toast('Save failed: ' + err.message, 4000);
  }
}

// -------------------- Pages Manager --------------------
async function listPages() {
  const token = getTokenFromHash();
  const r = await fetch(
    `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents?ref=${GH_BRANCH}&t=${Date.now()}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } }
  );
  if (!r.ok) throw new Error('Failed to list pages');
  const j = await r.json();
  return j.filter(f => f.name.endsWith('.html'));
}

function showPagesModal(pages) {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
    background:#111; color:#fff; padding:20px; border-radius:12px;
    z-index:99999; max-width:480px; font-family:system-ui;
  `;
  modal.innerHTML = `<h3 style="margin-top:0">Pages</h3>
    <ul style="list-style:none;padding:0;margin:0 0 12px;max-height:200px;overflow:auto">
      ${pages.map(p => `<li style="margin:4px 0">
        <a href="?page=${p.name}" style="color:#0f0">${p.name}</a>
      </li>`).join('')}
    </ul>
    <button id="newPageBtn">+ New Page</button>
    <button id="closePagesBtn">Close</button>
  `;
  document.body.appendChild(modal);
  document.getElementById('closePagesBtn').onclick = () => modal.remove();
  document.getElementById('newPageBtn').onclick = async () => {
    const name = prompt('New page filename (e.g. about.html)');
    if (name) {
      await saveToGitHub(name);
      toast('New page created: ' + name);
      modal.remove();
    }
  };
}

// Command to open the manager
async function openPagesManager() {
  if (!isAuthed()) { toast('Sign in first (Shift + A)'); return; }
  const items = await listPages();
  showPagesModal(items);
}

// Add top bar text button
pn.addButton('options', {
  id: 'open-pages',
  label: 'Pages',
  attributes: { title: 'Pages Manager' },
  className: 'gjs-pn-btn',
  command: openPagesManager,
});

// Floating button
const fab = document.createElement('button');
fab.textContent = 'Pages';
fab.className = 'gjs-btn-prim';
fab.style.cssText = `
  position: fixed; right: 16px; bottom: 72px; z-index: 99998;
  padding: 8px 12px; border-radius: 10px; cursor: pointer;
`;
fab.addEventListener('click', openPagesManager);
document.body.appendChild(fab);

// -------------------- Keyboard shortcuts --------------------
document.addEventListener('keydown', (e) => {
  if (e.shiftKey && e.key.toLowerCase() === 'a') {
    e.preventDefault();
    toast('Redirecting to GitHub sign-in…');
    window.location.href = `${WORKER_URL}/login`;
  }
  if (e.shiftKey && e.key.toLowerCase() === 's') {
    e.preventDefault();
    saveToGitHub();
  }
  if (e.shiftKey && e.key.toLowerCase() === 'o') {
    e.preventDefault();
    openPagesManager();
  }
});
