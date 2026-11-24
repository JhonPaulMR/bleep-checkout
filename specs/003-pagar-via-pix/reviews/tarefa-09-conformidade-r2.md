<Parecer de Conformidade — Tarefa 9>
**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA2 (lado do front) — obter `publicKey` em `GET /payments/config`, carregar SDK v2 (`https://sdk.mercadopago.com/js/v2`) e renderizar Card Payment Brick com `amount` só de exibição e `initialization.payer.email`, sem enviar número do cartão ao servidor | atendido | `apps/web/src/index.html:9`, `apps/web/src/app/features/checkout/data/checkout.service.ts:133-137`, `apps/web/src/app/features/checkout/pages/checkout.page.ts:309-374`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:155-178` |
| CA3 (front) — enviar `POST /sales/:id/payments/card` sem valor monetário (`token`, `paymentMethodId`, `installments`, `identification`) e exibir venda concluída quando `COMPLETED` | atendido | `apps/web/src/app/features/checkout/data/checkout.service.ts:139-154`, `apps/web/src/app/features/checkout/pages/checkout.page.ts:415-445`, `apps/web/src/app/features/checkout/pages/checkout.page.html:155-173, 197-213`, `apps/web/src/app/features/checkout/data/checkout.service.spec.ts:116-165`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:180-230` |
| CA4 (front) — exibir recusa quando `DECLINED`, manter venda em `OPEN` e permitir nova tentativa na mesma venda | atendido | `apps/web/src/app/features/checkout/pages/checkout.page.ts:232-240, 445-446, 465-467`, `apps/web/src/app/features/checkout/pages/checkout.page.html:315-329`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:232-274` |
| CA5 (front) — exibir "Estamos confirmando o pagamento" quando `PENDING` e fazer polling de `GET /sales/:id` até sair de `PENDING` | atendido | `apps/web/src/app/features/checkout/data/checkout.service.ts:111-131`, `apps/web/src/app/features/checkout/pages/checkout.page.ts:129-133, 447-450, 458-474`, `apps/web/src/app/features/checkout/pages/checkout.page.html:259-265`, `apps/web/src/app/features/checkout/data/checkout.service.spec.ts:213-301`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:276-328` |
| CA6 (front) — gerar cobrança PIX (`POST /sales/:id/payments/pix`), exibir QR Code em `PENDING`, fazer polling e não marcar como paga ao sair/fechar | atendido | `apps/web/src/app/features/checkout/data/checkout.service.ts:156-160`, `apps/web/src/app/features/checkout/pages/checkout.page.ts:123-127, 136-140, 242-265, 280-292`, `apps/web/src/app/features/checkout/pages/checkout.page.html:216-258`, `apps/web/src/app/features/checkout/data/checkout.service.spec.ts:167-197`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:330-382` |
| CA7 (front) — desabilitar botão / bloquear duplo envio durante requisição em andamento, exibir erro de conexão em falha de rede e reabilitar ação sem marcar como paga | atendido | `apps/web/src/app/features/checkout/pages/checkout.page.ts:188-215, 242-265, 415-456, 488-496`, `apps/web/src/app/features/checkout/pages/checkout.page.html:31, 61, 70, 95, 291, 308, 355`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:470-538` |

## Apontamentos

</Parecer de Conformidade — Tarefa 9>
