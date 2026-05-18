/**
 * FLUXO 4 — Gerenciamento de Produtos via API (CRUD + Autorização)
 *
 * Por que este fluxo:
 * Os specs 01–03 criam e deletam produtos apenas como operações auxiliares
 * de setup/teardown para os testes de UI. Este spec testa o CRUD completo
 * de produtos como fluxo PRINCIPAL, cobrindo também as regras de autorização
 * (admin-only) que protegem o catálogo — a camada de segurança mais crítica
 * do backend. Nenhuma dessas asserções existe nos specs anteriores.
 *
 * Pré-condições:
 *  - Usuário admin criado via UsuariosApi no before() externo
 *  - Usuário comprador (não-admin) criado para testar rejeição 403
 *  - Ambos removidos no after() externo
 */
import { ProdutosApi } from '../../api/ProdutosApi'
import { UsuariosApi } from '../../api/UsuariosApi'
import { LoginApi } from '../../api/LoginApi'

// Fábrica que garante nome único por execução — evita conflito 400 "nome já existe"
const novoProdutoPayload = () => ({
  nome: `Produto API ${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  preco: 799,
  descricao: 'Produto criado em teste de API backend',
  quantidade: 20,
  imagem: 'https://i.imgur.com/LQs4o5m.jpeg',
})

describe('Gerenciamento de Produtos — API', () => {
  let adminToken
  let adminId
  let compradorToken
  let compradorId

  before(() => {
    // Admin é necessário para todas as operações de escrita em /produtos
    const adminData = {
      nome: `Admin Produtos ${Date.now()}`,
      email: `admin_prod_${Date.now()}@qa.com`,
      password: 'cypress@123',
      administrador: 'true',
    }

    UsuariosApi.criar(adminData).then(({ body }) => {
      adminId = body._id
      LoginApi.login(adminData.email, adminData.password).then(({ body: auth }) => {
        adminToken = auth.authorization
      })
    })

    // Comprador não-admin serve exclusivamente para validar a rejeição 403
    const compradorData = {
      nome: `Comprador Produtos ${Date.now()}`,
      email: `comp_prod_${Date.now()}@qa.com`,
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
    if (adminId) UsuariosApi.deletar(adminId)
    if (compradorId) UsuariosApi.deletar(compradorId)
  })

  // ---------------------------------------------------------------------------
  // Cenário 1: Listagem de produtos — contrato da resposta e filtros
  // ---------------------------------------------------------------------------

  it('deve listar produtos retornando estrutura de resposta correta', () => {
    ProdutosApi.listar().then(({ status, body }) => {
      expect(status).to.eq(200)
      // A API sempre retorna esses dois campos — qualquer quebra de contrato falha aqui
      expect(body).to.have.keys(['quantidade', 'produtos'])
      expect(body.quantidade).to.be.a('number').and.to.be.at.least(0)
      // O array deve ter exatamente `quantidade` itens — garante consistência interna
      expect(body.produtos).to.be.an('array').and.to.have.length(body.quantidade)
    })
  })

  it('deve retornar lista vazia ao filtrar por nome inexistente', () => {
    // Confirma que o filtro por query param está sendo processado corretamente
    ProdutosApi.listar({ nome: 'produto_xyz_impossivel_99999' }).then(({ status, body }) => {
      expect(status).to.eq(200)
      expect(body.quantidade).to.eq(0)
      expect(body.produtos).to.be.an('array').and.to.be.empty
    })
  })

  // ---------------------------------------------------------------------------
  // Cenário 2: Ciclo CRUD completo de um produto (requer admin)
  // ---------------------------------------------------------------------------

  describe('Ciclo CRUD completo de produto com permissao de administrador', () => {
    // Produto criado no before() deste bloco e compartilhado pelos testes internos
    let produtoId
    const payload = novoProdutoPayload()

    before(() => {
      // Cria o produto base para os testes de busca, atualização e deleção
      ProdutosApi.criar(payload, adminToken).then(({ body }) => {
        produtoId = body._id
      })
    })

    after(() => {
      // Segurança: limpa o produto mesmo se o teste de deleção falhar no meio
      if (produtoId) ProdutosApi.deletar(produtoId, adminToken)
    })

    it('deve criar produto com token de admin e retornar 201 com _id', () => {
      // Cria um produto independente dentro do teste para não depender do estado do before()
      const produtoLocal = novoProdutoPayload()
      let idLocal

      ProdutosApi.criar(produtoLocal, adminToken).then(({ status, body }) => {
        expect(status).to.eq(201)
        expect(body).to.have.property('_id')
        expect(body.message).to.include('Cadastro realizado com sucesso')
        idLocal = body._id
      }).then(() => {
        // Limpeza dentro do teste — evita acumular produtos no ambiente compartilhado
        if (idLocal) ProdutosApi.deletar(idLocal, adminToken)
      })
    })

    it('deve buscar produto por ID e validar todos os campos persistidos', () => {
      ProdutosApi.buscarPorId(produtoId).then(({ status, body }) => {
        expect(status).to.eq(200)
        // Confirma que cada campo do payload foi armazenado corretamente
        expect(body.nome).to.eq(payload.nome)
        expect(body.preco).to.eq(payload.preco)
        expect(body.descricao).to.eq(payload.descricao)
        expect(body.quantidade).to.eq(payload.quantidade)
      })
    })

    it('deve atualizar produto via PUT e confirmar persistencia dos novos dados', () => {
      const dadosAtualizados = { ...payload, preco: 1499, quantidade: 15 }

      ProdutosApi.atualizar(produtoId, dadosAtualizados, adminToken).then(({ status, body }) => {
        expect(status).to.eq(200)
        expect(body.message).to.include('Registro alterado com sucesso')
      })

      // GET subsequente confirma que a alteração foi de fato persistida no banco
      ProdutosApi.buscarPorId(produtoId).then(({ status, body }) => {
        expect(status).to.eq(200)
        expect(body.preco).to.eq(1499)
        expect(body.quantidade).to.eq(15)
        // Nome não foi alterado — garante que só os campos enviados são modificados
        expect(body.nome).to.eq(payload.nome)
      })
    })

    it('deve deletar produto e confirmar que ID nao e mais encontrado (400)', () => {
      ProdutosApi.deletar(produtoId, adminToken).then(({ status, body }) => {
        expect(status).to.eq(200)
        expect(body.message).to.include('Registro excluído com sucesso')
      })

      // GET após deleção deve retornar 400 — o recurso não existe mais
      ProdutosApi.buscarPorId(produtoId).then(({ status }) => {
        expect(status).to.eq(400)
        // Sinaliza ao after() que a limpeza já foi feita — evita tentativa dupla
        produtoId = null
      })
    })
  })

  // ---------------------------------------------------------------------------
  // Cenário 3: Controle de acesso — operações de escrita são admin-only
  // ---------------------------------------------------------------------------

  it('deve rejeitar criacao de produto sem token de autenticacao com status 401', () => {
    // Simula um cliente que não enviou o header Authorization
    ProdutosApi.criar(novoProdutoPayload(), null).then(({ status, body }) => {
      expect(status).to.eq(401)
      expect(body.message).to.include('Token de acesso ausente')
    })
  })

  it('deve rejeitar criacao de produto com token de usuario nao administrador com status 403', () => {
    // Token válido, mas de um usuário sem permissão de admin — deve ser bloqueado
    ProdutosApi.criar(novoProdutoPayload(), compradorToken).then(({ status, body }) => {
      expect(status).to.eq(403)
      expect(body.message).to.include('Rota exclusiva para administradores')
    })
  })
})
