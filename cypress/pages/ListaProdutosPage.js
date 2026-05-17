/**
 * Page Object para a listagem de produtos (/home)
 * Representa a pagina principal apos autenticacao do usuario comum.
 *
 * Seletores verificados no codigo-fonte do frontend (ServeRest/front):
 *  - Cada card de produto renderiza um <AddToCartButton> com data-testid="adicionarNaLista"
 *  - O CartButton no header usa data-testid="shopping-cart-button" (Link -> /minhaListaDeProdutos)
 *  - O botao de logout usa data-testid="logout" (navbarClient.js)
 */
class ListaProdutosPage {
  // --- Seletores ---

  get botaoLogout() {
    return cy.get('[data-testid="logout"]')
  }

  get botaoCarrinho() {
    // CartButton no header: Link que navega para /minhaListaDeProdutos
    return cy.get('[data-testid="shopping-cart-button"]')
  }

  get cardsProdutos() {
    // O frontend nao tem data-testid no container do card.
    // Cada produto renderiza exatamente um botao "adicionarNaLista" — um por produto.
    return cy.get('[data-testid="adicionarNaLista"]')
  }

  get botaoAdicionarPrimeiroProduto() {
    return cy.get('[data-testid="adicionarNaLista"]').first()
  }

  // --- Acoes ---

  visit() {
    cy.visit('/home')
  }

  irParaCarrinho() {
    // CartButton navega para /minhaListaDeProdutos (lista de compras local)
    this.botaoCarrinho.click()
  }

  realizarLogout() {
    this.botaoLogout.click()
  }
}

export default new ListaProdutosPage()
