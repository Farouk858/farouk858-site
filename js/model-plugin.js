// Simple <model-viewer> block + traits for GrapesJS
(function () {
  function plugin(editor) {
    const bm = editor.BlockManager;
    const dc = editor.DomComponents;

    // Block to drag/drop
    bm.add('block-3d-model', {
      label: '3D Model',
      category: '3D',
      content: `
        <model-viewer
          src="models/sample.glb"
          alt="3D object"
          style="width:100%;height:400px;background:transparent"
          camera-controls
          disable-zoom
          auto-rotate
          exposure="1.2"
          shadow-intensity="1"
          environment-image="neutral">
        </model-viewer>
      `
    });

    // Component type for <model-viewer>
    dc.addType('model-viewer', {
      isComponent: el => el.tagName === 'MODEL-VIEWER',
      model: {
        defaults: {
          tagName: 'model-viewer',
          traits: [
            { type: 'text', name: 'src', label: 'Model (GLB/GLTF)' },
            { type: 'text', name: 'alt', label: 'Alt text' },
            { type: 'checkbox', name: 'camera-controls', label: 'Orbit Controls' },
            { type: 'checkbox', name: 'disable-zoom', label: 'Disable Zoom' },
            { type: 'checkbox', name: 'auto-rotate', label: 'Auto Rotate' },
            { type: 'number', name: 'exposure', label: 'Exposure', min:0, max:2, step:0.1 },
            { type: 'number', name: 'shadow-intensity', label: 'Shadow', min:0, max:2, step:0.1 },
            { type: 'text', name: 'environment-image', label: 'Environment', placeholder: 'neutral | studio | URL' },
            { type: 'text', name: 'rotation-per-second', label: 'Rotate Speed (e.g. 60deg)' },
          ],
          // Basic styles for resizing in canvas
          styles: { width: '100%', height: '400px' }
        }
      }
    });
  }

  if (typeof window !== 'undefined') window.modelViewerPlugin = plugin;
})();

