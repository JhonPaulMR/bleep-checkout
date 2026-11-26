# Parecer de Código — Tarefa 1

**Veredito:** APROVADO

## Apontamentos (bloqueiam)
*(nenhum apontamento bloqueante)*

## Sugestões (não bloqueiam)
- **Reuso da pré-validação de venda aberta do operador** — `apps/api/src/modules/payments/payments.service.ts:182-201`
  `payWithCustomerCredit` repete a busca da venda e as verificações de existência (`404`), posse (`403`) e status `OPEN` (`422`) que já existem em `findOpenOwnedSale` (`payments.service.ts:282-305`), inclusive com leve variação na mensagem (`"Venda não está aberta para pagamento."` vs `"A venda não está aberta para pagamento."`). Reutilizar `findOpenOwnedSale` (ou extrair a validação base sem `include` obrigatório do `operator`) evita que futuras mudanças na regra de cobrança divirjam entre cartão, PIX e crédito.
- **Query redundante de cliente dentro da transação** — `apps/api/src/modules/payments/payments.service.ts:261-278`
  `tx.customer.findUniqueOrThrow` busca o cliente logo antes de `tx.sale.findUniqueOrThrow` que já faz `include: { customer: true }` na mesma transação. O saldo atualizado já está disponível em `updatedSale.customer!.balanceCents`, dispensando uma consulta extra ao banco.
- **Descrição do Swagger para `422` em `POST /sales`** — `apps/api/src/modules/sales/sales.controller.ts:35-38`
  Com a validação de `customerId` inexistente retornando `422` em `SalesService.create`, a descrição do `@ApiResponse({ status: 422 })` pode ser atualizada para refletir `'Produto inexistente/inativo ou cliente não encontrado'`.

## Observações fora do escopo deste diff
- No fechamento da Issue #7, lembrar de atualizar o Mapa de Domínios em `docs/architecture.md` (§6) para incluir `POST /sales/:id/payments/credit` e `US05 (#7)` na linha de Pagamentos (e `US05 (#7)` na linha de Vendas).
