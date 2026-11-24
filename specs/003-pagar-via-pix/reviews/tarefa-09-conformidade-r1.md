<Parecer de Conformidade — Tarefa 9>
**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA2 (lado do front) — obter `publicKey` em `GET /payments/config`, carregar SDK v2 e renderizar Card Payment Brick com `amount` só de exibição e `initialization.payer.email`, sem enviar número do cartão ao servidor | atendido | `apps/web/src/index.html:9`, `apps/web/src/app/features/checkout/data/checkout.service.ts:108-129`, `apps/web/src/app/features/checkout/pages/checkout.page.ts:279-366`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:168-189` |
| CA3 (front) — enviar `POST /sales/:id/payments/card` sem valor monetário (`token`, `paymentMethodId`, `installments`, `identification`) e exibir venda concluída quando `COMPLETED` | atendido | `apps/web/src/app/features/checkout/data/checkout.service.ts:114-129`, `apps/web/src/app/features/checkout/pages/checkout.page.ts:349-384`, `apps/web/src/app/features/checkout/pages/checkout.page.html:126-157`, `apps/web/src/app/features/checkout/data/checkout.service.spec.ts:115-164`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:191-241` |
| CA4 (front) — exibir recusa quando `DECLINED`, manter venda em `OPEN` e permitir nova tentativa na mesma venda | atendido | `apps/web/src/app/features/checkout/pages/checkout.page.ts:222-230, 379-380, 416-418`, `apps/web/src/app/features/checkout/pages/checkout.page.html:254-268`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:243-285` |
| CA5 (front) — exibir "Estamos confirmando o pagamento" quando `PENDING` e fazer polling de `GET /sales/:id` até saída de `PENDING` | atendido | `apps/web/src/app/features/checkout/pages/checkout.page.ts:120-124, 381-384, 397-426`, `apps/web/src/app/features/checkout/pages/checkout.page.html:202-208`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:287-344` |
| CA6 (front) — gerar cobrança PIX (`POST /sales/:id/payments/pix`), exibir QR Code em `PENDING`, fazer polling e não marcar como paga ao fechar/voltar ao caixa | atendido | `apps/web/src/app/features/checkout/data/checkout.service.ts:131-135`, `apps/web/src/app/features/checkout/pages/checkout.page.ts:114-118, 127-130, 232-277`, `apps/web/src/app/features/checkout/pages/checkout.page.html:160-220`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:346-394` |
| CA7 (front) — desabilitar botão / bloquear duplo envio durante requisição em andamento, exibir erro de conexão em falha de rede e reabilitar ação sem marcar como paga | atendido | `apps/web/src/app/features/checkout/pages/checkout.page.ts:178-205, 232-255, 349-390, 433-441`, `apps/web/src/app/features/checkout/pages/checkout.page.html:91-103, 223-252, 290-302`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:396-464` |

## Apontamentos

</Parecer de Conformidade — Tarefa 9>
