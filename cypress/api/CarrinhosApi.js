import { DOMAIN, ENDPOINTS } from '../constants/Urls'

/**
 * Classe de acesso ao endpoint /carrinhos.
 *
 * O ServeRest impõe a regra de 1 carrinho por usuário: a API retorna 400
 * em qualquer tentativa de criar um segundo carrinho com o mesmo token.
 *
 * Criação de carrinho (POST) decrementa o estoque do produto imediatamente.
 * Cancelamento (DELETE /cancelar-compra) reintegra esse estoque.
 * Conclusão (DELETE /concluir-compra) mantém o estoque decrementado —
 * a compra foi finalizada e o produto saiu do inventário.
 */
export class CarrinhosApi {
  /**
   * Lista todos os carrinhos ativos no sistema.
   * Endpoint público — não requer token.
   * Retorna: { quantidade: N, carrinhos: [...] }
   */
  static listar() {
    return cy.request({
      method: 'GET',
      url: `${DOMAIN()}${ENDPOINTS.CARRINHOS}`,
      failOnStatusCode: false,
    })
  }

  /**
   * Busca carrinho pelo _id.
   * Retorna: { _id, produtos, precoTotal, quantidadeTotal, idUsuario }
   */
  static buscarPorId(id) {
    return cy.request({
      method: 'GET',
      url: `${DOMAIN()}${ENDPOINTS.CARRINHOS}/${id}`,
      failOnStatusCode: false,
    })
  }

  /**
   * Cria carrinho para o usuário autenticado pelo token.
   * produtos: [{ idProduto: string, quantidade: number }]
   * Retorna 400 se o usuário já possuir um carrinho ou estoque insuficiente.
   */
  static criar(produtos, token) {
    return cy.request({
      method: 'POST',
      url: `${DOMAIN()}${ENDPOINTS.CARRINHOS}`,
      headers: { Authorization: token },
      body: { produtos },
      failOnStatusCode: false,
    })
  }

  /**
   * Conclui a compra: remove o carrinho sem restaurar estoque.
   * O decremento de estoque já havia ocorrido no POST /carrinhos —
   * concluir-compra apenas finaliza a transação e limpa o carrinho.
   */
  static concluirCompra(token) {
    return cy.request({
      method: 'DELETE',
      url: `${DOMAIN()}${ENDPOINTS.CONCLUIR_COMPRA}`,
      headers: { Authorization: token },
      failOnStatusCode: false,
    })
  }

  /**
   * Cancela a compra: remove o carrinho E reintegra o estoque dos produtos.
   * Operação inversa ao POST /carrinhos — estoque volta ao valor anterior
   * à criação do carrinho.
   */
  static cancelarCompra(token) {
    return cy.request({
      method: 'DELETE',
      url: `${DOMAIN()}${ENDPOINTS.CANCELAR_COMPRA}`,
      headers: { Authorization: token },
      failOnStatusCode: false,
    })
  }
}
