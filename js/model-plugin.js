// js/model-plugin.js — adds a <model-viewer> block and component traits
(function () {
  function plugin(editor) {
    const bm = editor.BlockManager;
    const dc = editor.DomComponents;

    bm.add('block-3d-model', {
      label: '3D Model',
      category: '3D',
      content: `
        <model-viewer
          src="models/sample.glb"
          alt="3D object"
          style="width:100%;height:420px;background:transparent"
          camera-controls
          disable-zoom
          auto-rotate
          exposure="1.2"
          shadow-intensity="1"
          environment-image="neutral">
        </model-viewer>
      `
    });

    dc.addType('model-viewer', {
      isComponent: el => el.tagName && el.tagName.toLowerCase() === 'model-viewer',
      model: {
        defaults: {
          tagName: 'model-viewer',
          traits: [
            { type: 'text', name: 'src', label: 'Model (GLB/GLTF)' },
            { type: 'text', name: 'alt', label: 'Alt text' },
            { type: 'checkbox', name: 'camera-controls', label: 'Orbit Controls' },
            { type: 'checkbox', name: 'disable-zoom', label: 'Disable Zoom' },
            { type: 'checkbox', name: 'auto-rotate', label: 'Auto Rotate' },
            { type: 'text', name: 'rotation-per-second', label: 'Rotate Speed (e.g. 60deg)' },
            { type: 'number', name: 'exposure', label: 'Exposure', min: 0, max: 3, step: 0.1 },
            { type: 'number', name: 'shadow-intensity', label: 'Shadow', min: 0, max: 2, step: 0.1 },
            { type: 'text', name: 'environment-image', label: 'Environment (neutral/studio/URL)' },
          ],
          styles: { width: '100%', height: '420px' }
        }
      }
    });
  }
  window.modelViewerPlugin = plugin;
})();
