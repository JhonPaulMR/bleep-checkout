# Parecer de Código — Tarefa 3

**Veredito:** APROVADO

## Apontamentos (bloqueiam)
Nenhum apontamento bloqueante encontrado. O diff respeita a arquitetura acordada em `docs/architecture.md` (Angular standalone com signals, controle de fluxo `@if`/`@for`, `inject()`, acesso à API isolado em `CheckoutService`, sem acoplamento entre features) e utiliza exclusivamente tokens semânticos definidos em `apps/web/src/styles.css` (cores, tipografia e espaçamento, sem hex solto). Os testes exercitam o componente pelo DOM e mockam apenas a fronteira do `CheckoutService`, sem acoplamento a detalhes internos.

## Sugestões (não bloqueiam)
- **Centralizar `formatCpf` em `shared/`:** o método `formatCpf` em `apps/web/src/app/features/checkout/pages/checkout.page.ts:235-239` é idêntico ao existente em `apps/web/src/app/features/customers/pages/customers.page.ts:142-146`. Conforme `docs/architecture.md` §4 (*"o que for comum sobe para `shared/` ou `core/`"*), vale extrair `formatCpf` (junto com a formatação de moeda `formatCents`/`formatBalance`) para um utilitário compartilhado em `apps/web/src/app/shared/` em uma oportunidade futura.
- **Remover `(keydown.escape)` redundante no backdrop do modal:** em `apps/web/src/app/features/checkout/pages/checkout.page.html:99`, o `div` do modal escuta `(keydown.escape)="closeCustomerModal()"`, enquanto `CheckoutPage` já trata `Escape` globalmente em `onWindowKeydown` (`checkout.page.ts:201-205`). Quando o foco está dentro do input de busca do modal, `closeCustomerModal()` é disparado duas vezes (inofensivo por ser idempotente, mas desnecessário).
- **Alinhar nome do teste à cobertura:** em `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts` (teste `'US05: permite trocar e remover cliente selecionado e limpa ao iniciar nova venda'`), o corpo testa seleção, troca e remoção, mas não exercita o reset ao iniciar nova venda (`startNewSale`).

## Observações fora do escopo deste diff
- **Tamanho crescente de `CheckoutPage` (`checkout.page.ts` com 752 linhas e `checkout.page.html` com ~960 linhas):** `docs/architecture.md` §3 e §4 já preveem `features/checkout/components/` para componentes de apresentação com `input()`/`output()`. Após concluir a US05, vale abrir uma Issue de manutenção para extrair o card/modal de cliente e o modal de busca de produtos para `features/checkout/components/`, mantendo a página sustentável.
