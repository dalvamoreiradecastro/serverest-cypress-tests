# ServeRest — Testes E2E Automatizados com Cypress

Projeto de automacao de testes para o frontend e API da aplicacao [ServeRest](https://front.serverest.dev/), desenvolvido com **Cypress 13** e **JavaScript**, seguindo boas praticas de engenharia de qualidade.

---

## Tecnologias

| Ferramenta | Versao | Finalidade |
|---|---|---|
| [Cypress](https://www.cypress.io/) | ^13.0.0 | Framework de testes E2E |
| JavaScript | ES2020+ | Linguagem de desenvolvimento |
| Node.js | >= 18 | Runtime |

---

## Estrutura do Projeto

```
cypress/
├── e2e/
│   ├── 01_autenticacao.cy.js       # Fluxo de login
│   ├── 02_cadastro-usuario.cy.js   # Fluxo de cadastro
│   └── 03_fluxo-compra.cy.js       # Jornada de compra
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
# Roda todos os testes
npm run cy:run

# Roda apenas um fluxo
npm run cy:run:autenticacao
npm run cy:run:cadastro
npm run cy:run:compra
```

---

## Casos de Teste

| # | Nome do Teste | Fluxo Coberto | Pre-condicoes | Resultado Esperado |
|---|---|---|---|---|
| CT-01 | Login com credenciais validas | Autenticacao | Usuario criado via API no `before()` | Redirecionamento para `/home` com status 200 e token JWT retornado |
| CT-02 | Login com senha incorreta | Autenticacao — erro | Usuario valido existe; senha errada | Status 401 da API; mensagem "Email e/ou senha invalidos" visivel; permanece em `/login` |
| CT-03 | Login com campos em branco | Autenticacao — validacao | Nenhuma | Formulario invalido (HTML5 validity); nenhuma requisicao disparada; permanece em `/login` |
| CT-04 | Cadastro de novo usuario | Cadastro | Email unico gerado por timestamp | Status 201; `_id` retornado; redirecionamento para `/login` |
| CT-05 | Cadastro com email duplicado | Cadastro — erro | Usuario existente criado via API | Status 400; mensagem "Este email ja esta sendo usado" visivel; permanece em `/cadastrousuarios` |
| CT-06 | Cadastro com campos em branco | Cadastro — validacao | Nenhuma | Campos marcados como invalidos; nenhuma requisicao disparada |
| CT-07 | Listagem de produtos autenticado | Jornada de compra | Admin + produto + comprador criados via API; sessao autenticada | Status 200 da API; `quantidade > 0`; produto criado visivel na listagem |
| CT-08 | Adicionar produto ao carrinho | Jornada de compra | Idem CT-07 | Status 201 no POST /carrinhos; contador do carrinho atualizado |
| CT-09 | Finalizar compra | Jornada de compra | Idem CT-07; produto no carrinho | Status 200 no DELETE /carrinhos/concluir-compra; mensagem de sucesso visivel; carrinho esvaziado |

---

## Padroes e Decisoes de Projeto

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
