/**
 * FLUXO 6 — Ciclo de Vida do Carrinho via API (Criação, Regras de Negócio, Estoque)
 *
 * Por que este fluxo:
 * O spec 03 executa um POST /carrinhos + DELETE /carrinhos/concluir-compra em
 * sequência rápida como parte de um fluxo de UI híbrido. Este spec testa o ciclo
 * completo de carrinho como fluxo PRINCIPAL e valida três comportamentos críticos
 * que não existem nos specs anteriores:
 *
 *  1. Estrutura e totalizadores do carrinho (precoTotal, quantidadeTotal)
 *  2. Regra de negócio: 1 carrinho por usuário (400 na 2ª criação)
 *  3. Gestão de estoque: POST /carrinhos decrementa; cancelar-compra restaura;
 *     concluir-compra mantém o decremento (compra finalizada)
 *
 * Arquitetura de dados:
 *  - Admin + produto criados no before() externo e compartilhados entre cenários
 *  - Cada cenário interno cria seu próprio comprador no before() e o remove no after()
 *  - Isso garante isolamento e evita colisões da regra "1 carrinho por usuário"
 */
import { CarrinhosApi } from '../../api/CarrinhosApi'
import { ProdutosApi } from '../../api/ProdutosApi'
import { UsuariosApi } from '../../api/UsuariosApi'
import { LoginApi } from '../../api/LoginApi'

