/* =========================================================================
   858 Builder — editor.js (minimal boot + feature flags)
   ======================================================================= */

/* ---------- CONFIG ---------- */
const WORKER_URL = 'https://858-builder.faroukalaofa.workers.dev';
const GH_OWNER   = 'farouk858';
const GH_REPO    = 'farouk858-site';
const GH_BRANCH  = 'main';
/* --------------------------- */

/* ---------- FEATURE FLAGS (turn on one-by-one once stable) ---------- */
const ENABLE_BLOCKS_BASIC  = true; // grapesjsBlocksBasic
const ENABLE_FORMS         = true; // grapesjsPluginForms
const ENABLE_NAVBAR        = true; // grapesjsNavbar
const ENABLE_TABS          = true; // grapesjsTabs
const ENABLE_CUSTOM_CODE   = false; // grapesjsCustomCode
/* -------------------------------------------------------------------- */

// Track which file you’re editing right now
let CURRENT_PATH = localStorage.getItem('gjs-current-path') || 'index.html';

/* ---------------- Collect plugins safely ---------------- */
const pluginFns = [];

// Your custom plugins (local files)
if (window.modelViewerPlugin) pluginFns.push(window.modelViewerPlugin);
if (window.blocksPlugin)      pluginFns.push(window.blocksPlugin);

// External plugins (enable via flags only when globals exist)
if (ENABLE_BLOCKS_BASIC  && window.grapesjsBlocksBasic)  pluginFns.push(window.grapesjsBlocksBasic);
if (ENABLE_FORMS         && window.grapesjsPluginForms)  pluginFns.push(window.grapesjsPluginForms);
if (ENABLE_NAVBAR        && window.grapesjsNavbar)       pluginFns.push(window.grapesjsNavbar);
if (ENABLE_TABS          && window.grapesjsTabs)         pluginFns.push(window.grapesjsTabs);
if (ENABLE_CUSTOM_CODE   && window.grapesjsCustomCode)   pluginFns.push(window.grapesjsCustomCode);

/* ---------------- GrapesJS INIT ---------------- */
const editor = grapesjs.init({
  container: '#gjs',
  height: '100vh',
  fromElement: false,

  storageManager: { type: 'local', autosave: true, autoload: true, stepsBeforeSave: 1 },

  assetManager: {
    upload: false,          // base64-embed
    embedAsBase64: true,
    autoAdd: true,
  },

  styleManager: {
    sectors: [
      { name: 'Layout',      open: true,  buildProps: ['display','position','top','left','right','bottom','width','height','margin','padding'] },
      { name: 'Typography',  open: false, buildProps: ['font-family','font-size','font-weight','color','line-height','letter-spacing','text-align'] },
      { name: 'Decorations', open: false, buildProps: ['background-color','background-image','border','border-radius','box-shadow','opacity'] },
    ]
  },

  canvas: {
    // Make <model-viewer> available inside the canvas
    scripts: ['https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js']
  },

  plugins: pluginFns,
  pluginsOpts: {},
});

/* Starter content (only once) */
if (!editor.getComponents().length) {
  editor.setComponents(`
    <section style="padding:40px 6vw; color:white; background:#000">
      <h1 style="font-family:system-ui;margin:0 0 16px;">farouk858 — new portfolio</h1>
      <p style="font-family:system-ui;opacity:.8;margin:0 0 24px;">
        Shortcuts: <strong>Shift+A</strong> Sign in · <strong>Shift+S</strong> Save ·
        <strong>Shift+N</strong> New page · <strong>Shift+O</strong> Pages · <strong>Shift+P</strong> Save As
      </p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
        <model-viewer src="models/sample.glb" alt="Sample"
          camera-controls disable-zoom auto-rotate
          style="width:100%;height:420px;background:transparent"
          exposure="1.2" shadow-intensity="1" environment-image="neutral"></model-viewer>
        <div>
          <h2 style="font-family:system-ui;margin-top:0;">Drag blocks → right panel</h2>
          <p style="font-family:system-ui;">Use Layout/Media/Elements/3D to compose pages.</p>
        </div>
      </div>
    </section>
  `);
}

/* ---------------- UI helpers ---------------- */
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

/* ---------------- Auth helpers ---------------- */
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

