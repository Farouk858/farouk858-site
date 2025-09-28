/* =========================================================================
   858 Builder — editor.js
   - Save/Pages
   - Assets dock + modal uploader (click/drag/paste)
   - Global dbl-click picker for IMG / VIDEO / MODEL-VIEWER
   ======================================================================= */

const GH_OWNER  = 'farouk858';
const GH_REPO   = 'farouk858-site';
const GH_BRANCH = 'main';
const ALLOW_LIST = ['farouk858'];

let CURRENT_PATH = localStorage.getItem('gjs-current-path') || 'index.html';
let DIRTY = false;

/* ---------- token capture ---------- */
(function captureTokenFromHash() {
  const m = location.hash && location.hash.match(/access_token=([^&]+)/);
  if (m) {
    localStorage.setItem('gh_token', decodeURIComponent(m[1]));
    history.replaceState({}, document.title, location.pathname + location.search);
  }
})();
const token = () => localStorage.getItem('gh_token') || null;

/* ---------- toasts ---------- */
function toast(msg, ms = 2600) {
  let el = document.getElementById('gh-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'gh-toast';
    el.style.cssText = `
      position:fixed; right:16px; bottom:16px; z-index:2147483647;
      background:rgba(0,0,0,.92); color:#fff; padding:10px 14px;
      border-radius:10px; font:13px/1.2 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;
      box-shadow:0 6px 20px rgba(0,0,0,.35); transition:opacity .2s; max-width:60ch;`;
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => (el.style.opacity = '0'), ms);
}
const errToast = (t, e) => { console.error(t, e); toast(`${t}: ${e?.message || e}`, 4200); };

/* ---------- auth gate ---------- */
async function verifyOrRedirect() {
  const t = token();
  if (!t) { location.replace('/farouk858-site/signin.html'); throw new Error('no-token'); }

  const u = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${t}`, Accept: 'application/vnd.github+json' }
  });
  if (!u.ok) { location.replace('/farouk858-site/signin.html'); throw new Error('user-bad'); }
  const user = await u.json();
  if (!ALLOW_LIST.map(s=>s.toLowerCase()).includes((user.login||'').toLowerCase())) {
    location.replace('/farouk858-site/signin.html'); throw new Error('user-denied');
  }

  const r = await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}`, {
    headers: { Authorization: `Bearer ${t}`, Accept: 'application/vnd.github+json' }
  });
  if (!r.ok) { location.replace('/farouk858-site/signin.html'); throw new Error('repo-bad'); }
  const repo = await r.json();
  const perm = repo.permissions || {};
  if (!perm.push && !perm.admin) { location.replace('/farouk858-site/signin.html'); throw new Error('no-perms'); }
  return true;
}

/* ---------- GitHub helpers ---------- */
async function ghGet(path) {
  const r = await fetch(
    `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${encodeURIComponent(path)}?ref=${GH_BRANCH}&_=${Date.now()}`,
    { headers: { Authorization: `Bearer ${token()}`, Accept: 'application/vnd.github+json' } }
  );
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`GET ${path}: ${r.status}`);
  return r.json();
}
async function getFileSha(path) {
  const meta = await ghGet(path);
  return meta && meta.sha ? meta.sha : null;
}
async function putFile({ path, content, message, sha }) {
  const body = { message, branch: GH_BRANCH, content };
  if (sha) body.sha = sha;
  const r = await fetch(
    `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${encodeURIComponent(path)}`,
    { method: 'PUT', headers: { Authorization: `Bearer ${token()}`, Accept: 'application/vnd.github+json' }, body: JSON.stringify(body) }
  );
  if (!r.ok) throw new Error(`PUT ${path} ${r.status}: ${await r.text()}`);
  return r.json();
}
const b64 = (str) => btoa(unescape(encodeURIComponent(str)));

