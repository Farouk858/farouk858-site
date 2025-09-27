<!-- Somewhere in the editor UI; can be styled as you like -->
<button id="gh-login">Sign in with GitHub</button>
<button id="gh-save" disabled>Save to GitHub</button>
----
  // ===== Auth: get token from hash after Worker callback =====
function getTokenFromHash() {
  if (location.hash && location.hash.includes('access_token=')) {
    const match = location.hash.match(/access_token=([^&]+)/);
    if (match) {
      const token = decodeURIComponent(match[1]);
      localStorage.setItem('gh_token', token);
      // Clean the hash for aesthetics
      history.replaceState({}, document.title, location.pathname + location.search);
      return token;
    }
  }
  return localStorage.getItem('gh_token') || null;
}

function isAuthed() {
  return !!getTokenFromHash();
}

// ===== GitHub API helpers =====
async function getFileSha({ token, owner, repo, path, branch='main' }) {
  const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${branch}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
  });
  if (r.status === 404) return null; // file not found
  if (!r.ok) throw new Error('Failed to get file: ' + r.status);
  const j = await r.json();
  return j.sha || null;
}

async function putFile({ token, owner, repo, path, content, message, branch='main', sha=null }) {
  const body = {
    message,
    branch,
    content: btoa(unescape(encodeURIComponent(content))), // base64
  };
  if (sha) body.sha = sha;

  const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
    body: JSON.stringify(body)
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error('PUT failed: ' + r.status + ' ' + t);
  }
  return r.json();
}

// ===== Wire buttons =====
const loginBtn = document.getElementById('gh-login');
const saveBtn  = document.getElementById('gh-save');

function updateButtons() {
  const authed = isAuthed();
  saveBtn.disabled = !authed;
}
updateButtons();

loginBtn.addEventListener('click', () => {
  // Redirect to the Worker /login route
  window.location.href = 'https://858-builder.faroukalaofa.workers.dev/login';
});

saveBtn.addEventListener('click', async () => {
  const token = getTokenFromHash();
  if (!token) return alert('Please sign in first.');

  // --- Change these 3 values to your repo ---
  const owner  = 'farouk858';
  const repo   = 'farouk858-site';
  const branch = 'main';

  // Get HTML/CSS from GrapesJS
  const html = editor.getHtml({ cleanId: true });
  const css  = editor.getCss();

  // Build a complete HTML document that your site will serve
  const page = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>farouk858 — portfolio</title>
<script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"></script>
<style>${css}</style>
</head>
<body>
${html}
</body>
</html>`.trim();

  try {
    // Write to index.html
    const path = 'index.html';
    const sha  = await getFileSha({ token, owner, repo, path, branch });
    await putFile({
      token, owner, repo, path,
      content: page,
      message: 'feat(editor): save from visual editor',
      branch,
      sha
    });

    alert('Saved to GitHub ✔ — GitHub Pages will update shortly.');
  } catch (err) {
    console.error(err);
    alert('Save failed: ' + err.message);
  }
});

// On load, enable Save if already authed
document.addEventListener('DOMContentLoaded', updateButtons);
---------
  
const editor = grapesjs.init({
  container: '#gjs',
  height: '100vh',
  fromElement: false,
  storageManager: {
    type: 'local',        // Start local (browser). We can wire GitHub commits later.
    autosave: true,
    autoload: true,
    stepsBeforeSave: 1
  },
  canvas: {
    // Make <model-viewer> available INSIDE the editor canvas
    scripts: [
      'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js'
    ]
  },
  plugins: [window.modelViewerPlugin],
  pluginsOpts: {}
});

// Starter content (you can delete this once you start designing)
if (!editor.getComponents().length) {
  editor.setComponents(`
    <section style="padding:40px; color:white; background:#000">
      <h1 style="font-family:system-ui;margin:0 0 16px;">farouk858 — new portfolio</h1>
      <p style="font-family:system-ui;opacity:.8;margin:0 0 24px;">
        Drag a <strong>3D Model</strong> block from the <em>3D</em> category.
      </p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
        <model-viewer src="models/sample.glb" alt="Sample"
          camera-controls disable-zoom auto-rotate
          style="width:100%;height:420px;background:transparent"
          exposure="1.2" shadow-intensity="1" environment-image="neutral"></model-viewer>
        <div>
          <h2 style="font-family:system-ui;margin-top:0;">Content</h2>
          <p style="font-family:system-ui;">Add text, images, and more sections.</p>
        </div>
      </div>
    </section>
  `);
}

// Quick export helper: download current HTML
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
  }
});

