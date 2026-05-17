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
 *  - Comprador criado PRIMEIRO no before() para garantir credenciais sempre definidas
 *  - Admin e produto criados via API para isolamento
 *  - beforeEach() cancela carrinho API residual antes de cada teste
 *  - after() faz limpeza completa de usuarios e produto
 */
import ListaProdutosPage from '../pages/ListaProdutosPage'
import CarrinhoPage from '../pages/CarrinhoPage'

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
    cy.fixture('usuario').then(({ admin, padrao }) => {
      cy.fixture('produto').then(({ valido: produtoBase }) => {
        // 1. Cria o comprador PRIMEIRO — garante que as variaveis estejam definidas
        //    mesmo que a criacao do produto falhe depois
        cy.criarUsuarioViaAPI(padrao).then((comprador) => {
          compradorId = comprador._id
          compradorEmail = comprador.email
          compradorPassword = comprador.password
        })

        // 2. Cria admin e autentica para obter token de criacao de produto
        cy.criarUsuarioViaAPI(admin).then((adminCriado) => {
          adminId = adminCriado._id

          cy.loginViaAPI(adminCriado.email, adminCriado.password).then((token) => {
            adminToken = token

            // 3. Cria o produto via API — necessario para o teste de listagem e compra
            cy.criarProdutoViaAPI(produtoBase, adminToken).then((produto) => {
              produtoCriado = produto
            })
          })
        })
      })
    })
  })

  after(() => {
    // Cancela carrinho residual, remove produto e ambos os usuarios
    if (compradorEmail && compradorPassword) {
      cy.loginViaAPI(compradorEmail, compradorPassword).then((token) => {
        cy.cancelarCarrinhoViaAPI(token)
      })
    }
    if (produtoCriado?._id && adminToken) {
      cy.deletarProdutoViaAPI(produtoCriado._id, adminToken)
    }
    if (adminId) cy.deletarUsuarioViaAPI(adminId)
    if (compradorId) cy.deletarUsuarioViaAPI(compradorId)
  })

  beforeEach(() => {
    // Cancela qualquer carrinho API residual de execucoes anteriores
    cy.loginViaAPI(compradorEmail, compradorPassword).then((token) => {
      cy.cancelarCarrinhoViaAPI(token)
    })

    // Restaura sessao autenticada do comprador (cy.session reutiliza cache)
    cy.sessaoAutenticada(compradorEmail, compradorPassword)
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
