<Parecer de Código — Tarefa 8>
**Veredito:** APONTAMENTOS

## Apontamentos (bloqueiam)

1. **Falha na consulta ao gateway engolida silenciosamente com HTTP 200 após gravar `WebhookEvent`** — `apps/api/src/modules/webhooks/webhooks.service.ts:63-76`
   Regra violada: Critério de qualidade contra engolir erros silenciosamente e `docs/architecture.md` §2.1 **ID21 · Webhook** (consultar o pagamento no gateway como fonte da verdade antes de concluir/descartar o evento).
   Prejuízo concreto: O `catch` captura **qualquer** exceção de `this.gateway.getPayment(dataId)` (timeout, 502/503, falha de rede) e devolve `{ received: true }` (HTTP 200). Isso faz o Mercado Pago considerar a entrega concluída e cancelar retries; pior, como `this.recordEvent(input.requestId, input)` já persistiu o `WebhookEvent` antes da consulta ao gateway, qualquer reenvio com o mesmo `x-request-id` seria descartado por `P2002`. Em uma instabilidade momentânea da API do gateway, um PIX pago pelo cliente ficaria preso em `PENDING` para sempre. Apenas erro definitivo de pagamento inexistente (404, como a simulação `1212` do painel) deve encerrar com 200; falhas transitórias/infraestrutura não devem ser engolidas (nem queimar o `WebhookEvent` definitivamente).

2. **Condição de corrida (TOCTOU) nas atualizações de `Sale` e `Payment` dentro de `$transaction`** — `apps/api/src/modules/webhooks/webhooks.service.ts:92-147`
   Regra violada: `docs/architecture.md` §2.1 **ID8 · Dados** (integridade transacional sob concorrência com update condicional) e **ID21 · Webhook**.
   Prejuízo concreto: Sob o isolamento padrão `READ COMMITTED` do PostgreSQL, duas requisições concorrentes para a mesma venda com `x-request-id` distintos (ex.: resposta síncrona de cartão + webhook atrasado, ou dois webhooks simultâneos `approved` e `rejected`) podem ambas ler `sale.status === PENDING` antes do commit da outra, passar em `canTransitionSale` em memória e executar `tx.sale.update({ where: { id: sale.id }, ... })` sem predicado de status. A segunda transação pode regredir `Sale.status` de `COMPLETED` para `OPEN` ou sobrescrever `completedAt`, e `tx.payment.update({ where: { id: payment.id }, ... })` pode sobrescrever `APPROVED` com `DECLINED`. É necessário usar update condicional no status esperado (ex.: `updateMany` com `where: { id, status: sale.status }`) ou lock de linha (`SELECT ... FOR UPDATE`).

3. **Transição de `Sale` executada independentemente da transição do `Payment` vinculado** — `apps/api/src/modules/webhooks/webhooks.service.ts:110-146`
   Regra violada: `docs/architecture.md` §2.1 **ID8 · Dados** e **ID21 · Webhook** (atualização consistente de `Payment` e `Sale` em conjunto).
   Prejuízo concreto: Se o operador tiver uma tentativa com cartão recusada (`Payment 1` já `DECLINED`, `Sale` em `OPEN`) e em seguida gerar um PIX (`Payment 2` em `PENDING`, `Sale` em `PENDING`), um webhook atrasado `rejected` referente ao `Payment 1` não transiciona `Payment 1` (`canTransitionPayment(DECLINED, DECLINED)` é `false`), mas ainda executa a linha 138 (`canTransitionSale(PENDING, OPEN)` é `true`) e **regride a `Sale` de `PENDING` para `OPEN`**, quebrando o pagamento PIX em andamento. Além disso, se `payment` for `null` (não encontrado por `gatewayPaymentId`), a `Sale` ainda é atualizada para `COMPLETED` sem nenhum `Payment` correspondente em `APPROVED`. A transição da `Sale` deve estar condicionada à existência e transição válida do `Payment` correspondente.

## Sugestões (não bloqueiam)
- Em `apps/api/src/modules/webhooks/webhooks.service.ts:100-103`, a checagem `externalReference !== sale.id` é redundante porque `sale` acabou de ser buscado com `where: { id: externalReference }`. Pode ser simplificada mantendo a validação de `expectedAmountCents !== sale.totalCents` (e opcionalmente `expectedAmountCents !== payment.amountCents` quando `payment` existir).

## Observações fora do escopo deste diff
- Em `apps/api/src/modules/payments/payments.service.ts` (não modificado neste diff), `payWithCard` e `payWithPix` leem `sale` fora da `$transaction` e atualizam `tx.sale.update({ where: { id: sale.id } })` sem predicado condicional de status, compartilhando risco semelhante de corrida com webhooks simultâneos. Candidata a Issue de manutenção para blindar updates condicionais também no fluxo síncrono.
</Parecer de Código — Tarefa 8>
