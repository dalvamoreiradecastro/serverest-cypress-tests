# ServeRest — Testes E2E Automatizados com Cypress

Projeto de automacao de testes para o frontend e API da aplicacao [ServeRest](https://front.serverest.dev/), desenvolvido com **Cypress 13** e **JavaScript**, seguindo boas praticas de engenharia de qualidade.

---

## Tecnologias

| Ferramenta | Versao | Finalidade |
|---|---|---|
| [Cypress](https://www.cypress.io/) | ^13.0.0 | Framework de testes E2E e API |
| JavaScript | ES2020+ | Linguagem de desenvolvimento |
| Node.js | >= 18 | Runtime |
| mochawesome | ^7.1.4 | Geração de relatórios HTML |

---

## Estrutura do Projeto

```
cypress/
├── e2e/
│   ├── api/                            # Testes de backend (API pura)
│   │   ├── 04_produtos-api.cy.js       # CRUD de produtos + controle de acesso
│   │   ├── 05_usuarios-api.cy.js       # Gerenciamento de usuarios via API
│   │   └── 06_carrinhos-api.cy.js      # Ciclo de vida do carrinho + estoque
│   ├── 01_autenticacao.cy.js           # Fluxo de login (UI)
│   ├── 02_cadastro-usuario.cy.js       # Fluxo de cadastro (UI)
│   └── 03_fluxo-compra.cy.js           # Jornada de compra (UI + API)
├── api/                                # Classes de acesso aos endpoints
│   ├── LoginApi.js
│   ├── UsuariosApi.js
│   ├── ProdutosApi.js
│   └── CarrinhosApi.js
├── constants/
│   └── Urls.js                         # Dominio e paths centralizados
├── pages/
│   ├── LoginPage.js
│   ├── CadastroPage.js
│   ├── ListaProdutosPage.js
│   └── CarrinhoPage.js
├── fixtures/
│   ├── usuario.json
│   └── produto.json
└── support/
    ├── commands.js   # Custom commands reutilizaveis
    └── e2e.js        # Entry point do suporte
cypress.config.js
package.json
```

---

## Pre-requisitos

- **Node.js >= 18** instalado
- Acesso a internet (testes acessam `https://front.serverest.dev` e `https://serverest.dev`)

---

## Instalacao

```bash
# Clone o repositorio
git clone <url-do-repositorio>
cd serverest-cypress-tests

# Instale as dependencias
npm install
```

---

## Como Executar

### Modo interativo (recomendado para desenvolvimento)

```bash
npm run cy:open
```

Abre o Cypress App onde voce pode selecionar e rodar cada spec individualmente.

### Modo headless (CI/CD)

```bash
# Roda todos os testes (UI + API)
npm run cy:run

# Roda apenas um fluxo de UI
npm run cy:run:autenticacao
npm run cy:run:cadastro
npm run cy:run:compra

# Roda todos os testes de API backend
npm run cy:run:api

# Roda um fluxo de API especifico
npm run cy:run:api:produtos
npm run cy:run:api:usuarios
npm run cy:run:api:carrinhos
```

---

## Casos de Teste

### Testes de UI (specs 01–03)

| # | Nome do Teste | Fluxo Coberto | Pre-condicoes | Resultado Esperado |
|---|---|---|---|---|
| CT-01 | Login com credenciais validas | Autenticacao | Usuario criado via API no `before()` | Redirecionamento para `/home` com status 200 e token JWT retornado |
| CT-02 | Login com senha incorreta | Autenticacao — erro | Usuario valido existe; senha errada | Status 401 da API; mensagem "Email e/ou senha invalidos" visivel; permanece em `/login` |
| CT-03 | Login com campos em branco | Autenticacao — validacao | Nenhuma | Formulario invalido; permanece em `/login` |
| CT-04 | Cadastro de novo usuario | Cadastro | Email unico gerado por timestamp | Status 201; `_id` retornado; redirecionamento para `/login` |
| CT-05 | Cadastro com email duplicado | Cadastro — erro | Usuario existente criado via API | Status 400; mensagem "Este email ja esta sendo usado" visivel |
| CT-06 | Cadastro com campos em branco | Cadastro — validacao | Nenhuma | Campos marcados como invalidos |
| CT-07 | Listagem de produtos autenticado | Jornada de compra | Admin + produto + comprador criados via API | Status 200; produto visivel na listagem |
| CT-08 | Adicionar produto ao carrinho | Jornada de compra | Idem CT-07 | Produto aparece na lista local |
| CT-09 | Finalizar compra | Jornada de compra | Idem CT-07; produto no carrinho | Status 200 em DELETE /carrinhos/concluir-compra; mensagem de sucesso |

### Testes de API Backend (specs 04–06)

| # | Nome do Teste | Fluxo Coberto | Pre-condicoes | Resultado Esperado |
|---|---|---|---|---|
| CT-10 | Listagem de produtos com estrutura correta | GET /produtos | Nenhuma | Status 200; body com `quantidade` e `produtos`; array de tamanho igual a `quantidade` |
| CT-11 | Filtro por nome inexistente retorna lista vazia | GET /produtos?nome=... | Nenhuma | Status 200; `quantidade: 0`; array vazio |
| CT-12 | CRUD completo de produto como admin | POST → GET → PUT → DELETE /produtos | Admin criado no `before()` | 201 na criacao; 200 na busca com dados corretos; 200 na atualizacao confirmada por GET; 400 apos deleção |
| CT-13 | Criacao de produto sem token retorna 401 | POST /produtos (sem auth) | Nenhuma | Status 401; mensagem "Token de acesso ausente" |
| CT-14 | Criacao de produto com token nao-admin retorna 403 | POST /produtos (usuario comum) | Comprador criado no `before()` | Status 403; mensagem "Rota exclusiva para administradores" |
| CT-15 | Listagem de usuarios com campos do contrato | GET /usuarios | Usuario criado no `before()` | Status 200; body com `quantidade` e `usuarios`; campos `_id`, `nome`, `email`, `administrador` presentes |
| CT-16 | Filtro de usuario por nome via query param | GET /usuarios?nome=... | Usuario com nome conhecido criado | Retorna apenas usuarios com o nome filtrado |
| CT-17 | Busca de usuario por ID | GET /usuarios/{id} | Usuario criado no `before()` | Status 200; todos os campos batem com os dados de criacao |
| CT-18 | Atualizacao de usuario via PUT e verificacao | PUT /usuarios/{id} | Usuario criado no `before()` | Status 200; GET posterior confirma novos dados |
| CT-19 | Criacao com email duplicado retorna 400 | POST /usuarios | Email ja registrado | Status 400; mensagem "Este email ja esta sendo usado" |
| CT-20 | Criacao sem campos obrigatorios retorna 400 | POST /usuarios (body vazio) | Nenhuma | Status 400; erros por campo no body |
| CT-21 | Login com credenciais invalidas retorna 401 | POST /login | Nenhuma | Status 401; mensagem "Email e/ou senha invalidos" |
| CT-22 | Criacao e inspecao de carrinho com totalizadores | POST + GET /carrinhos | Admin + produto + comprador criados | Status 201 na criacao; GET retorna `precoTotal`, `quantidadeTotal` e `idUsuario` corretos |
| CT-23 | Listagem de carrinhos com estrutura correta | GET /carrinhos | Ao menos 1 carrinho ativo | Status 200; body com `quantidade` e `carrinhos` |
| CT-24 | Segundo carrinho para mesmo usuario retorna 400 | POST /carrinhos (duplicado) | Comprador ja possui 1 carrinho ativo | Status 400; mensagem "Nao e permitido ter mais de 1 carrinho" |
| CT-25 | Conclusao de compra mantem estoque decrementado | DELETE /carrinhos/concluir-compra | Comprador com carrinho ativo | Status 200; estoque apos conclusao = estoque com cart ativo (nao restaura) |
| CT-26 | Cancelamento de compra restaura estoque | DELETE /carrinhos/cancelar-compra | Comprador com carrinho ativo | Status 200; estoque restaurado = estoque com cart ativo + quantidade cancelada |

---

## Analise dos Fluxos de API (specs 04–06)

### Fluxo 4 — CRUD de Produtos via API
**Justificativa:** Os specs 01–03 criam e deletam produtos apenas como operações auxiliares de setup/teardown para os testes de UI. Este spec testa o ciclo CRUD completo como fluxo principal e valida as regras de autorização (admin-only) que protegem o catálogo — incluindo a diferença semântica entre 401 (sem token) e 403 (token sem permissão). Nenhuma dessas asserções existe nos specs anteriores.

### Fluxo 5 — Gerenciamento de Usuarios via API
**Justificativa:** O spec 02 cobre apenas o cadastro via formulário de UI. Este spec testa a API de usuários diretamente: listagem com filtros por query param, busca individual por ID com validação de contrato, atualização via PUT com verificação de persistência, e validações de campos obrigatórios. A operação PUT em particular não é coberta em nenhum outro spec.

### Fluxo 6 — Ciclo de Vida do Carrinho via API
**Justificativa:** O spec 03 faz um POST + DELETE rápido como parte de um fluxo de UI híbrido. Este spec testa comportamentos que não existem nos specs anteriores: inspeção dos totalizadores do carrinho (precoTotal, quantidadeTotal, idUsuario), a regra de negócio crítica de 1 carrinho por usuário, e a semântica distinta entre concluir-compra (estoque permanece decrementado) e cancelar-compra (estoque é restaurado).

---

## Padroes e Decisoes de Projeto

### Classes de API (Api Layer)
Cada endpoint da ServeRest tem sua classe dedicada em `/cypress/api/` (`LoginApi`, `UsuariosApi`, `ProdutosApi`, `CarrinhosApi`). Todos os métodos retornam `cy.request()` diretamente, integrando ao chain do Cypress sem Promises manuais. Os specs ficam limpos e legíveis — sem detalhes de `url`, `headers` ou `failOnStatusCode` repetidos.

### Constantes de URL centralizadas
`/cypress/constants/Urls.js` centraliza o domínio (resolvido via `Cypress.env('apiUrl')`) e todos os paths de endpoint. Qualquer mudança de URL ou ambiente exige alteração em um único lugar.

### Page Object Model (POM)
Cada pagina da aplicacao tem sua propria classe em `/cypress/pages/`. Isso centraliza seletores e acoes, reduzindo duplicacao e facilitando manutencao quando a UI muda.

### Custom Commands
Operacoes reutilizaveis como `criarUsuarioViaAPI`, `loginViaAPI` e `sessaoAutenticada` ficam em `commands.js`, evitando repeticao nos specs.

### Sem `cy.wait(ms)` hardcoded
Todos os waits usam `cy.intercept()` + `cy.wait('@alias')`, tornando os testes deterministas e independentes da velocidade da rede.

### Dados isolados por execucao
Usuarios e produtos sao criados com emails/nomes unicos (timestamp) a cada run, evitando colisoes e tornando os testes idem-potentes.

### `cy.session()` para autenticacao
O login via UI e cacheado pelo Cypress entre os testes do mesmo bloco, reduzindo tempo de execucao sem abrir mao de testar o fluxo de autenticacao real.

### Seletores `data-testid`
Todos os seletores usam o atributo `data-testid`, conforme implementado no ServeRest Frontend. Isso os torna imunes a refatoracoes de CSS ou mudancas de estrutura HTML.

---

## Variaveis de Ambiente

Configuradas em `cypress.config.js` na secao `env`:

| Variavel | Valor Padrao | Descricao |
|---|---|---|
| `apiUrl` | `https://serverest.dev` | URL base da API REST |

Para sobrescrever em CI:

```bash
cypress run --env apiUrl=https://serverest.dev
```

---

## Analise dos Fluxos Escolhidos

### Fluxo 1 — Autenticacao
**Justificativa:** O login e o gateway de toda a aplicacao. Sem uma sessao valida nenhum outro recurso e acessivel. Testamos o caminho feliz, credenciais invalidas e validacao de formulario — os tres cenarios mais comuns em producao.

### Fluxo 2 — Cadastro de Usuario
**Justificativa:** E o ponto de entrada de novos usuarios. Uma falha aqui impede crescimento da base. Validamos a criacao com sucesso, a regra de negocio de unicidade de email e as validacoes de campos obrigatorios.

### Fluxo 3 — Jornada de Compra
**Justificativa:** E o fluxo de conversao central — o objetivo final da aplicacao. Cobre a integracao completa entre frontend (listagem, carrinho) e API (POST /carrinhos, DELETE /carrinhos/concluir-compra), passando pela autenticacao e estado de UI.
