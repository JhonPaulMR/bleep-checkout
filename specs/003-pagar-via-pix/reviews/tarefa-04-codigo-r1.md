<Parecer de Código — Tarefa 4>
**Veredito:** APROVADO

## Apontamentos (bloqueiam)
Nenhum apontamento bloqueante. O diff respeita a arquitetura acordada em `docs/architecture.md`:
- **Camadas e Gateway (ID6, ID20):** módulo `payments` isolado, SDK `mercadopago` encapsulado atrás da interface `PaymentGateway` com token `PAYMENT_GATEWAY` exportado em `PaymentsModule`.
- **Autenticação, Autorização e Swagger (ID9, §2.2):** `GET /payments/config` protegido pelos guards globais com `@Roles(Role.OPERATOR)` e anotado com `@ApiBearerAuth()`, `@ApiTags`, `@ApiOperation` e `@ApiResponse`.
- **Formato de resposta e segredos (ID10, ID17):** resposta envelopada em `{ data }` pelo `ResponseInterceptor` global; zero segredos hardcoded; uso de `ConfigService.getOrThrow` com variáveis validadas no boot; e2e valida que `MP_ACCESS_TOKEN` e `MP_WEBHOOK_SECRET` não vazam.
- **Sustentabilidade e testes (§2):** máquina de estados (`payment-state-machine.ts`) implementada como funções puras sem abstração desnecessária; matriz completa de transições coberta em `payment-state-machine.spec.ts` sem acoplamento a detalhes internos; imports ESM (`.js`) e Vitest + Supertest consistentes com o restante da API.

## Sugestões (não bloqueiam)
- **Encapsular a conversão centavos ↔ reais dentro de `MercadoPagoGateway`** (`apps/api/src/modules/payments/payment-gateway.interface.ts:9,21,38` e `apps/api/src/modules/payments/mercadopago.gateway.ts:28,53,79`): como o domínio da API trabalha com centavos inteiros (`Int`, ID8), usar `amountCents: number` na interface `PaymentGateway` e converter `amountCents / 100` (na ida) e `Math.round((response.transaction_amount ?? 0) * 100)` (na volta) dentro de `MercadoPagoGateway` evita vazar a unidade decimal do Mercado Pago para `PaymentsService` e reduz o risco de confusão de unidade ou erro de ponto flutuante ao reconciliar valores no webhook.
- **Falhar explicitamente se `response.id` vier ausente em `mapResponse`** (`apps/api/src/modules/payments/mercadopago.gateway.ts:77`): hoje `id: String(response.id ?? '')` mascara uma resposta inesperada do gateway como string vazia, adiando o erro para a persistência ou consulta posterior. Lançar erro quando `response.id == null` torna a falha imediata e rastreável.

## Observações fora do escopo deste diff
- Em `docs/architecture.md` (linha 79, ID17), a lista de variáveis obrigatórias ainda não menciona `MP_PUBLIC_KEY` (já presente em `apps/api/src/config/env.validation.ts`), e o Mapa de Domínios (§6) ainda não inclui os módulos `products`, `sales` e `payments` — vale sincronizar no fechamento da história ou em Issue de manutenção.
</Parecer de Código — Tarefa 4>