/* ---------------- GitHub API helpers ---------------- */
async function ghGet(path) {
  const token = getTokenFromHash();
  const r = await fetch(
    `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${encodeURIComponent(path)}?ref=${GH_BRANCH}&_=${Date.now()}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } }
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
  const token = getTokenFromHash();
  const body = {
    message, branch: GH_BRANCH,
    content: btoa(unescape(encodeURIComponent(content))),
  };
  if (sha) body.sha = sha;
  const r = await fetch(
    `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${encodeURIComponent(path)}`,
    { method: 'PUT', headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }, body: JSON.stringify(body) }
  );
  if (!r.ok) throw new Error(`PUT failed ${r.status}: ${await r.text()}`);
  return r.json();
}
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

/* ---------------- Save/Load pages ---------------- */
function buildDocFromEditor() {
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
</body></html>`.trim();
}
async function loadPage(path) {
  if (!isAuthed()) { toast('Sign in first (Shift + A)'); return; }
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
async function savePage(path = CURRENT_PATH) {
  if (!isAuthed()) { toast('Sign in first (Shift + A)'); return; }
  const doc = buildDocFromEditor();
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
async function saveAsDialog() {
  const slug = prompt('Save As — page slug (e.g. about):');
  if (!slug) return;
  await savePage(`pages/${slug}.html`);
}

/* ---------------- Pages Manager UI ---------------- */
function updatePagesBadge() {
  const el = document.getElementById('pages-badge');
  if (el) el.innerHTML = `<span style="opacity:.7">Page:</span> ${CURRENT_PATH}`;
}
function showPagesModal(items) {
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
    await savePage(`pages/${slug}.html`);
    toast('Created: pages/' + slug + '.html');
    const again = await listPages(); showPagesModal(again);
  });
  root.querySelector('#pg-save')?.addEventListener('click', async () => { await savePage(); });
  root.querySelector('#pg-saveas')?.addEventListener('click', saveAsDialog);
  root.querySelector('#pg-reload')?.addEventListener('click', async () => { const again = await listPages(); showPagesModal(again); });

  root.querySelectorAll('button[data-open]')?.forEach(btn => {
    btn.addEventListener('click', async () => { await loadPage(btn.getAttribute('data-open')); const again = await listPages(); showPagesModal(again); });
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
      await savePage(target);
      const again = await listPages(); showPagesModal(again);
      toast('Duplicated to: ' + target);
    });
  });
}

/* Add visible Pages buttons */
const panels = editor.Panels;
panels.addButton('options', {
  id: 'open-pages',
  label: 'Pages',
  attributes: { title: 'Pages Manager' },
  className: 'gjs-pn-btn',
  command: async () => { if (!isAuthed()) { toast('Sign in first (Shift + A)'); return; } const items = await listPages(); showPagesModal(items); },
});
const fab = document.createElement('button');
fab.textContent = 'Pages';
fab.className = 'gjs-btn-prim';
fab.style.cssText = `position: fixed; right: 16px; bottom: 72px; z-index: 99998; padding: 8px 12px; border-radius: 10px; cursor: pointer;`;
fab.addEventListener('click', async () => { if (!isAuthed()) { toast('Sign in first (Shift + A)'); return; } const items = await listPages(); showPagesModal(items); });
document.body.appendChild(fab);

/* ---------------- Keyboard shortcuts ---------------- */
document.addEventListener('keydown', (e) => {
  if (e.shiftKey && e.key.toLowerCase() === 'a') { e.preventDefault(); window.location.href = `${WORKER_URL}/login`; }
  if (e.shiftKey && e.key.toLowerCase() === 's') { e.preventDefault(); savePage(); }
  if (e.shiftKey && e.key.toLowerCase() === 'n') { e.preventDefault();
    const slug = prompt('New page slug (e.g. about):'); if (!slug) return;
    editor.setComponents(`<section style="padding:40px;color:#fff;background:#000"><h1>${slug}</h1><p>New page.</p></section>`); editor.setStyle(''); savePage(`pages/${slug}.html`);
  }
  if (e.shiftKey && e.key.toLowerCase() === 'o') { e.preventDefault();
    (async () => { if (!isAuthed()) { toast('Sign in first (Shift + A)'); return; } const items = await listPages(); showPagesModal(items); })();
  }
  if (e.shiftKey && e.key.toLowerCase() === 'p') { e.preventDefault(); saveAsDialog(); }
});

/* On load */
document.addEventListener('DOMContentLoaded', () => {
  // Simple boot check
  try {
    editor.on('load', () => console.log('[gjs] loaded'));
  } catch (e) {
    console.error('Editor failed to mount:', e);
  }
  if (isAuthed()) toast(`Signed in ✓  Editing: ${CURRENT_PATH}`);
});
