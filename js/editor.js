/* =========================================================================
   858 Builder — editor.js (Auth gate + 3D + Save + Pages + Blocks open)
   ======================================================================= */

const GH_OWNER  = 'farouk858';
const GH_REPO   = 'farouk858-site';
const GH_BRANCH = 'main';
const ALLOW_LIST = ['farouk858'];

let CURRENT_PATH = localStorage.getItem('gjs-current-path') || 'index.html';

// Capture token if Worker returns here
(function captureTokenFromHash() {
  const m = location.hash && location.hash.match(/access_token=([^&]+)/);
  if (m) {
    localStorage.setItem('gh_token', decodeURIComponent(m[1]));
    history.replaceState({}, document.title, location.pathname + location.search);
  }
})();

function toast(msg, ms = 2000) {
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
function token() { return localStorage.getItem('gh_token') || null; }

async function verifyOrRedirect() {
  const t = token();
  if (!t) { window.location.replace('/farouk858-site/signin.html'); throw new Error('no-token'); }

  const u = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${t}`, Accept: 'application/vnd.github+json' }
  });
  if (!u.ok) { window.location.replace('/farouk858-site/signin.html'); throw new Error('user-bad'); }
  const user = await u.json();

  const loginLower = (user.login || '').toLowerCase();
  const allowed = ALLOW_LIST.map(s => s.toLowerCase());
  if (!allowed.includes(loginLower)) {
    window.location.replace('/farouk858-site/signin.html');
    throw new Error('user-denied');
  }

  const r = await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}`, {
    headers: { Authorization: `Bearer ${t}`, Accept: 'application/vnd.github+json' }
  });
  if (!r.ok) { window.location.replace('/farouk858-site/signin.html'); throw new Error('repo-bad'); }
  const repo = await r.json();
  const perm = repo.permissions || {};
  if (!perm.push && !perm.admin) { window.location.replace('/farouk858-site/signin.html'); throw new Error('no-perms'); }

  return true;
}

/* GitHub helpers */
async function ghGet(path) {
  const r = await fetch(
    `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${encodeURIComponent(path)}?ref=${GH_BRANCH}&_=${Date.now()}`,
    { headers: { Authorization: `Bearer ${token()}`, Accept: 'application/vnd.github+json' } }
  );
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('GET failed ' + r.status);
  return r.json();
}
async function getFileSha(path) {
  const meta = await ghGet(path);
  return meta && meta.sha ? meta.sha : null;
}
async function putFile({ path, content, message, sha }) {
  const body = {
    message,
    branch: GH_BRANCH,
    content: btoa(unescape(encodeURIComponent(content))),
  };
  if (sha) body.sha = sha;
  const r = await fetch(
    `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${encodeURIComponent(path)}`,
    { method: 'PUT', headers: { Authorization: `Bearer ${token()}`, Accept: 'application/vnd.github+json' }, body: JSON.stringify(body) }
  );
  if (!r.ok) throw new Error(`PUT failed ${r.status}: ${await r.text()}`);
  return r.json();
}

/* Build full HTML (inject global shortcut) */
function buildDocFromEditor(editor) {
  const html = editor.getHtml({ cleanId: true });
  const css  = editor.getCss();
  return `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"></script>
<style>${css}</style>
</head><body>
${html}
<script src="js/global-shortcuts.js"></script>
</body></html>`.trim();
}

