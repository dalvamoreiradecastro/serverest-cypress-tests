/**
 * FLUXO 3 — Jornada de Compra (Listagem → Lista Local → Carrinho via API)
 *
 * Por que testar: e o fluxo de conversao central da aplicacao.
 *
 * Como o frontend realmente funciona (ServeRest/front, branch main):
 *  1. /home           → exibe listagem de produtos (CardList com Cards)
 *  2. adicionarNaLista → salva no Cart service (localStorage) e navega para
 *                         /minhaListaDeProdutos automaticamente (sem POST /carrinhos)
 *  3. /minhaListaDeProdutos → exibe itens do carrinho local; botao "checkout-products"
 *                              apenas navega para /carrinho (sem API call)
 *  4. /carrinho       → pagina em construcao, sem interacao implementada
 *
 *  Como consequencia, POST /carrinhos e DELETE /carrinhos/concluir-compra
 *  NAO sao disparados pela UI. O teste 3 valida esse fluxo via API diretamente.
 *
 * Estrategia de dados:
 *  - Comprador criado em beforeEach() para resistir a resets do banco do ServeRest
 *  - Admin e produto criados uma unica vez no before() (via API) para isolamento
 *  - afterEach() cancela carrinho e remove comprador apos cada teste
 *  - after() remove produto e admin ao final da suite
 */
import ListaProdutosPage from '../../pages/ListaProdutosPage'
import CarrinhoPage from '../../pages/CarrinhoPage'

Cypress.on('uncaught:exception', (err) => {
  if (err.message.includes("Cannot read properties of null (reading 'document')")) {
    return false
  }
})

describe('Fluxo de Jornada de Compra', () => {
  let adminToken
  let adminId
  let produtoCriado
  let compradorId
  let compradorEmail
  let compradorPassword

  before(() => {
    cy.fixture('usuario').then(({ admin }) => {
      cy.fixture('produto').then(({ valido: produtoBase }) => {
        cy.criarUsuarioViaAPI(admin).then((adminCriado) => {
          adminId = adminCriado._id

          cy.loginViaAPI(adminCriado.email, adminCriado.password).then((token) => {
            adminToken = token

            cy.criarProdutoViaAPI(produtoBase, adminToken).then((produto) => {
              produtoCriado = produto
            })
          })
        })
      })
    })
  })

  after(() => {
    if (produtoCriado?._id && adminToken) {
      cy.deletarProdutoViaAPI(produtoCriado._id, adminToken)
    }
    if (adminId) cy.deletarUsuarioViaAPI(adminId)
  })

  beforeEach(() => {
    cy.fixture('usuario').then(({ padrao }) => {
      // Pre-carrega a pagina de login ANTES de criar o usuario.
      // Isso absorve o tempo de carregamento da pagina na "fila", de modo que
      // a criacao do usuario e o submit do formulario ocorrem em rapida sucessao
      // (~300 ms de janela), reduzindo drasticamente o risco de reset do DB do ServeRest.
      cy.visit('/login')

      cy.criarUsuarioViaAPI(padrao).then((comprador) => {
        compradorId = comprador._id
        compradorEmail = comprador.email
        compradorPassword = comprador.password

        cy.get('[data-testid="email"]').type(compradorEmail)
        cy.get('[data-testid="senha"]').type(compradorPassword, { log: false })
        cy.get('[data-testid="entrar"]').click()
        cy.url().should('include', '/home')
      })
    })
  })

  afterEach(() => {
    // failOnStatusCode: false — se o DB resetou e o usuario ja nao existe,
    // a limpeza falha silenciosamente sem contaminar o resultado do teste
    if (compradorEmail && compradorPassword) {
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/login`,
        body: { email: compradorEmail, password: compradorPassword },
        failOnStatusCode: false,
      }).then(({ status, body }) => {
        if (status === 200 && body.authorization) {
          cy.cancelarCarrinhoViaAPI(body.authorization)
        }
      })
    }
    if (compradorId) cy.deletarUsuarioViaAPI(compradorId)
  })

  // ---------------------------------------------------------------------------

  it('deve exibir a listagem de produtos apos autenticacao', () => {
    // Intercepta a chamada GET que o CardList faz ao montar em /home
    cy.intercept('GET', `${Cypress.env('apiUrl')}/produtos`).as('requestProdutos')

    ListaProdutosPage.visit()

    cy.wait('@requestProdutos').then(({ response }) => {
      expect(response.statusCode).to.eq(200)
      expect(response.body.quantidade).to.be.greaterThan(0)
    })

    // Cada produto renderiza exatamente um botao "adicionarNaLista"
    ListaProdutosPage.cardsProdutos.should('have.length.greaterThan', 0)

    // O produto criado no before() deve estar visivel na listagem
    cy.contains(produtoCriado.nome).should('be.visible')

    // Elementos de navegacao essenciais devem estar presentes
    ListaProdutosPage.botaoLogout.should('be.visible')
    ListaProdutosPage.botaoCarrinho.should('be.visible')
  })

  it('deve adicionar produto a lista local e exibir na lista de compras', () => {
    ListaProdutosPage.visit()

    // Garante que os produtos ja foram carregados
    ListaProdutosPage.cardsProdutos.should('have.length.greaterThan', 0)

    // Clicar em "adicionarNaLista" salva o produto no Cart service (localStorage)
    // e redireciona automaticamente para /minhaListaDeProdutos
    ListaProdutosPage.botaoAdicionarPrimeiroProduto.click()

    // Confirma que o frontend navegou para a lista de compras
    cy.url().should('include', '/minhaListaDeProdutos')

    // O produto adicionado deve aparecer na lista de compras local
    CarrinhoPage.itensDoPedido.should('have.length.greaterThan', 0)
  })

  it('deve criar carrinho via API e finalizar a compra com sucesso', () => {
    // Passo 1 (UI): adiciona produto a lista local para simular a jornada do usuario
    ListaProdutosPage.visit()
    ListaProdutosPage.cardsProdutos.should('have.length.greaterThan', 0)
    ListaProdutosPage.botaoAdicionarPrimeiroProduto.click()

    cy.url().should('include', '/minhaListaDeProdutos')
    CarrinhoPage.itensDoPedido.should('have.length.greaterThan', 0)

    // Passo 2 (API): o frontend nao dispara POST /carrinhos pela UI —
    // a criacao do carrinho e feita diretamente via API
    cy.loginViaAPI(compradorEmail, compradorPassword).then((token) => {
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/carrinhos`,
        headers: { Authorization: token },
        body: { produtos: [{ idProduto: produtoCriado._id, quantidade: 1 }] },
        failOnStatusCode: true,
      }).then(({ body }) => {
        expect(body).to.have.property('_id')

        // Passo 3 (API): finaliza a compra — decrementa estoque e remove o carrinho
        cy.request({
          method: 'DELETE',
          url: `${Cypress.env('apiUrl')}/carrinhos/concluir-compra`,
          headers: { Authorization: token },
          failOnStatusCode: true,
        }).then(({ body: finalBody }) => {
          expect(finalBody.message).to.include('Registro excluído com sucesso')
        })
      })
    })
  })
})
