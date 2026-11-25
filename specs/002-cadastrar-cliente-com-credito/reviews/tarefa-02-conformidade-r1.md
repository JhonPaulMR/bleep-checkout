# Parecer de Conformidade — Tarefa 2

**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA1 (camada de serviço `GET /customers` e `POST /customers` + item **Clientes** no menu do gerente) | atendido | `apps/web/src/app/features/customers/data/customers.service.ts:20-35`, `apps/web/src/app/features/customers/data/customers.service.spec.ts:25-73`, `apps/web/src/app/core/layout/header.ts:13`, `apps/web/src/app/core/layout/header.spec.ts:11-22` |
| CA1 (persistência backend e tela completa com cards, busca, tabela e modal) | fora desta tarefa | — |
| CA2 (CPF duplicado `409` e destaque de erro no modal) | fora desta tarefa | — |
| CA3 (saldo inicial negativo ou não numérico) | fora desta tarefa | — |
| CA4 (validação de nome, CPF e campos extras) | fora desta tarefa | — |
| CA5 (lado do front: operador não vê **Clientes** no menu e `/clientes` redireciona para `/caixa`; gerente acessa `/clientes`) | atendido | `apps/web/src/app/core/layout/header.ts:16`, `apps/web/src/app/core/layout/header.spec.ts:25-35`, `apps/web/src/app/app.routes.ts:20-25`, `apps/web/src/app/core/auth/role.guard.spec.ts:130-164` |
| CA5 (lado da API: `RolesGuard` `403` em `POST /customers` e `GET /customers` para `MANAGER` e `OPERATOR`) | fora desta tarefa | — |
| CA6 (autenticação `401` na API) | fora desta tarefa | — |
| CA7 (estado vazio na tela de Clientes) | fora desta tarefa | — |
| CA8 (sessão expirada durante preenchimento do modal) | fora desta tarefa | — |
| CA9 (falha de conexão ao listar/cadastrar) | fora desta tarefa | — |
| CA10 (abandono do modal/aba antes de enviar) | fora desta tarefa | — |

## Apontamentos

*(Nenhum apontamento — conformidade verificada contra `specs/002-cadastrar-cliente-com-credito/spec.md` e glossário de `docs/architecture.md` §5.1; suíte executada com `npm run test -w apps/web`: 15 arquivos, 95 testes passando.)*
