# Parecer de Conformidade — Tarefa 1
**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA6 — `POST /sales` recusa com `400` para quantidade zero (`0`), negativa (`-2`) ou decimal (`1.5`) via `ValidationPipe` e não cria nenhuma venda (RN07) | atendido | `apps/api/test/sales.e2e-spec.ts:239-263` e `apps/api/src/modules/sales/dto/create-sale.dto.ts:19-22` |
| CA1 — Inclusão de `N` unidades por código/leitor/busca, recálculo de subtotal/total e reset para `1` | fora desta tarefa | — |
| CA2 — Acúmulo de quantidade no mesmo item do carrinho sem duplicar linha | fora desta tarefa | — |
| CA3 — Bloqueio de quantidade zero/negativa/decimal/vazia no frontend com destaque `perigo` e mensagem específica | fora desta tarefa | — |
| CA4 — Controle de unidades no modal de busca com `Total N un: R$ ...` e `Adicionar N un.` | fora desta tarefa | — |
| CA5 — Atalho `F2` focando o campo de quantidade (`Nº de unidades`) | fora desta tarefa | — |
| CA7 — Abandono/erro (`Esc`, fechar modal, `404`/falha de rede) sem alterar carrinho nem criar venda | fora desta tarefa | — |

## Apontamentos

*(nenhum apontamento)*

### Observação de verificação
- `git diff 80c3a70ed47b76a7e5914f7a5e92585e9a38b09b --cached` revisado na íntegra: altera apenas `apps/api/test/sales.e2e-spec.ts`, sem escopo inflado e com terminologia aderente ao glossário de `docs/architecture.md`.
- `npm run test:e2e -w apps/api -- test/sales.e2e-spec.ts` executado diretamente durante a revisão: **20/20 testes aprovados** contra PostgreSQL real, validando status `400` e `prisma.sale.count()` inalterado para `0`, `-2` e `1.5`.
