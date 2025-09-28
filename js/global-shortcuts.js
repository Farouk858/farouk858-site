// js/global-shortcuts.js
// Global keyboard shortcuts for ALL site pages

document.addEventListener('keydown', (e) => {
  if (e.shiftKey && (e.key || '').toLowerCase() === 'a') {
    e.preventDefault();
    // Always send to your editor page
    window.location.href = '/farouk858-site/editor.html';
  }
});
