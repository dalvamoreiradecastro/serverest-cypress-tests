import { DOMAIN, ENDPOINTS } from '../constants/Urls'

/**
 * Classe de acesso ao endpoint /usuarios.
 *
 * Encapsula todos os métodos HTTP de gerenciamento de usuários,
 * desacoplando os specs dos detalhes de configuração do cy.request().
 *
 * O endpoint /usuarios é público para leitura e criação — não exige
 * Authorization. PUT e DELETE aceitam qualquer request por ID, sem token,
 * pois o ServeRest é um ambiente de treinamento sem RBAC em usuários.
 */
export class UsuariosApi {
  /**
   * Lista todos os usuários.
   * Aceita query params opcionais para filtro (ex.: { nome: 'João', administrador: 'true' }).
   * Retorna: { quantidade: N, usuarios: [...] }
   */
  static listar(params = {}) {
    return cy.request({
      method: 'GET',
      url: `${DOMAIN()}${ENDPOINTS.USUARIOS}`,
      qs: params,
      failOnStatusCode: false,
    })
  }

  /**
   * Busca um usuário pelo _id.
   * Retorna 400 com mensagem de erro se o ID não for encontrado.
   */
  static buscarPorId(id) {
    return cy.request({
      method: 'GET',
      url: `${DOMAIN()}${ENDPOINTS.USUARIOS}/${id}`,
      failOnStatusCode: false,
    })
  }

  /**
   * Cria um novo usuário. Endpoint público — não requer autenticação.
   * Retorna 201 + _id em sucesso; 400 se o email já estiver em uso.
   */
  static criar(payload) {
    return cy.request({
      method: 'POST',
      url: `${DOMAIN()}${ENDPOINTS.USUARIOS}`,
      body: payload,
      failOnStatusCode: false,
    })
  }

  /**
   * Atualiza um usuário via PUT (substituição total do recurso).
   * Comportamento upsert: 200 se o ID existe, 201 se criar novo registro.
   * Não exige Authorization — o ServeRest permite PUT direto por ID.
   */
  static atualizar(id, payload) {
    return cy.request({
      method: 'PUT',
      url: `${DOMAIN()}${ENDPOINTS.USUARIOS}/${id}`,
      body: payload,
      failOnStatusCode: false,
    })
  }

  /**
   * Remove um usuário pelo _id.
   * Idempotente: retorna 200 mesmo se o ID já não existir.
   * Bloqueado pela API se o usuário possuir carrinho ativo.
   */
  static deletar(id) {
    return cy.request({
      method: 'DELETE',
      url: `${DOMAIN()}${ENDPOINTS.USUARIOS}/${id}`,
      failOnStatusCode: false,
    })
  }
}
