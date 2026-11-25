# Parecer de Código — Tarefa 3

**Veredito:** APROVADO

## Apontamentos (bloqueiam)
Nenhum.

## Sugestões (não bloqueiam)
- **Formatação de moeda BRL em `shared/`** — `apps/web/src/app/features/customers/pages/customers.page.ts:6-9` e `:70-72`: `BRL_FORMATTER` (`Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` dividindo centavos por 100) agora aparece em três features (`checkout`, `products` e `customers`). Vale considerar extrair um helper/pipe reutilizável em `apps/web/src/app/shared/` para evitar repetição futura.
- **Pluralização no card de resumo** — `apps/web/src/app/features/customers/pages/customers.page.html:40`: o texto `{{ positiveBalanceCount() }} clientes com saldo positivo` exibirá "1 clientes" quando houver exatamente 1 cliente com saldo positivo.

## Observações fora do escopo deste diff
- `apps/web/src/app/shared/ui/` (previsto no `docs/architecture.md` §3) ainda não possui o componente de botão reutilizável com os 5 estados nem utilitário compartilhado de formatação monetária; boa candidata a Issue de manutenção/refatoração para unificar `checkout`, `products`, `operators` e `customers`.
