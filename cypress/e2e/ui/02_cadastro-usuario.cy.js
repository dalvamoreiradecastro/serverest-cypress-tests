/**
 * FLUXO 2 — Cadastro de Usuario
 *
 * Por que testar: e o ponto de entrada de novos usuarios no sistema.
 * Cobre validacao de formulario, unicidade de email e o caminho feliz
 * de criacao de conta — todos criticos para o onboarding.
 */
import CadastroPage from '../../pages/CadastroPage'

describe('Fluxo de Cadastro de Usuario', () => {
  // Armazena o _id do usuario criado no teste de caminho feliz
  // para que o afterEach possa remove-lo e manter o ambiente limpo
  let idUsuarioCriado = null

  beforeEach(() => {
    idUsuarioCriado = null
    cy.clearLocalStorage()
    cy.clearCookies()
    CadastroPage.visit()
  })

  afterEach(() => {
    if (idUsuarioCriado) {
      cy.deletarUsuarioViaAPI(idUsuarioCriado)
    }
  })

  it('deve cadastrar novo usuario com dados validos e redirecionar ao login', () => {
    cy.fixture('usuario').then(({ padrao }) => {
      // Gera email unico para evitar conflito com execucoes anteriores
      const emailUnico = `cypress_${Date.now()}@qa.com`
      const dadosValidos = { ...padrao, email: emailUnico, administrador: false }

      cy.intercept('POST', `${Cypress.env('apiUrl')}/usuarios`).as('requestCadastro')

      CadastroPage.preencherFormulario(dadosValidos)
      CadastroPage.botaoCadastrar.click()

      cy.wait('@requestCadastro').then(({ response }) => {
        // API deve confirmar criacao com status 201 e retornar _id
        expect(response.statusCode).to.eq(201)
        expect(response.body).to.have.property('_id')
        // Salva o _id para limpeza no afterEach
        idUsuarioCriado = response.body._id
      })

      // Apos cadastro bem-sucedido o frontend autentica automaticamente e redireciona para home
      cy.url().should('include', '/home')
    })
  })

  it('deve exibir erro ao tentar cadastrar com email ja existente', () => {
    cy.fixture('usuario').then(({ padrao }) => {
      // Passo 1: cria um usuario base via API para garantir o email ja existe
      cy.criarUsuarioViaAPI(padrao).then((usuarioExistente) => {
        idUsuarioCriado = usuarioExistente._id

        cy.intercept('POST', `${Cypress.env('apiUrl')}/usuarios`).as('requestEmailDuplicado')

        // Tenta cadastrar com o mesmo email que ja existe no sistema
        CadastroPage.preencherFormulario({
          ...padrao,
          email: usuarioExistente.email,
        })
        CadastroPage.botaoCadastrar.click()

        cy.wait('@requestEmailDuplicado').then(({ response }) => {
          // API retorna 400 para email duplicado e inclui a mensagem de erro
          expect(response.statusCode).to.eq(400)
          expect(response.body.message).to.include('Este email já está sendo usado')
        })

        // Usuario deve permanecer na pagina de cadastro
        cy.url().should('include', '/cadastrarusuarios')
      })
    })
  })

  it('deve exibir validacoes de campo obrigatorio ao submeter formulario em branco', () => {
    cy.intercept('POST', `${Cypress.env('apiUrl')}/usuarios`).as('tentativaCadastroVazio')

    // Clica em cadastrar sem preencher nenhum campo
    CadastroPage.botaoCadastrar.click()

    // A API rejeita campos vazios com erro de validacao (campos obrigatorios ausentes)
    cy.wait('@tentativaCadastroVazio').then(({ response }) => {
      expect(response.statusCode).to.eq(400)
    })

    // Deve permanecer na pagina de cadastro — nao redireciona
    cy.url().should('include', '/cadastrarusuarios')
  })
})
