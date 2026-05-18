/**
 * Page Object para a lista de compras (/minhaListaDeProdutos)
 * O frontend armazena o carrinho localmente (Cart service) e exibe nesta rota.
 *
 * Seletores verificados no codigo-fonte do frontend (ServeRest/front, ListCart.js):
 *  - data-testid="shopping-cart-product-name"  → div com nome de cada item
 *  - data-testid="checkout-products"           → botao "Adicionar no carrinho" (navega para /carrinho)
 *  - data-testid="limparLista"                 → botao "Limpar Lista"
 *  - data-testid="shopping-cart-empty-message" → mensagem de carrinho vazio
 *  - data-testid="paginaInicial"               → botao "Pagina Inicial"
 */
class CarrinhoPage {
  // --- Seletores ---

  get itensDoPedido() {
    return cy.get('[data-testid="shopping-cart-product-name"]')
  }

  get botaoFinalizarCompra() {
    // "Adicionar no carrinho" — navega para /carrinho
    return cy.get('[data-testid="checkout-products"]')
  }

  get botaoCancelarCompra() {
    // "Limpar Lista" — remove todos os itens do carrinho local
    return cy.get('[data-testid="limparLista"]')
  }

  get mensagemCarrinhoVazio() {
    return cy.get('[data-testid="shopping-cart-empty-message"]')
  }

  get botaoPaginaInicial() {
    return cy.get('[data-testid="paginaInicial"]')
  }
}

export default new CarrinhoPage()
