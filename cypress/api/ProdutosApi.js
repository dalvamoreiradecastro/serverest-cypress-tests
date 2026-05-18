import { DOMAIN, ENDPOINTS } from '../constants/Urls'

/**
 * Classe de acesso ao endpoint /produtos.
 *
 * Operações de escrita (POST, PUT, DELETE) são restritas a administradores
 * e exigem o token Bearer no header Authorization. Passar token=null simula
 * um request sem autenticação — padrão útil para testar o cenário 401.
 *
 * A separação entre leitura (pública) e escrita (admin-only) é a regra
 * de negócio mais crítica do catálogo — cada método deixa isso explícito
 * nos parâmetros para tornar as intenções do teste legíveis.
 */
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
   * token=null → headers vazios → API retorna 401 (ausência de token).
   * token de não-admin → API retorna 403 (permissão insuficiente).
   * Retorna 400 se já existir produto com o mesmo nome.
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