/* Pages helpers */
async function listPages() {
  const root = await ghGet('');
  const pagesDir = await ghGet('pages');
  const items = [];
  if (root && Array.isArray(root)) {
    const idx = root.find(f => f.name === 'index.html');
    if (idx) items.push({ name: 'index.html', path: 'index.html' });
  }
  if (pagesDir && Array.isArray(pagesDir)) {
    pagesDir.filter(f => f.type === 'file' && f.name.endsWith('.html'))
      .forEach(f => items.push({ name: f.name, path: `pages/${f.name}` }));
  }
  return items;
}
async function loadPage(editor, path) {
  const meta = await ghGet(path);
  if (!meta) { toast('Page not found: ' + path, 2500); return; }
  const content = decodeURIComponent(escape(atob(meta.content || '')));
  const tmp = document.createElement('html'); tmp.innerHTML = content;
  editor.setComponents((tmp.querySelector('body') || tmp).innerHTML);
  editor.setStyle((tmp.querySelector('style') || {}).textContent || '');
  CURRENT_PATH = path;
  localStorage.setItem('gjs-current-path', CURRENT_PATH);
  updatePagesBadge();
  toast('Loaded: ' + path);
}
async function savePage(editor, path = CURRENT_PATH) {
  const doc = buildDocFromEditor(editor);
  let sha = await getFileSha(path);
  try {
    await putFile({ path, content: doc, message: `save: ${path} via editor`, sha });
  } catch (err) {
    if ((err.message || '').includes('409')) {
      sha = await getFileSha(path);
      await putFile({ path, content: doc, message: `save: ${path} via editor (retry)`, sha });
    } else throw err;
  }
  CURRENT_PATH = path;
  localStorage.setItem('gjs-current-path', CURRENT_PATH);
  updatePagesBadge();
  toast('Saved: ' + path);
}
function saveAsDialog(editor) {
  const slug = prompt('Save As — page slug (e.g. about):');
  if (!slug) return;
  savePage(editor, `pages/${slug}.html`);
}

/* Pages UI */
function updatePagesBadge() {
  const el = document.getElementById('pages-badge');
  if (el) el.innerHTML = `<span style="opacity:.7">Page:</span> ${CURRENT_PATH}`;
}
function showPagesModal(editor, items) {
  const listHtml = items.map(it => `
    <li style="display:flex;align-items:center;gap:8px;justify-content:space-between;padding:8px 0;border-bottom:1px solid #222">
      <span style="font-family:system-ui;color:#eee">${it.path}</span>
      <span>
        <button data-open="${it.path}" class="gjs-btn-prim">Open</button>
        <button data-dup="${it.path}" class="gjs-btn">Duplicate</button>
      </span>
    </li>
  `).join('') || '<li style="color:#999">No pages yet</li>';

  const html = `
    <div style="font-family:system-ui;color:#eee">
      <div style="margin-bottom:12px;display:flex;gap:8px;align-items:center;justify-content:space-between">
        <strong>Pages</strong>
        <span id="pages-badge" style="font-size:12px;color:#9ae6b4;background:#234;padding:4px 8px;border-radius:8px"></span>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:12px">
        <button id="pg-new" class="gjs-btn-prim">New</button>
        <button id="pg-save" class="gjs-btn-prim">Save</button>
        <button id="pg-saveas" class="gjs-btn">Save As…</button>
        <button id="pg-reload" class="gjs-btn">Reload List</button>
      </div>
      <ul style="list-style:none;padding:0;margin:0;max-height:50vh;overflow:auto">${listHtml}</ul>
    </div>
  `;
  const modal = editor.Modal;
  modal.open({ title: 'Pages Manager', content: html });
  updatePagesBadge();
  const root = modal.getContentEl();

  root.querySelector('#pg-new')?.addEventListener('click', async () => {
    const slug = prompt('New page slug (e.g. work):');
    if (!slug) return;
    editor.setComponents(`<section style="padding:40px;color:#fff;background:#000"><h1>${slug}</h1><p>New page.</p></section>`);
    editor.setStyle('');
    await savePage(editor, `pages/${slug}.html`);
    toast('Created: pages/' + slug + '.html');
    const again = await listPages(); showPagesModal(editor, again);
  });
  root.querySelector('#pg-save')?.addEventListener('click', async () => { await savePage(editor); });
  root.querySelector('#pg-saveas')?.addEventListener('click', () => saveAsDialog(editor));
  root.querySelector('#pg-reload')?.addEventListener('click', async () => { const again = await listPages(); showPagesModal(editor, again); });

  root.querySelectorAll('button[data-open]')?.forEach(btn => {
    btn.addEventListener('click', async () => { await loadPage(editor, btn.getAttribute('data-open')); const again = await listPages(); showPagesModal(editor, again); });
  });
  root.querySelectorAll('button[data-dup]')?.forEach(btn => {
    btn.addEventListener('click', async () => {
      const src = btn.getAttribute('data-dup');
      const target = prompt(`Duplicate "${src}" to (e.g. pages/copy.html):`, src.replace('.html', '-copy.html'));
      if (!target) return;
      const meta = await ghGet(src);
      const content = decodeURIComponent(escape(atob(meta.content || '')));
      const tmp = document.createElement('html'); tmp.innerHTML = content;
      editor.setComponents((tmp.querySelector('body') || tmp).innerHTML);
      editor.setStyle((tmp.querySelector('style') || {}).textContent || '');
      await savePage(editor, target);
      const again = await listPages(); showPagesModal(editor, again);
      toast('Duplicated to: ' + target);
    });
  });
}

