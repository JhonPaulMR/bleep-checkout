# Parecer de Conformidade — Tarefa 3

**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA1 — Listagem (`GET /customers`) e layout da tela de Clientes (cards de resumo, busca por nome/CPF, tabela responsiva com CPF formatado e saldo em BRL, botão "+ Novo Cliente") | atendido | `apps/web/src/app/features/customers/pages/customers.page.ts:429-497`, `apps/web/src/app/features/customers/pages/customers.page.html:7-196`, `apps/web/src/app/features/customers/pages/customers.page.spec.ts:254-334` |
| CA1 / Fora de escopo / Assume que — Botão "+ Adicionar crédito" desabilitado com `// TODO #13` | atendido | `apps/web/src/app/features/customers/pages/customers.page.ts:437-438`, `apps/web/src/app/features/customers/pages/customers.page.html:175-186`, `apps/web/src/app/features/customers/pages/customers.page.spec.ts:275-280` |
| CA7 — Estado vazio quando não há clientes cadastrados e quando a busca local por nome/CPF não encontra correspondência, mantendo "+ Novo Cliente" disponível | atendido | `apps/web/src/app/features/customers/pages/customers.page.html:20-27`, `apps/web/src/app/features/customers/pages/customers.page.html:127-134`, `apps/web/src/app/features/customers/pages/customers.page.spec.ts:336-372` |
| CA9 — Falha de rede na listagem exibe `"Não foi possível conectar. Tente novamente."` via `listError` em `[role="alert"]`, sem exibir estado vazio, e ignora `401` para o interceptor de sessão | atendido | `apps/web/src/app/features/customers/pages/customers.page.ts:474-478`, `apps/web/src/app/features/customers/pages/customers.page.html:125-126`, `apps/web/src/app/features/customers/pages/customers.page.spec.ts:374-400` |
| CA2, CA3, CA4, CA5, CA6, CA8, CA9 (formulário), CA10 | fora desta tarefa | — |

## Apontamentos

*(Sem apontamentos.)*

> Evidência de execução dos testes: `npm run test -w apps/web` executado e aprovado (16 arquivos, 102 testes passando, incluindo 7/7 em `apps/web/src/app/features/customers/pages/customers.page.spec.ts`). Glossário conferido contra `docs/architecture.md` (`Customer`, `id`, `name`, `cpf`, `balanceCents`, `createdAt`).
