// js/global-shortcuts.js
// On any public page, Shift + A → Sign-in page (not the editor directly)

document.addEventListener('keydown', (e) => {
  if (e.shiftKey && (e.key || '').toLowerCase() === 'a') {
    e.preventDefault();
    window.location.href = '/farouk858-site/signin.html';
  }
});
