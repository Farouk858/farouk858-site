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

