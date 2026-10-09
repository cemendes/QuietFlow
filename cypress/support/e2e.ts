// Loaded automatically before every spec file.
// Shared custom commands and global hooks go here.

// The app picks its language from the system locale on first launch. Specs select elements by
// English text, so pin English before the app boots — unless a spec already chose a language.
Cypress.on('window:before:load', (win) => {
  if (!win.localStorage.getItem('quietflow-language')) {
    win.localStorage.setItem('quietflow-language', 'en');
  }
});