/* ---------- assets (/assets) ---------- */
const slugFileName = (n) => n.trim().toLowerCase().replace(/[^a-z0-9.\-]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
async function uploadAssetToGitHub(file) {
  const buf = await file.arrayBuffer();
  const name = `${Date.now()}-${slugFileName(file.name)}`;
  const path = `assets/${name}`;
  await putFile({
    path,
    content: b64(String.fromCharCode(...new Uint8Array(buf))),
    message: `asset: ${name}`,
  });
  return `assets/${name}`; // Relative path served by Pages
}
async function loadExistingAssetsInto(am) {
  const items = await ghGet('assets');
  if (!Array.isArray(items)) return;
  const toAdd = items
    .filter(x => x.type === 'file')
    .map(x => ({ src: `assets/${x.name}`, name: x.name }));
  if (toAdd.length) am.add(toAdd);
}

/* ---------- document build ---------- */
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

/* ---------- pages ---------- */
const slugPageSlug = (s) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
async function listPages() {
  const root = await ghGet('');
  const pagesDir = await ghGet('pages');
  const items = [];
  if (Array.isArray(root)) {
    const idx = root.find(f => f.name === 'index.html');
    if (idx) items.push({ name: 'index.html', path: 'index.html' });
  }
  if (Array.isArray(pagesDir)) {
    pagesDir.filter(f => f.type === 'file' && f.name.endsWith('.html'))
      .forEach(f => items.push({ name: f.name, path: `pages/${f.name}` }));
  }
  return items;
}
async function loadPage(editor, path) {
  try {
    const meta = await ghGet(path);
    if (!meta) throw new Error('not found');
    const content = decodeURIComponent(escape(atob(meta.content || '')));
    const tmp = document.createElement('html'); tmp.innerHTML = content;
    editor.setComponents((tmp.querySelector('body') || tmp).innerHTML);
    editor.setStyle((tmp.querySelector('style') || {}).textContent || '');
    CURRENT_PATH = path; localStorage.setItem('gjs-current-path', CURRENT_PATH);
    DIRTY = false; updatePagesBadge(); toast('Loaded: ' + path);
  } catch (e) { errToast('Load failed', e); }
}
async function savePage(editor, path = CURRENT_PATH) {
  try {
    const enc = b64(buildDocFromEditor(editor));
    let sha = await getFileSha(path);
    try { await putFile({ path, content: enc, message: `save: ${path} via editor`, sha }); }
    catch (e) {
      if ((e.message||'').includes('409')) {
        sha = await getFileSha(path);
        await putFile({ path, content: enc, message: `save: ${path} via editor (retry)`, sha });
      } else throw e;
    }
    CURRENT_PATH = path; localStorage.setItem('gjs-current-path', CURRENT_PATH);
    DIRTY = false; updatePagesBadge(); toast('Saved ✓ ' + path);
  } catch (e) { errToast('Save failed', e); }
}

/* ---------- pages modal ---------- */
function updatePagesBadge() {
  const el = document.getElementById('pages-badge');
  if (el) el.innerHTML = `<span style="opacity:.7">Page:</span> ${CURRENT_PATH}${DIRTY?' • unsaved':''}`;
}
function confirmIfDirty(cb) {
  if (!DIRTY) return cb();
  if (confirm('You have unsaved changes. Save before continuing?')) cb('save'); else cb('discard');
}
function showPagesModal(editor, items) {
  const listHtml = items.map(it => `
    <li style="display:flex;align-items:center;gap:8px;justify-content:space-between;padding:8px 0;border-bottom:1px solid #222">
      <span style="font-family:system-ui;color:#eee">${it.path}</span>
      <span>
        <button data-open="${it.path}" class="gjs-btn-prim">Open</button>
        <button data-dup="${it.path}" class="gjs-btn">Duplicate</button>
      </span>
    </li>`).join('') || '<li style="color:#999">No pages yet</li>';

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
    </div>`;
  const modal = editor.Modal; modal.open({ title: 'Pages Manager', content: html });
  updatePagesBadge();
  const root = modal.getContentEl();

  root.querySelector('#pg-new')?.addEventListener('click', async () => {
    const slug = slugPageSlug(prompt('New page slug (e.g. home-page):') || 'new-page');
    editor.setComponents(`<section style="padding:40px;color:#fff;background:#000"><h1>${slug}</h1><p>New page.</p></section>`);
    editor.setStyle(''); await savePage(editor, `pages/${slug}.html`);
    const again = await listPages(); showPagesModal(editor, again);
  });
  root.querySelector('#pg-save')?.addEventListener('click', async () => savePage(editor));
  root.querySelector('#pg-saveas')?.addEventListener('click', async () => {
    const slug = slugPageSlug(prompt('Save As — page slug:', 'copy') || 'copy');
    await savePage(editor, `pages/${slug}.html`);
  });
  root.querySelector('#pg-reload')?.addEventListener('click', async () => {
    const again = await listPages(); showPagesModal(editor, again);
  });

  root.querySelectorAll('button[data-open]')?.forEach(btn => {
    btn.addEventListener('click', () => confirmIfDirty(async (choice) => {
      if (choice === 'save') await savePage(editor);
      await loadPage(editor, btn.getAttribute('data-open'));
      const again = await listPages(); showPagesModal(editor, again);
    }));
  });
  root.querySelectorAll('button[data-dup]')?.forEach(btn => {
    btn.addEventListener('click', async () => {
      const src = btn.getAttribute('data-dup');
      const def = src.replace('.html','-copy.html');
      const target = prompt(`Duplicate "${src}" to:`, def); if (!target) return;
      const meta = await ghGet(src); if (!meta?.content) return;
      await putFile({ path: target, content: meta.content, message: `duplicate: ${target}` });
      const again = await listPages(); showPagesModal(editor, again);
      toast('Duplicated to: ' + target);
    });
  });
}

/* ---------- Assets Dock (high z-index) ---------- */
function mountAssetsDock(editor) {
  if (document.getElementById('am-dock')) return;

  const dock = document.createElement('div');
  dock.id = 'am-dock';
  dock.innerHTML = `
    <style>
      #am-dock{
        position:fixed; top:64px; right:8px; bottom:8px; width:320px; z-index:2147483647;
        background:rgba(12,12,12,.97); border:1px solid #222; border-radius:12px;
        box-shadow:0 12px 40px rgba(0,0,0,.55); display:flex; flex-direction:column; overflow:hidden;
      }
      #am-head{ padding:10px 12px; display:flex; gap:8px; align-items:center; border-bottom:1px solid #222; }
      #am-head strong{ color:#eee; font:600 13px system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial; }
      #am-body{ flex:1; min-height:0; }
      #am-upload{ display:none; }
      #am-actions{ margin-left:auto; display:flex; gap:8px; }
      .am-btn{ padding:6px 10px; border-radius:8px; background:#1f6feb; color:#fff; border:0; cursor:pointer; font:600 12px system-ui; }
      .am-btn.secondary{ background:#333; color:#ddd; }
      .am-btn.ghost{ background:transparent; color:#aaa; border:1px solid #333; }
    </style>
    <div id="am-head">
      <strong>Assets</strong>
      <div id="am-actions">
        <button id="am-toggle" class="am-btn ghost">Hide</button>
        <button id="am-pick" class="am-btn">Upload</button>
        <button id="am-open" class="am-btn secondary">Library</button>
      </div>
      <input id="am-upload" type="file" multiple accept="image/*,video/*,model/*,.glb,.gltf,.usdz" />
    </div>
    <div id="am-body"></div>
  `;
  document.body.appendChild(dock);

  const am = editor.AssetManager;
  am.render(dock.querySelector('#am-body'));
  loadExistingAssetsInto(am).catch(e => errToast('Load assets failed', e));

  const fileInput = dock.querySelector('#am-upload');
  dock.querySelector('#am-pick').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async (e) => {
    const files = e.target.files; if (!files?.length) return;
    const added = [];
    for (const f of files) {
      try { added.push({ src: await uploadAssetToGitHub(f) }); }
      catch (err) { errToast('Upload failed', err); }
    }
    if (added.length) am.add(added);
    fileInput.value = '';
  });

  dock.addEventListener('dragover', e => { e.preventDefault(); });
  dock.addEventListener('drop', async (e) => {
    e.preventDefault();
    const files = e.dataTransfer?.files; if (!files?.length) return;
    const added = [];
    for (const f of files) {
      try { added.push({ src: await uploadAssetToGitHub(f) }); }
      catch (err) { errToast('Upload failed', err); }
    }
    if (added.length) am.add(added);
  });

  dock.querySelector('#am-toggle').addEventListener('click', () => {
    if (dock.style.display === 'none') {
      dock.style.display = 'flex';
      dock.querySelector('#am-toggle').textContent = 'Hide';
    } else {
      dock.style.display = 'none';
    }
  });

  window._858_pickAsset = (cb) => {
    am.open({});
    const sel = (m) => {
      const src = m && m.get && m.get('src');
      if (src) cb(src);
      am.off('select', sel);
    };
    am.on('select', sel);
  };
}

/* ---------- Modal uploader hook (fixes “nothing happens”) ---------- */
async function assetUploaderHandler(e, am) {
  try {
    // Files can arrive via drop (dataTransfer), input[type=file] (target.files), or paste (clipboardData)
    const list =
      (e?.dataTransfer && e.dataTransfer.files) ||
      (e?.target && e.target.files) ||
      (e?.clipboardData && e.clipboardData.files);

    if (!list || !list.length) return;

    const added = [];
    for (const f of list) {
      const url = await uploadAssetToGitHub(f);
      added.push({ src: url, name: f.name });
    }
    if (added.length) am.add(added);

    toast(`Uploaded ${added.length} asset${added.length>1?'s':''} ✓`);
  } catch (err) {
    errToast('Upload failed', err);
  }
}

/* ---------- main ---------- */
(async function main() {
  try { await verifyOrRedirect(); } catch { return; }

  const editor = grapesjs.init({
    container: '#gjs',
    height: '100vh',
    fromElement: false,

    assetManager: {
      // We provide our own uploader via setConfig below
      upload: false,
      embedAsBase64: false,
      autoAdd: true,
    },

    styleManager: {
      sectors: [
        { name: 'Layout',      open: true,  buildProps: ['display','position','top','left','right','bottom','width','height','margin','padding'] },
        { name: 'Typography',  open: false, buildProps: ['font-family','font-size','font-weight','color','line-height','letter-spacing','text-align'] },
        { name: 'Decorations', open: false, buildProps: ['background-color','background-image','border','border-radius','box-shadow','opacity'] },
      ]
    },

    canvas: { scripts: ['https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js'] },
    plugins: ['blocks-core-858'],
  });

  // Attach uploader for BOTH the modal and any internal pickers
  editor.AssetManager.setConfig({
    ...editor.AssetManager.getConfig(),
    uploadFile: (e) => assetUploaderHandler(e, editor.AssetManager),
  });

  // Dirty tracking
  editor.on('change', () => { DIRTY = true; updatePagesBadge(); });
  window.addEventListener('beforeunload', (e) => { if (!DIRTY) return; e.preventDefault(); e.returnValue = ''; });

  // Starter
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
      </section>
    `);
  }

  // Top bar buttons
  const panels = editor.Panels;
  panels.addButton('options', {
    id: 'save-now', label: 'Save', className: 'gjs-pn-btn',
    attributes: { title: 'Save (Shift+S)' }, command: () => savePage(editor)
  });
  panels.addButton('options', {
    id: 'open-pages', label: 'Pages', className: 'gjs-pn-btn',
    attributes: { title: 'Pages Manager' },
    command: async () => { const items = await listPages(); showPagesModal(editor, items); }
  });
  panels.addButton('options', {
    id: 'open-blocks', label: 'Blocks', className: 'gjs-pn-btn',
    attributes: { title: 'Toggle Blocks' }, command: () => editor.Blocks.open()
  });
  panels.addButton('options', {
    id: 'open-assets-modal', label: 'Assets', className: 'gjs-pn-btn',
    attributes: { title: 'Open Assets (modal)' },
    command: () => editor.AssetManager.open({})
  });

  // Keymaps
  const km = editor.Keymaps;
  km.add('core:undo', 'meta+z');      km.add('core:redo', 'shift+meta+z');
  km.add('core:undo-ctrl', 'ctrl+z'); km.add('core:redo-ctrl', 'shift+ctrl+z');

  document.addEventListener('keydown', (e) => {
    if (e.shiftKey && e.key.toLowerCase() === 's') { e.preventDefault(); savePage(editor); }
    if (e.shiftKey && e.key.toLowerCase() === 'o') { e.preventDefault(); (async () => { const items = await listPages(); showPagesModal(editor, items); })(); }
    if (e.shiftKey && e.key.toLowerCase() === 'n') { e.preventDefault();
      const slug = slugPageSlug(prompt('New page slug (e.g. home-page):') || 'new-page');
      editor.setComponents(`<section style="padding:40px;color:#fff;background:#000"><h1>${slug}</h1><p>New page.</p></section>`); editor.setStyle('');
      savePage(editor, `pages/${slug}.html`);
    }
    if (e.shiftKey && e.key.toLowerCase() === 'p') { e.preventDefault();
      const slug = slugPageSlug(prompt('Save As — page slug:', 'copy') || 'copy'); savePage(editor, `pages/${slug}.html`);
    }
  });

  // GLOBAL dbl-click picker → works for IMG / VIDEO / MODEL-VIEWER
  function ensurePicker(editor) {
    if (!window._858_pickAsset) {
      window._858_pickAsset = (cb) => {
        const am = editor.AssetManager;
        am.open({});
        const sel = (m) => {
          const src = m && m.get && m.get('src');
          if (src) cb(src);
          am.off('select', sel);
        };
        am.on('select', sel);
      };
    }
  }
  ensurePicker(editor);

  editor.on('component:dblclick', (cmp) => {
    const el = cmp.getEl?.() || cmp.view?.el;
    if (!el) return;
    const tag = (el.tagName || '').toUpperCase();
    if (tag === 'IMG') {
      window._858_pickAsset?.((url) => cmp.addAttributes({ src: url }));
    } else if (tag === 'VIDEO') {
      window._858_pickAsset?.((url) => {
        cmp.addAttributes({ src: url });
        const source = el.querySelector('source'); if (source) { source.src = url; el.load?.(); }
      });
    } else if (tag === 'MODEL-VIEWER') {
      window._858_pickAsset?.((url) => cmp.addAttributes({ src: url }));
    }
  });

  editor.on('load', () => {
    editor.Blocks.open();
    editor.BlockManager.getCategories().forEach(cat => cat.set('open', true));
    updatePagesBadge();
    toast('Authorized ✓  Editor loaded');
    mountAssetsDock(editor); // right-side dock (also supports upload)
  });
})();
