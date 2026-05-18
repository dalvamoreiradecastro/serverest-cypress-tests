// ***********************************************
// Custom Commands — reutilizaveis em todos os testes
// ***********************************************

const API_URL = () => Cypress.env('apiUrl')

/**
 * Cria um usuario via API e retorna o objeto com _id e email gerado.
 * Gera um email unico com timestamp para evitar conflitos entre execucoes.
 */
Cypress.Commands.add('criarUsuarioViaAPI', (baseData) => {
  const email = `cypress_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@qa.com`
  const payload = { ...baseData, email }

  return cy
    .request({
      method: 'POST',
      url: `${API_URL()}/usuarios`,
      body: payload,
      failOnStatusCode: true,
    })
    .then(({ body }) => ({ ...payload, _id: body._id }))
})

/**
 * Autentica na API e retorna o Bearer token.
 * Usado internamente para operacoes que exigem autorizacao (ex.: criar produto).
 */
Cypress.Commands.add('loginViaAPI', (email, password) => {
  return cy
    .request({
      method: 'POST',
      url: `${API_URL()}/login`,
      body: { email, password },
      failOnStatusCode: true,
    })
    .then(({ body }) => body.authorization)
})

/**
 * Cria um produto via API utilizando um token de administrador.
 * Produto tem nome unico para evitar colisoes entre runs.
 */
Cypress.Commands.add('criarProdutoViaAPI', (baseData, token) => {
  const nome = `${baseData.nome} ${Date.now()}`
  const payload = { ...baseData, nome }

  return cy
    .request({
      method: 'POST',
      url: `${API_URL()}/produtos`,
      headers: { Authorization: token },
      body: payload,
      failOnStatusCode: true,
    })
    .then(({ body }) => ({ ...payload, _id: body._id }))
})

/**
 * Remove um usuario via API — usado no afterEach para limpeza de dados.
 * failOnStatusCode: false evita falha se o usuario ja foi removido.
 */
Cypress.Commands.add('deletarUsuarioViaAPI', (userId) => {
  cy.request({
    method: 'DELETE',
    url: `${API_URL()}/usuarios/${userId}`,
    failOnStatusCode: false,
  })
})

/**
 * Remove um produto via API — usado no afterEach para limpeza de dados.
 */
Cypress.Commands.add('deletarProdutoViaAPI', (produtoId, token) => {
  cy.request({
    method: 'DELETE',
    url: `${API_URL()}/produtos/${produtoId}`,
    headers: { Authorization: token },
    failOnStatusCode: false,
  })
})

/**
 * Cancela o carrinho ativo do usuario autenticado via API.
 * Restaura o estoque dos produtos antes de limpar dados.
 */
Cypress.Commands.add('cancelarCarrinhoViaAPI', (token) => {
  cy.request({
    method: 'DELETE',
    url: `${API_URL()}/carrinhos/cancelar-compra`,
    headers: { Authorization: token },
    failOnStatusCode: false,
  })
})

/**
 * Estabelece uma sessao autenticada via UI usando cy.session().
 * O Cypress reutiliza a sessao cacheada entre testes, evitando login repetido.
 * A validacao garante que a sessao ainda e valida antes de reutiliza-la.
 */
Cypress.Commands.add('sessaoAutenticada', (email, password) => {
  cy.session(
    // A chave de cache inclui email e password para diferenciar sessoes
    [email, password],
    () => {
      // Registra o intercept ANTES de visitar a pagina para nao perder o request
      cy.intercept('POST', `${Cypress.env('apiUrl')}/login`).as('loginSession')

      // cy.visit usa o baseUrl do cypress.config.js → https://front.serverest.dev/login
      cy.visit('/login')

      cy.get('[data-testid="email"]').type(email)
      cy.get('[data-testid="senha"]').type(password, { log: false })
      cy.get('[data-testid="entrar"]').click()

      // Aguarda a chamada que o FRONTEND faz para https://serverest.dev/login
      // (nao e uma navegacao — e a chamada de API interna do app React)
      cy.wait('@loginSession').its('response.statusCode').should('eq', 200)

      // Apos login, o frontend redireciona para /home (ainda em front.serverest.dev)
      cy.url().should('include', '/home')
    },
    {
      validate() {
        // Verifica se a sessao cached ainda e valida tentando acessar /home
        // Se o token expirou, o frontend redireciona para /login e esta asserção falha,
        // forcando cy.session() a recriar a sessao automaticamente
        cy.visit('/home')
        cy.url().should('include', '/home')
      },
    }
  )
})
