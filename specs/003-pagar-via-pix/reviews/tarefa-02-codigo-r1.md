# Parecer de Código — Tarefa 2

**Veredito:** APROVADO

## Apontamentos (bloqueiam)
Nenhum. O schema Prisma, a migration SQL, o seed e o teste e2e respeitam integralmente o `docs/architecture.md` (§2, ID8, ID20, ID21, §5.1 e §5.2): dinheiro em centavos inteiros (`Int`), chaves únicas de idempotência (`Payment.gatewayPaymentId` nullable `@unique` e `WebhookEvent.gatewayEventId` `@unique`), unicidade composta `SaleItem(saleId, productId)`, `Product.barcode` único, FKs com `ON DELETE RESTRICT`, seed idempotente sem segredos hardcoded e testes com Vitest usando `PrismaService` e limpeza isolada por teste.

## Sugestões (não bloqueiam)
- **`apps/api/prisma/schema.prisma:90` (`@@index([saleId])` em `SaleItem`):** como `SaleItem` já possui `@@unique([saleId, productId])` na linha 89, no PostgreSQL esse índice B-tree composto já cobre consultas filtradas por `saleId` (coluna líder), tornando `@@index([saleId])` redundante em escrita/armazenamento. Não exige alteração nesta migration, mas pode ser evitado ou limpo em evoluções futuras.
- **`apps/api/test/payments-schema.e2e-spec.ts:27`:** o `ConfigModule.forRoot({ isGlobal: true })` é dispensável nesse setup mínimo (o `import 'dotenv/config'` já carrega o ambiente e `seed.e2e-spec.ts` instancia apenas `PrismaModule`).
- **`apps/api/test/payments-schema.e2e-spec.ts:168`:** considerar um assert adicional garantindo que dois registros `Payment` com `gatewayPaymentId: null` coexistam sem violar `P2002`, documentando explicitamente o comportamento esperado do PostgreSQL para pagamentos ainda sem ID do gateway (CA3/CA6) ou métodos sem gateway.

## Observações fora do escopo deste diff
- Ao concluir a história US06 (`#3`), atualizar `docs/architecture.md` (§5.1 Glossário Técnico, §5.2 Diagrama ER e §6 Mapa de Domínios) para documentar `PaymentMethod.CARD`, `Payment.qrCodeBase64` e as novas entidades já materializadas no banco, seguindo o padrão adotado no fechamento das issues `#10` e `#11`.
