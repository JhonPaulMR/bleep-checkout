# Parecer de Conformidade — Tarefa 2

**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA1 — Seletor "Nº de unidades [F2]" (campo numérico e `-`/`+`), inclusão de `4` unidades por código de barras, leitor USB (`Enter`) e busca por nome, recálculo de subtotal/total e reset para `1` | atendido | `apps/web/src/app/features/checkout/pages/checkout.page.html:34-89`, `apps/web/src/app/features/checkout/pages/checkout.page.ts:114-121,202-241,288-311`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:855-900,945-993` |
| CA2 — Inclusão repetida de `4` + `4` do mesmo produto soma para `8` na mesma linha sem duplicar | atendido | `apps/web/src/app/features/checkout/pages/checkout.page.ts:301-311`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:902-923` |
| CA3 — Bloqueio de `0`, `-2`, `1.5` e vazio sem chamar API nem alterar carrinho, destaque em `perigo` e mensagem `"Informe uma quantidade inteira positiva."` | atendido | `apps/web/src/app/features/checkout/pages/checkout.page.html:52-58,92-96,652-656,702-706`, `apps/web/src/app/features/checkout/pages/checkout.page.ts:25,116-121,223-227,289-293`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:925-943,966-978` |
| CA4 — Controle de unidades no modal "Buscar produto por nome" sincronizado com o caixa, exibição de `Total N un: R$ ...` e botão `Adicionar N un.` adicionando `N` unidades | atendido | `apps/web/src/app/features/checkout/pages/checkout.page.html:645-683,740-754`, `apps/web/src/app/features/checkout/pages/checkout.page.ts:122,288-299`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:945-993` |
| CA5 — Atalho `F2` foca diretamente o campo `Nº de unidades` durante a montagem da venda | atendido | `apps/web/src/app/features/checkout/pages/checkout.page.html:36-78`, `apps/web/src/app/features/checkout/pages/checkout.page.ts:100,179-183`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:995-1007` |
| CA6 — Validação `400` na API (`POST /sales`) para quantidade zero, negativa ou decimal | fora desta tarefa | Coberto na Tarefa 1 (`apps/api/test/sales.e2e-spec.ts`) |
| CA7 — Abandono com quantidade `4` (`Esc`/fechar modal ou erro `404`/rede no código de barras) mantém carrinho inalterado | atendido | `apps/web/src/app/features/checkout/pages/checkout.page.ts:173-177,242-250,263-266`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:1009-1036` |

## Apontamentos
*(nenhum apontamento — testes verificados via `npm run test -w apps/web`: 16 arquivos, 136 testes passando, 27 em `checkout.page.spec.ts`; glossário de `docs/architecture.md` e escopo da `spec.md` respeitados)*
