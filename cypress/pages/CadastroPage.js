/**
 * Page Object para a tela de Cadastro de Usuario (/cadastrousuarios)
 */
class CadastroPage {
  // --- Seletores ---

  get nomeInput() {
    return cy.get('[data-testid="nome"]')
  }

  get emailInput() {
    return cy.get('[data-testid="email"]')
  }

  get passwordInput() {
    return cy.get('[data-testid="password"]')
  }

  get checkboxAdministrador() {
    // Checkbox que marca o usuario como administrador
    return cy.get('[data-testid="checkbox"]')
  }

  get botaoCadastrar() {
    return cy.get('[data-testid="cadastrar"]')
  }

  // --- Acoes ---

  visit() {
    cy.visit('/cadastrarusuarios')
  }

  preencherFormulario({ nome, email, password, administrador = false }) {
    if (nome) this.nomeInput.clear().type(nome)
    if (email) this.emailInput.clear().type(email)
    if (password) this.passwordInput.clear().type(password, { log: false })
    if (administrador) this.checkboxAdministrador.check()
  }

  submeter() {
    cy.intercept('POST', `${Cypress.env('apiUrl')}/usuarios`).as('requestCadastro')
    this.botaoCadastrar.click()
    return cy.wait('@requestCadastro')
  }

  cadastrar(dados) {
    this.preencherFormulario(dados)
    return this.submeter()
  }
}

export default new CadastroPage()