describe('Ciclo de Vida do Carrinho — API', () => {
  let adminToken
  let adminId
  let produtoCriado

  // Estoque inicial fixo — permite calcular deltas precisos nos testes de estoque
  const ESTOQUE_INICIAL = 50

  before(() => {
    // Admin é necessário apenas para criar e remover o produto de teste
    const adminData = {
      nome: `Admin Carrinho ${Date.now()}`,
      email: `admin_cart_${Date.now()}@qa.com`,
      password: 'cypress@123',
      administrador: 'true',
    }

    UsuariosApi.criar(adminData).then(({ body }) => {
      adminId = body._id
      LoginApi.login(adminData.email, adminData.password).then(({ body: auth }) => {
        adminToken = auth.authorization

        // Produto com estoque conhecido — fundamental para as assertivas de decremento
        const produtoData = {
          nome: `Produto Carrinho ${Date.now()}`,
          preco: 250,
          descricao: 'Produto criado para testes de ciclo de carrinho',
          quantidade: ESTOQUE_INICIAL,
          imagem: 'https://i.imgur.com/LQs4o5m.jpeg',
        }

        ProdutosApi.criar(produtoData, adminToken).then(({ body: prod }) => {
          produtoCriado = { ...produtoData, _id: prod._id }
        })
      })
    })
  })

  after(() => {
    // Produto deve ser removido antes do admin para evitar dependências
    if (produtoCriado?._id) ProdutosApi.deletar(produtoCriado._id, adminToken)
    if (adminId) UsuariosApi.deletar(adminId)
  })

  // ---------------------------------------------------------------------------
  // Cenário 1: Criação de carrinho e validação de estrutura e totalizadores
  // ---------------------------------------------------------------------------

  describe('Criacao de carrinho e inspecao de estrutura', () => {
    let compradorToken
    let compradorId

    before(() => {
      const compradorData = {
        nome: `Comprador Inspecao ${Date.now()}`,
        email: `inspect_cart_${Date.now()}@qa.com`,
        password: 'cypress@123',
        administrador: 'false',
      }
      UsuariosApi.criar(compradorData).then(({ body }) => {
        compradorId = body._id
        LoginApi.login(compradorData.email, compradorData.password).then(({ body: auth }) => {
          compradorToken = auth.authorization
        })
      })
    })

    after(() => {
      // Cancela o carrinho antes de remover o usuário — API bloqueia remoção de usuário com carrinho ativo
      if (compradorToken) CarrinhosApi.cancelarCompra(compradorToken)
      if (compradorId) UsuariosApi.deletar(compradorId)
    })

    it('deve criar carrinho e retornar 201 com _id do carrinho recem-criado', () => {
      CarrinhosApi.criar(
        [{ idProduto: produtoCriado._id, quantidade: 2 }],
        compradorToken
      ).then(({ status, body }) => {
        expect(status).to.eq(201)
        expect(body).to.have.property('_id')
        expect(body.message).to.include('Cadastro realizado com sucesso')
      })
    })

    it('deve buscar carrinho por ID e validar estrutura, totalizadores e vinculo com usuario', () => {
      const quantidadeNoCarrinho = 3

      // Cancela carrinho deixado pelo teste anterior (regra: 1 carrinho por usuário)
      CarrinhosApi.cancelarCompra(compradorToken).then(() => {
        // Cria o carrinho dentro do teste para ter controle exato dos valores
        CarrinhosApi.criar(
          [{ idProduto: produtoCriado._id, quantidade: quantidadeNoCarrinho }],
          compradorToken
        ).then(({ body: carrinhoCreated }) => {
          const carrinhoId = carrinhoCreated._id

          CarrinhosApi.buscarPorId(carrinhoId).then(({ status, body }) => {
            expect(status).to.eq(200)
            // Valida todos os campos do contrato da API de carrinho
            expect(body).to.include.keys(['_id', 'produtos', 'precoTotal', 'quantidadeTotal', 'idUsuario'])
            expect(body.produtos).to.be.an('array').and.to.have.length(1)
            // precoTotal = preco unitário * quantidade — verifica a regra de cálculo
            expect(body.precoTotal).to.eq(produtoCriado.preco * quantidadeNoCarrinho)
            expect(body.quantidadeTotal).to.eq(quantidadeNoCarrinho)
            // O carrinho deve estar vinculado ao comprador correto
            expect(body.idUsuario).to.eq(compradorId)
          })
        })
      })
    })

    it('deve listar carrinhos retornando estrutura correta com ao menos 1 carrinho ativo', () => {
      CarrinhosApi.listar().then(({ status, body }) => {
        expect(status).to.eq(200)
        expect(body).to.have.keys(['quantidade', 'carrinhos'])
        expect(body.quantidade).to.be.a('number').and.to.be.greaterThan(0)
        expect(body.carrinhos).to.be.an('array').and.to.have.length(body.quantidade)
      })
    })
  })

  // ---------------------------------------------------------------------------
  // Cenário 2: Regra de negócio — máximo de 1 carrinho por usuário
  // ---------------------------------------------------------------------------

  describe('Regra de negocio: apenas 1 carrinho por usuario', () => {
    let compradorToken
    let compradorId

    before(() => {
      const compradorData = {
        nome: `Comprador Regra ${Date.now()}`,
        email: `regra_cart_${Date.now()}@qa.com`,
        password: 'cypress@123',
        administrador: 'false',
      }
      UsuariosApi.criar(compradorData).then(({ body }) => {
        compradorId = body._id
        LoginApi.login(compradorData.email, compradorData.password).then(({ body: auth }) => {
          compradorToken = auth.authorization
          // Cria o primeiro carrinho — necessário para que a tentativa de duplicação faça sentido
          CarrinhosApi.criar(
            [{ idProduto: produtoCriado._id, quantidade: 1 }],
            compradorToken
          )
        })
      })
    })

    after(() => {
      if (compradorToken) CarrinhosApi.cancelarCompra(compradorToken)
      if (compradorId) UsuariosApi.deletar(compradorId)
    })

    it('deve rejeitar criacao de segundo carrinho para o mesmo usuario com 400', () => {
      // O mesmo token implica o mesmo usuário — a API deve barrar a criação duplicada
      CarrinhosApi.criar(
        [{ idProduto: produtoCriado._id, quantidade: 1 }],
        compradorToken
      ).then(({ status, body }) => {
        expect(status).to.eq(400)
        expect(body.message).to.include('Não é permitido ter mais de 1 carrinho')
      })
    })
  })

  // ---------------------------------------------------------------------------
  // Cenário 3: Conclusão de compra — decremento permanente de estoque
  // ---------------------------------------------------------------------------

  describe('Conclusao de compra — estoque decrementado permanentemente', () => {
    let compradorToken
    let compradorId
    const QUANTIDADE_COMPRADA = 5

    before(() => {
      const compradorData = {
        nome: `Comprador Compra ${Date.now()}`,
        email: `compra_${Date.now()}@qa.com`,
        password: 'cypress@123',
        administrador: 'false',
      }
      UsuariosApi.criar(compradorData).then(({ body }) => {
        compradorId = body._id
        LoginApi.login(compradorData.email, compradorData.password).then(({ body: auth }) => {
          compradorToken = auth.authorization
          // Cria o carrinho — isso já decrementa o estoque do produto imediatamente
          CarrinhosApi.criar(
            [{ idProduto: produtoCriado._id, quantidade: QUANTIDADE_COMPRADA }],
            compradorToken
          )
        })
      })
    })

    after(() => {
      // Após concluir-compra o carrinho é removido — apenas remove o usuário
      if (compradorId) UsuariosApi.deletar(compradorId)
    })

    it('deve concluir compra, retornar 200 e manter estoque decrementado', () => {
      // Captura o estoque APÓS criação do carrinho (já decrementado pelo POST /carrinhos)
      ProdutosApi.buscarPorId(produtoCriado._id).then(({ body: snapAntes }) => {
        const estoqueComCartAtivo = snapAntes.quantidade

        CarrinhosApi.concluirCompra(compradorToken).then(({ status, body }) => {
          expect(status).to.eq(200)
          expect(body.message).to.include('Registro excluído com sucesso')
        })

        // Após concluir, o estoque permanece no valor decrementado —
        // concluir-compra apenas finaliza a transação, não altera estoque novamente
        ProdutosApi.buscarPorId(produtoCriado._id).then(({ body: snapDepois }) => {
          expect(snapDepois.quantidade).to.eq(estoqueComCartAtivo)
        })
      })
    })
  })

  // ---------------------------------------------------------------------------
  // Cenário 4: Cancelamento de compra — estoque restaurado ao valor anterior
  // ---------------------------------------------------------------------------

  describe('Cancelamento de compra — estoque reintegrado', () => {
    let compradorToken
    let compradorId
    const QUANTIDADE_CANCELADA = 4

    before(() => {
      const compradorData = {
        nome: `Comprador Cancelar ${Date.now()}`,
        email: `cancelar_${Date.now()}@qa.com`,
        password: 'cypress@123',
        administrador: 'false',
      }
      UsuariosApi.criar(compradorData).then(({ body }) => {
        compradorId = body._id
        LoginApi.login(compradorData.email, compradorData.password).then(({ body: auth }) => {
          compradorToken = auth.authorization
          // Cria o carrinho — POST decrementa o estoque imediatamente
          CarrinhosApi.criar(
            [{ idProduto: produtoCriado._id, quantidade: QUANTIDADE_CANCELADA }],
            compradorToken
          )
        })
      })
    })

    after(() => {
      // Após cancelar-compra o carrinho já foi removido — apenas remove o usuário
      if (compradorId) UsuariosApi.deletar(compradorId)
    })

    it('deve cancelar compra, retornar 200 e restaurar o estoque decrementado pelo carrinho', () => {
      // Estoque atual = valor pós-decremento do POST /carrinhos do before()
      ProdutosApi.buscarPorId(produtoCriado._id).then(({ body: snapAntes }) => {
        const estoqueComCartAtivo = snapAntes.quantidade

        CarrinhosApi.cancelarCompra(compradorToken).then(({ status, body }) => {
          expect(status).to.eq(200)
          expect(body.message).to.include('Registro excluído com sucesso')
        })

        // Após cancelamento, o estoque deve ser restaurado adicionando a quantidade do carrinho cancelado
        ProdutosApi.buscarPorId(produtoCriado._id).then(({ body: snapDepois }) => {
          expect(snapDepois.quantidade).to.eq(estoqueComCartAtivo + QUANTIDADE_CANCELADA)
        })
      })
    })
  })
})
