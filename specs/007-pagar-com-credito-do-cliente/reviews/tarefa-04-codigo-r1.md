<Parecer de Código — Tarefa 4>
**Veredito:** APROVADO

## Apontamentos (bloqueiam)
Nenhum apontamento.

## Sugestões (não bloqueiam)
- Em `apps/web/src/app/features/checkout/pages/checkout.page.html` (linhas 699-738), o botão `confirm-customer-credit` aparece duplicado nos ramos de saldo insuficiente e saldo suficiente com o mesmo conjunto de classes Tailwind. Ele pode ser unificado em um único `<button>` com `[disabled]="submittingPayment() || customer.balanceCents < currentSale.totalCents"` para reduzir repetição no template.
- Em `apps/web/src/app/features/checkout/pages/checkout.page.ts` (linhas 543-554), a atualização de `selectedCustomer` após o débito pode ser simplificada usando `const baseCustomer = this.selectedCustomer() ?? result.sale.customer; if (baseCustomer) { this.selectedCustomer.set({ ...baseCustomer, balanceCents: result.customerBalanceCents }); }`.
- Nota positiva: a guarda `@if (completedCustomerBalanceCents() !== null)` em `checkout.page.html:493` trata corretamente o caso de borda de saldo restante igual a `0` (`R$ 0,00`), que falharia com checagem truthy.

## Observações fora do escopo deste diff
- `CheckoutPage` (`apps/web/src/app/features/checkout/pages/checkout.page.ts` com ~803 linhas e `checkout.page.html` com ~1.071 linhas) já concentra múltiplas responsabilidades (carrinho/código de barras, modal de busca de produtos, modal de seleção de cliente, pagamento por Cartão/Brick, PIX com polling e Crédito do cliente). Vale abrir uma Issue de manutenção para extrair subcomponentes de apresentação em `apps/web/src/app/features/checkout/components/` (conforme estrutura prevista em `docs/architecture.md §3`), mantendo a manutenção sustentável nas próximas histórias de pagamento.
</Parecer de Código — Tarefa 4>
