import { DOMAIN, ENDPOINTS } from '../constants/Urls'

/**
 * Classe de acesso ao endpoint de autenticação /login.
 *
 * Todos os métodos retornam cy.request() diretamente para se integrarem
 * ao command chain do Cypress sem necessidade de Promises manuais.
 * O token de autorização fica em response.body.authorization após login
 * bem-sucedido — ele é o Bearer token exigido pelos endpoints protegidos.
 */
export class LoginApi {
  /**
   * Autentica o usuário e retorna o response completo.
   * failOnStatusCode: false permite ao teste inspecionar erros 4xx
   * sem que o Cypress lance uma exceção automaticamente.
   */
  static login(email, password) {
    return cy.request({
      method: 'POST',
      url: `${DOMAIN()}${ENDPOINTS.LOGIN}`,
      body: { email, password },
      failOnStatusCode: false,
    })
  }
}
