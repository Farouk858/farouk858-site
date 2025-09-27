// js/blocks-plugin.js — layout/media blocks similar to Cargo/ReadyMag basics
(function () {
  function blocksPlugin(editor) {
    const bm = editor.BlockManager;

    const baseFont = 'system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif';

    // --- Section / Container ---
    bm.add('sec', {
      label: 'Section',
      category: 'Layout',
      content: `<section style="padding:60px 6vw;background:#000;color:#fff;font-family:${baseFont}">
  <h2 style="margin:0 0 12px;">Section title</h2>
  <p style="opacity:.8;max-width:60ch;margin:0">Add text, images, and more sections.</p>
</section>`
    });

    bm.add('container', {
      label: 'Container',
      category: 'Layout',
      content: `<div style="max-width:1200px;margin:0 auto;padding:40px 4vw;color:#fff;font-family:${baseFont}">
  <h3 style="margin:0 0 10px;">Container</h3>
  <p style="opacity:.8;margin:0">Content inside centered container.</p>
</div>`
    });

    // --- Columns via CSS Grid ---
    const colGrid = (n) => `
<section style="padding:40px 6vw;background:#000;color:#fff;font-family:${baseFont}">
  <div style="display:grid;gap:24px;grid-template-columns:repeat(${n},minmax(0,1fr));align-items:start">
    ${'<div style="background:#111;padding:24px;border-radius:14px;min-height:120px"></div>'.repeat(n)}
  </div>
</section>`;
    bm.add('cols-2', { label: '2 Columns', category:'Layout', content: colGrid(2) });
    bm.add('cols-3', { label: '3 Columns', category:'Layout', content: colGrid(3) });
    bm.add('cols-4', { label: '4 Columns', category:'Layout', content: colGrid(4) });

    // --- Image (GIF/WebP supported by <img>) ---
    bm.add('img', {
      label: 'Image',
      category: 'Media',
      content: `<figure style="margin:0;padding:0;text-align:left">
  <img src="assets/sample.webp" alt="Image" style="max-width:100%;height:auto;display:block;border-radius:12px"/>
  <figcaption style="font:12px ${baseFont};color:#9aa;opacity:.8;margin-top:8px">Caption</figcaption>
</figure>`
    });

    // --- Video (HTML5) ---
    bm.add('video', {
      label: 'Video',
      category: 'Media',
      content: `<video controls playsinline style="width:100%;border-radius:12px;background:#000">
  <source src="assets/sample.mp4" type="video/mp4"/>
  Sorry, your browser doesn't support embedded videos.
</video>`
    });

    // --- YouTube / Vimeo embeds ---
    bm.add('youtube', {
      label: 'YouTube',
      category: 'Media',
      content: `<div style="position:relative;padding-top:56.25%;border-radius:12px;overflow:hidden;background:#000">
  <iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
    title="YouTube video" allowfullscreen
    style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe>
</div>`
    });

    bm.add('vimeo', {
      label: 'Vimeo',
      category: 'Media',
      content: `<div style="position:relative;padding-top:56.25%;border-radius:12px;overflow:hidden;background:#000">
  <iframe src="https://player.vimeo.com/video/76979871?h=bf2a1b5f5f"
    title="Vimeo video" allowfullscreen
    style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe>
</div>`
    });

    // --- Button ---
    bm.add('btn', {
      label: 'Button',
      category: 'Elements',
      content: `<a href="#" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#14ff72;color:#001;
  text-decoration:none;font:600 14px/1 ${baseFont};box-shadow:0 8px 20px rgba(20,255,114,.25)">Button</a>`
    });

    // --- Divider / Spacer ---
    bm.add('divider', {
      label: 'Divider',
      category: 'Elements',
      content: `<hr style="height:1px;border:0;background:linear-gradient(90deg,transparent,#333,transparent);margin:32px 0" />`
    });
    bm.add('spacer', {
      label: 'Spacer',
      category: 'Elements',
      content: `<div style="height:48px"></div>`
    });

    // --- Grid Gallery (auto-fit) ---
    bm.add('grid-gallery', {
      label: 'Grid Gallery',
      category: 'Media',
      content: `<section style="padding:40px 6vw;background:#000;color:#fff">
  <div style="display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">
    <img src="assets/sample.webp" style="width:100%;height:auto;border-radius:10px;display:block" alt="">
    <img src="assets/sample.webp" style="width:100%;height:auto;border-radius:10px;display:block" alt="">
    <img src="assets/sample.webp" style="width:100%;height:auto;border-radius:10px;display:block" alt="">
    <img src="assets/sample.webp" style="width:100%;height:auto;border-radius:10px;display:block" alt="">
  </div>
</section>`
    });

    // --- Hero ---
    bm.add('hero', {
      label: 'Hero',
      category: 'Layout',
      content: `<section style="min-height:60vh;display:grid;place-items:center;padding:60px 6vw;background:#000;color:#fff;text-align:center;font-family:${baseFont}">
  <div>
    <h1 style="font-size:clamp(36px,6vw,72px);margin:0 0 10px">Project Title</h1>
    <p style="opacity:.8;max-width:70ch;margin:0 auto 20px">Short intro paragraph about your work.</p>
    <a href="#" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#14ff72;color:#001;text-decoration:none;font:600 14px/1 ${baseFont}">See more</a>
  </div>
</section>`
    });

    // --- Page Link (handy for multi-page nav) ---
    bm.add('page-link', {
      label: 'Page Link',
      category: 'Navigation',
      content: `<a href="/pages/about.html" style="color:#7ee787;text-decoration:none;font-family:${baseFont}">Go to About →</a>`
    });
  }

  window.blocksPlugin = blocksPlugin;
})();
