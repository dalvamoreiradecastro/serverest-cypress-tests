/**
 * FLUXO 1 — Autenticacao (Login)
 *
 * Por que testar: o login e o gateway de toda a aplicacao.
 * Sem autenticacao valida nenhuma feature e acessivel.
 * Validamos o caminho feliz, erro de credenciais e validacao de campos.
 */
import LoginPage from '../pages/LoginPage'

describe('Fluxo de Autenticacao', () => {
  // Dados compartilhados entre os testes do bloco
  let usuario

  before(() => {
    // Cria um usuario real via API antes do bloco de testes para garantir
    // que as credenciais existam independentemente do estado do servidor
    cy.fixture('usuario').then(({ admin }) => {
      cy.criarUsuarioViaAPI(admin).then((criado) => {
        usuario = criado
      })
    })
  })

  after(() => {
    // Garante que o usuario de teste e removido ao fim do bloco,
    // mantendo o ambiente limpo para outras suites
    if (usuario?._id) {
      cy.deletarUsuarioViaAPI(usuario._id)
    }
  })

  beforeEach(() => {
    cy.clearLocalStorage()
    LoginPage.visit()
  })

  it('deve realizar login com credenciais validas e redirecionar a pagina inicial', () => {
    // Intercepta a chamada que o FRONTEND (front.serverest.dev) faz para a API (serverest.dev/login)
    // cy.intercept nao navega para lugar nenhum — apenas "escuta" requests do browser
    cy.intercept('POST', `${Cypress.env('apiUrl')}/login`).as('requestLogin')

    LoginPage.preencherEmail(usuario.email)
    LoginPage.preencherSenha(usuario.password)
    LoginPage.botaoEntrar.click()

    cy.wait('@requestLogin').then(({ response }) => {
      // Valida que a API retornou token de autorizacao
      expect(response.statusCode).to.eq(200)
      expect(response.body).to.have.property('authorization')
    })

    // Apos login bem-sucedido o app deve navegar para a listagem de produtos
    cy.url().should('include', '/home')
    LoginPage.botaoEntrar.should('not.exist')
  })

  it('deve exibir mensagem de erro ao informar senha incorreta', () => {
    cy.fixture('usuario').then(({ invalido }) => {
      cy.intercept('POST', `${Cypress.env('apiUrl')}/login`).as('requestLoginInvalido')

      LoginPage.preencherEmail(usuario.email)
      // Usa senha invalida para um email valido (usuario existe mas senha e errada)
      LoginPage.preencherSenha(invalido.password)
      LoginPage.botaoEntrar.click()

      cy.wait('@requestLoginInvalido').then(({ response }) => {
        expect(response.statusCode).to.eq(401)
        // Valida a mensagem de erro retornada pela API
        expect(response.body.message).to.eq('Email e/ou senha inválidos')
      })

      // Deve permanecer na pagina de login — nao redireciona
      cy.url().should('include', '/login')
    })
  })

  it('deve bloquear login quando os campos obrigatorios estao em branco', () => {
    cy.intercept('POST', `${Cypress.env('apiUrl')}/login`).as('tentativaLoginVazio')

    // Tenta submeter sem preencher nenhum campo
    LoginPage.botaoEntrar.click()

    // A API rejeita campos vazios com erro de validacao (campos obrigatorios ausentes)
    cy.wait('@tentativaLoginVazio').then(({ response }) => {
      expect(response.statusCode).to.eq(400)
    })

    // Deve permanecer na pagina de login — nao redireciona
    cy.url().should('include', '/login')
  })
})
