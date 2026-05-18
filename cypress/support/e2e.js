// Ponto de entrada do suporte Cypress para testes E2E.
// Importa os custom commands tornando-os disponiveis globalmente.
import './commands'

afterEach(function () {
  const match = Cypress.spec.relative.match(/(\d{2})_/)
  const cenario = match ? match[1] : 'other'
  if (this.currentTest.state === 'passed') {
    cy.screenshot(`${cenario}/sucesso/${this.currentTest.fullTitle()}`)
  }
})