/* ---------------- Main boot ---------------- */
(async function main() {
  try {
    await verifyOrRedirect();
  } catch { return; }

  const editor = grapesjs.init({
    container: '#gjs',
    height: '100vh',
    fromElement: false,
    storageManager: false,
    assetManager: { upload: false, embedAsBase64: true, autoAdd: true },
    styleManager: {
      sectors: [
        { name: 'Layout',      open: true,  buildProps: ['display','position','top','left','right','bottom','width','height','margin','padding'] },
        { name: 'Typography',  open: false, buildProps: ['font-family','font-size','font-weight','color','line-height','letter-spacing','text-align'] },
        { name: 'Decorations', open: false, buildProps: ['background-color','background-image','border','border-radius','box-shadow','opacity'] },
      ]
    },
    canvas: { scripts: ['https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js'] },

    // 🔹 Ensure blocks plugin is used
    plugins: ['blocks-core-858'],
    pluginsOpts: {},
  });

  // Starter content (only once)
  if (!editor.getComponents().length) {
    editor.setComponents(`
      <section style="padding:40px 6vw; color:#fff; background:#000">
        <h1 style="margin:0 0 10px; font-family:system-ui">Editor ready ✓</h1>
        <p style="opacity:.75; font-family:system-ui">
          Shortcuts: <strong>Shift+S</strong> Save · <strong>Shift+O</strong> Pages · <strong>Shift+N</strong> New page · <strong>Shift+P</strong> Save As
        </p>
        <model-viewer src="models/sample.glb" alt="Sample 3D"
          style="width:100%;height:420px;background:transparent"
          camera-controls auto-rotate disable-zoom
          exposure="1.2" shadow-intensity="1" environment-image="neutral"></model-viewer>
    </section>`);
  }

  // Top bar buttons
  const panels = editor.Panels;
  panels.addButton('options', {
    id: 'open-pages',
    label: 'Pages',
    className: 'gjs-pn-btn',
    attributes: { title: 'Pages Manager' },
    command: async () => { const items = await listPages(); showPagesModal(editor, items); }
  });
  panels.addButton('options', {
    id: 'open-blocks',
    label: 'Blocks',
    className: 'gjs-pn-btn',
    attributes: { title: 'Toggle Blocks' },
    command: () => editor.Blocks.open()
  });

  // Shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.shiftKey && e.key.toLowerCase() === 's') { e.preventDefault(); savePage(editor); }
    if (e.shiftKey && e.key.toLowerCase() === 'o') { e.preventDefault(); (async () => { const items = await listPages(); showPagesModal(editor, items); })(); }
    if (e.shiftKey && e.key.toLowerCase() === 'n') { e.preventDefault();
      const slug = prompt('New page slug (e.g. about):'); if (!slug) return;
      editor.setComponents(`<section style="padding:40px;color:#fff;background:#000"><h1>${slug}</h1><p>New page.</p></section>`); editor.setStyle(''); savePage(editor, `pages/${slug}.html`);
    }
    if (e.shiftKey && e.key.toLowerCase() === 'p') { e.preventDefault(); saveAsDialog(editor); }
  });

  // 🔹 Open the Blocks panel on load
  editor.on('load', () => {
    editor.Blocks.open();
    // Expand categories (safety)
    editor.BlockManager.getCategories().forEach(cat => cat.set('open', true));
    toast('Authorized ✓  Editor loaded');
  });
})();
