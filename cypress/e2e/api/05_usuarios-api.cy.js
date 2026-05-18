/**
 * FLUXO 5 — Gerenciamento de Usuários via API (GET, PUT, Validações)
 *
 * Por que este fluxo:
 * O spec 02 cobre apenas o cadastro via formulário de UI e valida o
 * comportamento do frontend (seletores, redirecionamento, mensagens).
 * Este spec testa o ciclo de vida do usuário diretamente pela API pura:
 *  - Listagem com filtros via query params (GET /usuarios)
 *  - Busca individual por ID (GET /usuarios/{id})
 *  - Atualização de dados via PUT com verificação de persistência
 *  - Validações de contrato: campos obrigatórios, unicidade de email, auth inválida
 * Nenhuma dessas operações é coberta nos specs anteriores.
 *
 * Pré-condições: usuários criados via UsuariosApi em cada before() interno,
 * removidos no after() correspondente — isolamento total entre cenários.
 */
import { UsuariosApi } from '../../api/UsuariosApi'
import { LoginApi } from '../../api/LoginApi'

describe('Gerenciamento de Usuarios — API', () => {
  // ---------------------------------------------------------------------------
  // Cenário 1: Listagem e busca de usuários — contrato e filtros
  // ---------------------------------------------------------------------------

  describe('Listagem e busca de usuarios', () => {
    let usuarioId
    // Nome fixo (com timestamp) usado no filtro — garante unicidade sem depender de outro dado
    const nomeFixo = `Usuario Listagem ${Date.now()}`
    const usuarioData = {
      nome: nomeFixo,
      email: `listagem_${Date.now()}@qa.com`,
      password: 'cypress@123',
      administrador: 'false',
    }

    before(() => {
      // Garante que ao menos um usuário conhecido exista para os filtros
      UsuariosApi.criar(usuarioData).then(({ body }) => {
        usuarioId = body._id
      })
    })

    after(() => {
      if (usuarioId) UsuariosApi.deletar(usuarioId)
    })

    it('deve listar usuarios retornando estrutura de resposta e campos do contrato', () => {
      UsuariosApi.listar().then(({ status, body }) => {
        expect(status).to.eq(200)
        // Contrato da API: sempre retorna `quantidade` e `usuarios`
        expect(body).to.have.keys(['quantidade', 'usuarios'])
        expect(body.quantidade).to.be.a('number').and.to.be.greaterThan(0)
        expect(body.usuarios).to.be.an('array').and.to.have.length(body.quantidade)
        // Cada objeto de usuário deve expor os campos públicos definidos no contrato
        const primeiroUsuario = body.usuarios[0]
        expect(primeiroUsuario).to.include.keys(['_id', 'nome', 'email', 'administrador'])
      })
    })

    it('deve filtrar usuarios por nome via query param e retornar apenas o esperado', () => {
      // Query param filtra server-side — confirma que o backend processa o filtro
      UsuariosApi.listar({ nome: nomeFixo }).then(({ status, body }) => {
        expect(status).to.eq(200)
        expect(body.quantidade).to.be.greaterThan(0)
        // Todos os resultados devem corresponder ao filtro aplicado
        body.usuarios.forEach((u) => expect(u.nome).to.eq(nomeFixo))
      })
    })

    it('deve buscar usuario por ID retornando todos os campos corretos', () => {
      UsuariosApi.buscarPorId(usuarioId).then(({ status, body }) => {
        expect(status).to.eq(200)
        expect(body._id).to.eq(usuarioId)
        expect(body.nome).to.eq(usuarioData.nome)
        expect(body.email).to.eq(usuarioData.email)
        // administrador é string no ServeRest — compara como string
        expect(body.administrador).to.eq(usuarioData.administrador)
      })
    })

    it('deve retornar 400 ao buscar usuario com ID inexistente', () => {
      // ID com formato válido (16 chars alfanuméricos) mas inexistente na base
      UsuariosApi.buscarPorId('IdInexistente000').then(({ status, body }) => {
        expect(status).to.eq(400)
        expect(body.message).to.include('não encontrado')
      })
    })
  })

  // ---------------------------------------------------------------------------
  // Cenário 2: Atualização de usuário via PUT — persistência e upsert
  // ---------------------------------------------------------------------------

  describe('Atualizacao de usuario via PUT', () => {
    let usuarioId
    const dadosOriginais = {
      nome: `Usuario PUT Original ${Date.now()}`,
      email: `put_orig_${Date.now()}@qa.com`,
      password: 'cypress@123',
      administrador: 'false',
    }

    before(() => {
      UsuariosApi.criar(dadosOriginais).then(({ body }) => {
        usuarioId = body._id
      })
    })

    after(() => {
      if (usuarioId) UsuariosApi.deletar(usuarioId)
    })

    it('deve atualizar nome e email do usuario e confirmar persistencia via GET', () => {
      const emailAtualizado = `put_atualizado_${Date.now()}@qa.com`
      const dadosAtualizados = {
        ...dadosOriginais,
        nome: 'Usuario PUT Atualizado',
        email: emailAtualizado,
      }

      UsuariosApi.atualizar(usuarioId, dadosAtualizados).then(({ status, body }) => {
        expect(status).to.eq(200)
        expect(body.message).to.include('Registro alterado com sucesso')
      })

      // GET após PUT confirma que a alteração foi persistida no servidor —
      // não apenas que o response do PUT foi correto
      UsuariosApi.buscarPorId(usuarioId).then(({ status, body }) => {
        expect(status).to.eq(200)
        expect(body.nome).to.eq('Usuario PUT Atualizado')
        expect(body.email).to.eq(emailAtualizado)
      })
    })

    it('deve promover usuario a administrador via PUT e confirmar a mudanca de perfil', () => {
      // Promover um usuário a admin é um caso crítico — valida que o campo
      // administrador pode ser atualizado e que a mudança persiste
      const dadosComoAdmin = { ...dadosOriginais, administrador: 'true' }

      UsuariosApi.atualizar(usuarioId, dadosComoAdmin).then(({ status, body }) => {
        expect(status).to.eq(200)
        expect(body.message).to.include('Registro alterado com sucesso')
      })

      UsuariosApi.buscarPorId(usuarioId).then(({ body }) => {
        expect(body.administrador).to.eq('true')
      })
    })
  })

  // ---------------------------------------------------------------------------
  // Cenário 3: Validações de contrato — campos obrigatórios e unicidade
  // ---------------------------------------------------------------------------

  describe('Validacoes de contrato — campos obrigatorios, unicidade e autenticacao', () => {
    let usuarioParaLimpeza

    after(() => {
      if (usuarioParaLimpeza) UsuariosApi.deletar(usuarioParaLimpeza)
    })

    it('deve rejeitar criacao de usuario sem campos obrigatorios retornando 400 com detalhe por campo', () => {
      // Body vazio — a API deve retornar um objeto de erros com cada campo inválido
      UsuariosApi.criar({}).then(({ status, body }) => {
        expect(status).to.eq(400)
        // A API do ServeRest retorna os campos inválidos como chaves no response body
        expect(body).to.have.any.keys(['nome', 'email', 'password', 'administrador'])
      })
    })

    it('deve rejeitar criacao com email ja existente retornando 400 com mensagem clara', () => {
      const emailDuplicado = `dup_${Date.now()}@qa.com`
      const payload = {
        nome: 'Usuario Duplicado',
        email: emailDuplicado,
        password: 'cypress@123',
        administrador: 'false',
      }

      // Cria o primeiro usuário — deve suceder
      UsuariosApi.criar(payload).then(({ status, body }) => {
        expect(status).to.eq(201)
        usuarioParaLimpeza = body._id

        // Tenta criar um segundo com o mesmo email — deve falhar com erro de negócio
        UsuariosApi.criar(payload).then(({ status: statusDup, body: bodyDup }) => {
          expect(statusDup).to.eq(400)
          expect(bodyDup.message).to.include('Este email já está sendo usado')
        })
      })
    })

    it('deve rejeitar login com email inexistente ou senha incorreta retornando 401', () => {
      // Valida que a API de autenticação não vaza informações sobre existência de email
      LoginApi.login('usuario_jamais_criado@qa.com', 'senhaErrada999').then(({ status, body }) => {
        expect(status).to.eq(401)
        // Mensagem genérica — não revela se foi o email ou a senha o problema
        expect(body.message).to.include('Email e/ou senha inválidos')
      })
    })
  })
})
