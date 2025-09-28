// js/blocks-core.js
(function () {
  function plugin(editor) {
    const bm = editor.BlockManager;
    const domc = editor.DomComponents;

    // ---------------- Blocks ----------------
    bm.add('blk-section', {
      label: 'Section', category: 'Layout',
      content: `
        <section style="padding:60px 6vw; background:#000; color:#fff">
          <h2 style="margin:0 0 16px; font-family:system-ui">Section</h2>
          <p style="opacity:.8; font-family:system-ui">Add content here.</p>
        </section>`
    });

    bm.add('blk-2col', {
      label: '2 Columns', category: 'Layout',
      content: `
        <section style="padding:40px 6vw; background:#000; color:#fff">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px; align-items:start">
            <div><h3 style="margin:0 0 10px; font-family:system-ui">Left</h3><p style="opacity:.8; font-family:system-ui">Text…</p></div>
            <div><h3 style="margin:0 0 10px; font-family:system-ui">Right</h3><p style="opacity:.8; font-family:system-ui">Text…</p></div>
          </div>
        </section>`
    });

    bm.add('blk-heading', { label: 'Heading', category: 'Text',
      content: `<h1 style="margin:0; font-family:system-ui; color:#fff">Heading</h1>` });

    bm.add('blk-paragraph', { label: 'Paragraph', category: 'Text',
      content: `<p style="margin:0; font-family:system-ui; color:#ddd">Paragraph text…</p>` });

    bm.add('blk-button', { label: 'Button', category: 'Controls',
      content: `<a href="#" style="display:inline-block; padding:12px 16px; border-radius:10px;
                background:#1f6feb; color:#fff; text-decoration:none; font-weight:700; font-family:system-ui;
                box-shadow:0 10px 30px rgba(31,110,235,.35)">Button</a>` });

    bm.add('blk-image', { label: 'Image', category: 'Media',
      content: `<img src="https://picsum.photos/900/600" alt="Image" style="width:100%; height:auto; display:block" />` });

    // Video block
    bm.add('blk-video', { label: 'Video', category: 'Media',
      content: `<video controls style="width:100%; display:block"><source src="" type="video/mp4"></video>` });

    bm.add('blk-embed', { label: 'Embed', category: 'Media',
      content: `<div style="position:relative; padding-top:56.25%; background:#000">
                 <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                   allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                   style="position:absolute; inset:0; width:100%; height:100%; border:0"></iframe>
               </div>` });

    bm.add('blk-divider', { label: 'Divider', category: 'Layout',
      content: `<hr style="border:none; height:1px; background:linear-gradient(90deg,transparent,#444,transparent); margin:24px 0" />` });

    bm.add('blk-spacer', { label: 'Spacer', category: 'Layout',
      content: `<div style="height:48px"></div>` });

    bm.add('blk-page-link', { label: 'Page Link', category: 'Navigation',
      content: `<a href="pages/about.html" style="display:inline-block; padding:10px 14px; border-radius:999px;
                background:#222; color:#fff; text-decoration:none; border:1px solid #333; font-family:system-ui;">Go to About</a>` });

    // 3D model block
    bm.add('blk-3d-model', { label: '3D Model', category: '3D',
      content: `<model-viewer src="" alt="3D"
                 camera-controls auto-rotate disable-zoom
                 exposure="1.2" shadow-intensity="1" environment-image="neutral"
                 style="width:100%; height:420px; background:transparent"></model-viewer>` });

    // ---------------- Components with traits + file picker ----------------
    // <video> component
    domc.addType('video', {
      isComponent: el => el.tagName === 'VIDEO',
      model: {
        defaults: {
          traits: [
            { type: 'text', name: 'src', label: 'Source (mp4/webm)' },
            { type: 'checkbox', name: 'autoplay' },
            { type: 'checkbox', name: 'loop' },
            { type: 'checkbox', name: 'muted' },
            { type: 'checkbox', name: 'controls', value: true },
          ],
          script: function () { /* no-op */ }
        },
        init() {
          this.on('dblclick', () => {
            if (window._858_pickAsset) {
              window._858_pickAsset((url) => {
                this.addAttributes({ src: url });
                // also set <source> if present
                const srcEl = this.view.el.querySelector('source');
                if (srcEl) srcEl.src = url;
                this.view.el.load?.();
              }, ['video/mp4','video/webm','video/quicktime','video/*']);
            }
          });
        }
      }
    });

    // <model-viewer> component
    domc.addType('model-viewer', {
      isComponent: el => el.tagName === 'MODEL-VIEWER',
      model: {
        defaults: {
          droppable: false,
          traits: [
            { type: 'text', name: 'src', label: 'Model (glb/gltf/usdz)' },
            { type: 'text', name: 'poster', label: 'Poster (image)' },
            { type: 'checkbox', name: 'camera-controls', label: 'Camera controls', value: true },
            { type: 'checkbox', name: 'auto-rotate', label: 'Auto rotate', value: true },
            { type: 'checkbox', name: 'disable-zoom', label: 'Disable zoom', value: true },
          ]
        },
        init() {
          this.on('dblclick', () => {
            if (window._858_pickAsset) {
              window._858_pickAsset((url) => {
                this.addAttributes({ src: url });
              }, ['model/gltf-binary','model/gltf+json','model/usd','model/*','application/octet-stream']);
            }
          });
        }
      }
    });

    // Open categories
    bm.getCategories().forEach(cat => cat.set('open', true));
  }

  if (window.grapesjs) {
    window.grapesjs.plugins.add('blocks-core-858', plugin);
  }
})();
