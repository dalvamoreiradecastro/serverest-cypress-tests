const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    baseUrl: 'https://front.serverest.dev',
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: 'cypress/support/e2e.js',

    // Dimensoes representativas de desktop (evita problemas de layout responsivo)
    viewportWidth: 1280,
    viewportHeight: 720,

    video: false,
    screenshotOnRunFailure: false,

    defaultCommandTimeout: 10000,
    pageLoadTimeout: 30000,
    requestTimeout: 15000,

    // 1 retry em CI para absorver flakiness de rede; 0 em desenvolvimento
    retries: {
      runMode: 1,
      openMode: 0,
    },

    env: {
      // URL base da API — sem barra final
      apiUrl: 'https://serverest.dev',
    },

    setupNodeEvents(on, config) {
      // Espaco para plugins futuros (code coverage, relatórios, etc.)
    },
  },
})
