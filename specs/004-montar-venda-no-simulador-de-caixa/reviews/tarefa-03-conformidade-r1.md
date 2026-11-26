# Parecer de Conformidade — Tarefa 3

**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA1 — Informar código de barras e clicar em "Adicionar" chama `GET /products/barcode/:barcode`, adiciona ao carrinho (ou soma +1), atualiza subtotal/total e limpa o campo | atendido | `apps/web/src/app/features/checkout/pages/checkout.page.ts:169-195`, `apps/web/src/app/features/checkout/pages/checkout.page.html:126-150`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:524-545` |
| CA2 — Leitor USB via `keydown.enter` localiza e adiciona automaticamente mantendo foco no campo de código de barras | atendido | `apps/web/src/app/features/checkout/pages/checkout.page.html:126-137`, `apps/web/src/app/features/checkout/pages/checkout.page.ts:169-183,240-242`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:547-565` |
| CA3 — Modal "Buscar produto por nome" e seleção adicionando à venda | fora desta tarefa | Previsto na Tarefa 4 (`plan.md`) |
| CA4 — Código inexistente/desativado (`404`) exibe alerta `"Produto não localizado."` sem alterar o carrinho | atendido | `apps/web/src/app/features/checkout/pages/checkout.page.ts:185-193`, `apps/web/src/app/features/checkout/pages/checkout.page.html:173-181`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:567-580` |
| CA5 — Pesquisa por nome sem resultados exibindo `"Nenhum produto encontrado."` | fora desta tarefa | Previsto na Tarefa 4 (`plan.md`) |
| CA6 — Layout PDV fiel a `caixa.html` (tokens de `styles.css`, cabeçalho do terminal, card Entrada de Produtos com `F4`, tabela `Produtos no Carrinho` com remoção e `Limpar lista`, painel `Resumo da Venda` com `TOTAL A PAGAR` e `Prosseguir para pagamento` preservando fluxo US06) | atendido | `apps/web/src/app/features/checkout/pages/checkout.page.html:16-360`, `apps/web/src/app/features/checkout/pages/checkout.page.ts:153-158`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:505-522` (e demais 10 testes US06 preservados) |
| CA7 — Proteção `401`/`403` e escopo por papel na API | fora desta tarefa | Coberto na Tarefa 1 (`plan.md`) |
| CA8 — Tratamento integrado de `401` (`authInterceptor`) e falha de rede | fora desta tarefa | Previsto na Tarefa 4 (`plan.md`) |
| CA9 — Limpar carrinho (e remover item) sem criar venda no servidor (parte de fechar modal fica na Tarefa 4) | atendido | `apps/web/src/app/features/checkout/pages/checkout.page.ts:227-237`, `apps/web/src/app/features/checkout/pages/checkout.page.html:207-217,284-295`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:582-602` |

## Apontamentos
