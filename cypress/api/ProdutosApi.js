import { DOMAIN, ENDPOINTS } from '../constants/Urls'

export class ProdutosApi {
  /**
   * Lista produtos. Aceita query params para filtros (ex.: { nome: 'Notebook' }).
   * Retorna: { quantidade: N, produtos: [...] }
   */
  static listar(params = {}) {
    return cy.request({
      method: 'GET',
      url: `${DOMAIN()}${ENDPOINTS.PRODUTOS}`,
      qs: params,
      failOnStatusCode: false,
    })
  }

  /**
   * Busca produto pelo _id.
   * Retorna 400 com mensagem de erro se o ID não for encontrado.
   */
  static buscarPorId(id) {
    return cy.request({
      method: 'GET',
      url: `${DOMAIN()}${ENDPOINTS.PRODUTOS}/${id}`,
      failOnStatusCode: false,
    })
  }

  /**
   * Cria produto. Requer token de administrador.
   * token=null → 401, não-admin → 403, nome duplicado → 400.
   */
  static criar(payload, token) {
    const headers = token ? { Authorization: token } : {}
    return cy.request({
      method: 'POST',
      url: `${DOMAIN()}${ENDPOINTS.PRODUTOS}`,
      headers,
      body: payload,
      failOnStatusCode: false,
    })
  }

  /**
   * Atualiza produto via PUT (substituição total). Comportamento upsert:
   * 200 se o ID existe, 201 se criar novo. Requer token de administrador.
   */
  static atualizar(id, payload, token) {
    return cy.request({
      method: 'PUT',
      url: `${DOMAIN()}${ENDPOINTS.PRODUTOS}/${id}`,
      headers: { Authorization: token },
      body: payload,
      failOnStatusCode: false,
    })
  }

  /**
   * Remove produto. Requer token de administrador.
   * Bloqueado pela API (400) se o produto estiver em algum carrinho ativo.
   */
  static deletar(id, token) {
    return cy.request({
      method: 'DELETE',
      url: `${DOMAIN()}${ENDPOINTS.PRODUTOS}/${id}`,
      headers: { Authorization: token },
      failOnStatusCode: false,
    })
  }
}
