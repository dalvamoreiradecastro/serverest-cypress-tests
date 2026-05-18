/**
 * Constantes de domínio e caminhos dos endpoints da API ServeRest.
 *
 * Por que centralizar aqui: elimina strings mágicas dispersas nos specs e
 * facilita manutenção quando um endpoint muda de path ou de ambiente
 * (ex.: staging vs produção). Qualquer alteração de URL exige mudança em
 * apenas este arquivo.
 *
 * DOMAIN é uma função (não uma string) porque Cypress.env() só está
 * disponível em runtime — chamá-lo no nível de módulo causaria erro de
 * inicialização antes do Cypress carregar a configuração.
 */
export const DOMAIN = () => Cypress.env('apiUrl') || 'https://serverest.dev'

export const ENDPOINTS = {
  LOGIN: '/login',
  USUARIOS: '/usuarios',
  PRODUTOS: '/produtos',
  CARRINHOS: '/carrinhos',
  CONCLUIR_COMPRA: '/carrinhos/concluir-compra',
  CANCELAR_COMPRA: '/carrinhos/cancelar-compra',
}
