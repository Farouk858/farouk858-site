// js/blocks-core.js
// Core element palette for the 858 Builder

(function () {
  if (!window.grapesjs) return;

  const plugin = (editor) => {
    const bm = editor.BlockManager;

    // ---------- Section ----------
    bm.add('blk-section', {
      label: 'Section',
      category: 'Layout',
      attributes: { class: 'gjs-block-section' },
      content: `
        <section style="padding:60px 6vw; background:#000; color:#fff">
          <h2 style="margin:0 0 16px; font-family:system-ui">Section</h2>
          <p style="opacity:.8; font-family:system-ui">Add content here.</p>
        </section>
      `,
    });

    // ---------- 2 Columns ----------
    bm.add('blk-2col', {
      label: '2 Columns',
      category: 'Layout',
      content: `
        <section style="padding:40px 6vw; background:#000; color:#fff">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px; align-items:start">
            <div>
              <h3 style="margin:0 0 10px; font-family:system-ui">Left</h3>
              <p style="opacity:.8; font-family:system-ui">Text…</p>
            </div>
            <div>
              <h3 style="margin:0 0 10px; font-family:system-ui">Right</h3>
              <p style="opacity:.8; font-family:system-ui">Text…</p>
            </div>
          </div>
        </section>
      `,
    });

    // ---------- Heading ----------
    bm.add('blk-heading', {
      label: 'Heading',
      category: 'Text',
      content: `<h1 style="margin:0; font-family:system-ui; color:#fff">Heading</h1>`,
    });

    // ---------- Paragraph ----------
    bm.add('blk-paragraph', {
      label: 'Paragraph',
      category: 'Text',
      content: `<p style="margin:0; font-family:system-ui; color:#ddd">Paragraph text…</p>`,
    });

    // ---------- Button ----------
    bm.add('blk-button', {
      label: 'Button',
      category: 'Controls',
      content: `
        <a href="#" style="
          display:inline-block; padding:12px 16px; border-radius:10px;
          background:#1f6feb; color:#fff; text-decoration:none; font-weight:700; font-family:system-ui;
          box-shadow:0 10px 30px rgba(31,110,235,.35)
        ">Button</a>
      `,
    });

    // ---------- Image (supports png/jpg/webp/gif) ----------
    bm.add('blk-image', {
      label: 'Image',
      category: 'Media',
      content: `<img src="https://picsum.photos/900/600" alt="Image" style="width:100%; height:auto; display:block" />`,
    });

    // ---------- Video (HTML5) ----------
    bm.add('blk-video', {
      label: 'Video',
      category: 'Media',
      content: `
        <video controls style="width:100%; display:block">
          <source src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" type="video/mp4">
        </video>
      `,
    });

    // ---------- Embed (iframe) ----------
    bm.add('blk-embed', {
      label: 'Embed',
      category: 'Media',
      content: `
        <div style="position:relative; padding-top:56.25%; background:#000">
          <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  style="position:absolute; inset:0; width:100%; height:100%; border:0"></iframe>
        </div>
      `,
    });

    // ---------- Divider ----------
    bm.add('blk-divider', {
      label: 'Divider',
      category: 'Layout',
      content: `<hr style="border:none; height:1px; background:linear-gradient(90deg,transparent,#444,transparent); margin:24px 0" />`,
    });

    // ---------- Spacer ----------
    bm.add('blk-spacer', {
      label: 'Spacer',
      category: 'Layout',
      content: `<div style="height:48px"></div>`,
    });

    // ---------- Page Link (visual nav item) ----------
    bm.add('blk-page-link', {
      label: 'Page Link',
      category: 'Navigation',
      content: `
        <a href="pages/about.html" style="
          display:inline-block; padding:10px 14px; border-radius:999px;
          background:#222; color:#fff; text-decoration:none; border:1px solid #333; font-family:system-ui;
        ">Go to About</a>
      `,
    });

    // ---------- 3D Model (model-viewer) ----------
    bm.add('blk-3d-model', {
      label: '3D Model',
      category: '3D',
      content: `
        <model-viewer src="models/sample.glb" alt="3D"
          camera-controls auto-rotate disable-zoom
          exposure="1.2" shadow-intensity="1" environment-image="neutral"
          style="width:100%; height:420px; background:transparent"></model-viewer>
      `,
    });

    // Nice order in sidebar
    bm.getCategories().forEach(cat => cat.set('open', true));
  };

  // Auto-register plugin when editor boots
  if (!window._858_blocks_registered) {
    window._858_blocks_registered = true;
    grapesjs.plugins.add('blocks-core-858', plugin);
    // If editor already exists, apply now; otherwise editor.js will init and pick it up.
    if (window.editor) plugin(window.editor);
  }
})();
