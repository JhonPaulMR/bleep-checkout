<Parecer de Código — Tarefa 6>
**Veredito:** APROVADO

## Apontamentos (bloqueiam)
Nenhum. O diff da Tarefa 6 atende às regras estruturais de `docs/architecture.md`:
- **ID6 (Camadas):** `PaymentsController.payWithPix` (`apps/api/src/modules/payments/payments.controller.ts:79-106`) apenas recebe a requisição HTTP e delega para `PaymentsService.payWithPix`; `PaymentsService` (`apps/api/src/modules/payments/payments.service.ts:134-204`) concentra a regra de negócio, sem conhecer `Request`/`Response`, e extraiu `findOpenOwnedSale` para evitar duplicação com `payWithCard`.
- **ID8 (Dados):** acesso exclusivo via `PrismaService`, valores em centavos inteiros (`amountCents: sale.totalCents`), criação prévia do `Payment` (`PENDING`) para fornecer `idempotencyKey: payment.id` e atualização conjunta de `Payment` e `Sale` dentro de `this.prisma.$transaction`.
- **ID9 (Autenticação/Autorização):** rota protegida pelo `JwtAuthGuard` global, restrita a `@Roles(Role.OPERATOR)` (`RolesGuard` global) e com verificação explícita de propriedade (`sale.operatorId !== operatorId`) em `findOpenOwnedSale`.
- **ID10 e §2.2 (Resposta, erro e Swagger):** retorno segue o envelope `{ data }` via `ResponseInterceptor` global, erros de domínio usam `NotFoundException` (`404`), `ForbiddenException` (`403`) e `UnprocessableEntityException` (`422`) tratados pelo `HttpExceptionFilter` global, e o endpoint possui `@ApiBearerAuth()`, `@ApiOperation` e `@ApiResponse`.
- **ID17 e ID20 (Segredos e Gateway):** nenhum segredo hardcoded; integração isolada atrás da interface `PaymentGateway` (`@Inject(PAYMENT_GATEWAY)`), testada com mock unitário e `fakeGateway` no e2e sem dependência de rede.

## Sugestões (não bloqueiam)
- **Endurecer transição concorrente em `payWithPix`** (`apps/api/src/modules/payments/payments.service.ts:154-178`): `canTransitionSale(sale.status, SaleStatus.PENDING)` verifica o snapshot `sale` lido antes da chamada ao gateway (`linha 135`) e `tx.sale.update` filtra apenas por `{ id: sale.id }`. Em duas requisições simultâneas para a mesma venda `OPEN`, a segunda transação não detectaria que o estado mudou enquanto aguardava o gateway. Reler a venda dentro da `$transaction` (ou usar atualização condicional exigindo `status: SaleStatus.OPEN`) fecha essa janela.
- **Validar resposta mínima do gateway PIX** (`apps/api/src/modules/payments/payments.service.ts:161-168`): `qrCode` e `qrCodeBase64` usam fallback `?? null`. Se o gateway retornar sucesso sem `id` ou sem `qrCode`, a venda transicionaria para `PENDING` sem um QR Code utilizável.

## Observações fora do escopo deste diff
- `apps/api/src/modules/payments/payments.service.ts:62-131` (`payWithCard`): apresenta o mesmo padrão de checagem de transição usando o snapshot `sale` lido antes da chamada ao gateway, sem releitura ou condição de status no `where` dentro de `$transaction`.
- `docs/architecture.md` (§5.1, §5.2 e §6): o glossário/ER ainda não inclui `CARD` em `PaymentMethod` nem `qrCodeBase64` em `Payment`, e o Mapa de Domínios (§6) ainda lista apenas `auth` e `users` — vale atualizar no fechamento da história.
</Parecer de Código — Tarefa 6>
