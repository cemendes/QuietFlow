import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    // Vite's dev server port (see vite.config.ts: strictPort on 1420).
    // With baseUrl set, cy.visit('/') resolves against it.
    baseUrl: 'http://localhost:1420',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    viewportWidth: 1200,
    viewportHeight: 800,
    video: false,
  },
});
