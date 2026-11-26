# Parecer de Conformidade — Tarefa 4

**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA1 — Cadastro pela interface (modal "+ Novo Cliente" / "Cadastrar Cliente", envio de dados válidos com CPF normalizado e `balanceCents >= 0`, atualização da tabela e cards de resumo, fechamento do modal) | atendido | `apps/web/src/app/features/customers/pages/customers.page.html:14-17,192-343`, `apps/web/src/app/features/customers/pages/customers.page.ts:15-28,130-173`, `apps/web/src/app/features/customers/pages/customers.page.spec.ts:342-449` |
| CA3 — Saldo inicial negativo (`balanceCents < 0`) ou não numérico bloqueado na tela com mensagem de erro no campo de saldo | atendido | `apps/web/src/app/features/customers/pages/customers.page.ts:22-28,61-66,145-149`, `apps/web/src/app/features/customers/pages/customers.page.html:275-300`, `apps/web/src/app/features/customers/pages/customers.page.spec.ts:285-340` |
| CA4 — Validação inline na tela para nome vazio/espaços e CPF ausente ou fora do formato de 11 dígitos (aceitando `000.000.000-00` normalizado para 11 dígitos) | atendido | `apps/web/src/app/features/customers/pages/customers.page.ts:11-20,51-59,145-149`, `apps/web/src/app/features/customers/pages/customers.page.html:232-273`, `apps/web/src/app/features/customers/pages/customers.page.spec.ts:285-340,365-381,432-445` |
| CA10 — Cancelamento do modal (botão Cancelar / X) ou abandono sem enviar requisição nem persistir dados | atendido | `apps/web/src/app/features/customers/pages/customers.page.html:219-228,318-326`, `apps/web/src/app/features/customers/pages/customers.page.ts:135-139,175-182`, `apps/web/src/app/features/customers/pages/customers.page.spec.ts:225-283` |
| CA2, CA8, CA9 (tratamento de `409`, `401` e falha de rede no cadastro) | fora desta tarefa | Previstos na Tarefa 5 do `plan.md` |
| CA5, CA6, CA7, CA9 (listagem) | fora desta tarefa | Cobertos nas Tarefas 1, 2 e 3 do `plan.md` |

## Apontamentos

*(Nenhum apontamento. Testes executados via `npm run test -w apps/web`: 16 arquivos, 106 testes aprovados, incluindo os 11 testes de `customers.page.spec.ts`. Glossário e termos alinhados a `docs/architecture.md`.)*
