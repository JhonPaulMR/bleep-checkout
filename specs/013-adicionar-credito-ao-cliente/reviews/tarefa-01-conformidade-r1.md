# Parecer de Conformidade — Tarefa 1

**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| **CA1 (lado da API)** — Gerente envia `amountCents > 0` em `POST /customers/:id/credits`; incrementa atomicamente `Customer.balanceCents` e registra `CreditTransaction` (`TOP_UP`) na mesma `prisma.$transaction`; devolve `201` com cliente atualizado | atendido | `apps/api/src/modules/customers/customers.controller.ts:57-76`, `apps/api/src/modules/customers/customers.service.ts:68-92`, `apps/api/src/modules/customers/customers.service.spec.ts:195-236`, `apps/api/test/customers.e2e-spec.ts:325-374` |
| **CA1 (lado do frontend)** — Atualização da tabela, cards de resumo e modal | fora desta tarefa | — |
| **CA2 (lado da API)** — Entrada inválida (ausente, `0`, `< 0`, não inteiro/não numérico ou campo extra) recusada com `400` pelo `ValidationPipe` sem alterar saldo no banco | atendido | `apps/api/src/modules/customers/dto/add-credit.dto.ts:4-13`, `apps/api/test/customers.e2e-spec.ts:376-417` |
| **CA2 (lado do frontend)** — Bloqueio no modal com destaque `perigo` e prévia "—" | fora desta tarefa | — |
| **CA3** — Operador de caixa (`OPERATOR`) recusado com `403` pelo `RolesGuard` sem alterar saldo | atendido | `apps/api/src/modules/customers/customers.controller.ts:58`, `apps/api/test/customers.e2e-spec.ts:419-456` |
| **CA4** — Requisição sem token ou com token inválido/adulterado/expirado recusada com `401` pelo `JwtAuthGuard` | atendido | `apps/api/src/modules/customers/customers.controller.ts:15-16,57`, `apps/api/test/customers.e2e-spec.ts:476-494` |
| **CA5** — `id` de cliente inexistente responde `404` com `"Cliente não encontrado."` sem criar `CreditTransaction` | atendido | `apps/api/src/modules/customers/customers.service.ts:11,70-75`, `apps/api/src/modules/customers/customers.service.spec.ts:238-253`, `apps/api/test/customers.e2e-spec.ts:458-474` |
| **CA6, CA7, CA8** — Fluxos de sessão expirada no interceptor, erro de rede no modal e cancelamento/fechamento da aba | fora desta tarefa | — |
| **Glossário (`docs/architecture.md` §5.1) e escopo** — Termos `Customer`, `balanceCents`, `CreditTransaction`, `TOP_UP`, `amountCents`, `Role.MANAGER`, `Role.OPERATOR` aderentes; sem escopo inflado | atendido | `apps/api/src/modules/customers/customers.controller.ts:57-76`, `apps/api/src/modules/customers/customers.service.ts:68-92`, `apps/api/src/modules/customers/dto/add-credit.dto.ts:4-13` |
| **Execução de testes** — Unitários (`npm run test -w apps/api`: 13 arquivos, 144 testes) e e2e (`npm run test:e2e -w apps/api -- test/customers.e2e-spec.ts`: 25/25 testes contra PostgreSQL) executados e aprovados | atendido | `apps/api/src/modules/customers/customers.service.spec.ts`, `apps/api/test/customers.e2e-spec.ts` |

## Apontamentos
