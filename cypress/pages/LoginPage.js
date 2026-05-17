/**
 * Page Object para a tela de Login (/login)
 * Centraliza seletores e acoes da pagina de autenticacao.
 */
class LoginPage {
  // --- Seletores ---

  get emailInput() {
    return cy.get('[data-testid="email"]')
  }

  get passwordInput() {
    return cy.get('[data-testid="senha"]')
  }

  get botaoEntrar() {
    return cy.get('[data-testid="entrar"]')
  }

  get linkCadastro() {
    // Link que leva o usuario a criar uma conta nova
    return cy.get('[data-testid="cadastrar"]')
  }

  // --- Acoes ---

  visit() {
    cy.visit('/login')
  }

  preencherEmail(email) {
    this.emailInput.clear().type(email)
  }

  preencherSenha(senha) {
    this.passwordInput.clear().type(senha, { log: false })
  }

  submeter() {
    cy.intercept('POST', `${Cypress.env('apiUrl')}/login`).as('requestLogin')
    this.botaoEntrar.click()
    return cy.wait('@requestLogin')
  }

  realizarLogin(email, senha) {
    this.preencherEmail(email)
    this.preencherSenha(senha)
    return this.submeter()
  }
}

export default new LoginPage()
