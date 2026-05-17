const { defineConfig } = require('cypress')
const path = require('path')
const fs = require('fs')

module.exports = defineConfig({
  e2e: {
    baseUrl: 'https://front.serverest.dev',
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: 'cypress/support/e2e.js',
    reporter:'mochawesome',
    
    // Dimensoes representativas de desktop (evita problemas de layout responsivo)
    viewportWidth: 1280,
    viewportHeight: 720,

    video: false,
    screenshotOnRunFailure: true,

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
      const screenshotsFolder = config.screenshotsFolder

      on('after:screenshot', (details) => {
        if (!details.testFailure) return

        const match = details.path.match(/[/\\](\d{2})_/)
        const cenario = match ? match[1] : 'other'
        const newPath = path.join(screenshotsFolder, cenario, 'falha', path.basename(details.path))
        fs.mkdirSync(path.dirname(newPath), { recursive: true })
        fs.renameSync(details.path, newPath)

        return { path: newPath }
      })
    },
  },
})
