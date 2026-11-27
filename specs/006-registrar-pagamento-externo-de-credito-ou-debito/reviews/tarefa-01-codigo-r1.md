<Parecer de Código — Tarefa 1>
**Veredito:** APROVADO

## Apontamentos (bloqueiam)
Nenhum apontamento bloqueante.

O diff respeita integralmente as regras de `docs/architecture.md`:
- **ID6 (Camadas):** `PaymentsController` apenas recebe DTO/parâmetros e delega ao `PaymentsService`; nenhuma regra de negócio ou acesso ao Prisma no controller, e nenhum conhecimento de `Request`/`Response` no service.
- **ID7 (Entrada) e §2.2 (Swagger):** `PayExternalDto` valida `method` (`@IsIn` restrito a `EXTERNAL_CREDIT` e `EXTERNAL_DEBIT`) e `approved` (`@IsBoolean`), com `@ApiProperty` em ambos os campos e documentação OpenAPI (`@ApiOperation`, `@ApiResponse` e `@ApiBearerAuth` herdado da classe) no controller.
- **ID8 (Dados):** acesso exclusivo via `PrismaService`, valor obtido de `sale.totalCents` (centavos inteiros no servidor, nunca do cliente) e escrita atômica em `prisma.$transaction` com `updateMany` condicional (`where: { id: sale.id, status: SaleStatus.OPEN }`) no fluxo de aprovação.
- **ID9 (Autenticação):** protegido por `@Roles(Role.OPERATOR)` sob `JwtAuthGuard` + `RolesGuard` globais e validação de posse do operador reutilizada via `findOpenOwnedSale`.
- **ID10 (Resposta e erro):** retorno compatível com `ResponseInterceptor` (`{ data: { payment, sale } }`) e exceções HTTP (`404`, `403`, `422`) tratadas pelo `HttpExceptionFilter` global.
- **Verificação executada:** `cd apps/api; npm test` (13 arquivos, 171/171 passando) e `cd apps/api; npm run lint` (0 warnings, 0 errors).

## Sugestões (não bloqueiam)
- **Extrair constante de `include` da venda em `apps/api/src/modules/payments/payments.service.ts` (linhas 316–320 e 331–335):** o objeto `{ items: { include: { product: true } }, payments: true, customer: true }` já se repete em `payWithCustomerCredit` e duas vezes em `payExternal`. Uma constante privada `SALE_WITH_DETAILS_INCLUDE` no topo do arquivo evitaria divergência futura no formato retornado de `sale`.
- **Reconsulta pós-inserção no ramo `approved: false` em `apps/api/src/modules/payments/payments.service.ts` (linhas 326–359):** o ramo `approved: false` monta `payments: [...openSale.payments, payment]` manualmente em memória após o `findFirst`, enquanto o ramo `approved: true` usa `tx.sale.findUniqueOrThrow` após o `payment.create`. Manter o mesmo padrão nos dois ramos simplifica a leitura e evita acoplamento do teste unitário à ordem exata de `findFirst` vs `findUniqueOrThrow`.

## Observações fora do escopo deste diff
- **`payWithCustomerCredit` duplica a validação de `findOpenOwnedSale` (`apps/api/src/modules/payments/payments.service.ts:183-202`):** além da duplicação pré-existente, usa a mensagem `'Venda não está aberta para pagamento.'` (sem artigo) enquanto `findOpenOwnedSale` usa `'A venda não está aberta para pagamento.'`. Candidata a Issue de manutenção para unificação.
- **Mapa de Domínios (`docs/architecture.md` §6, linha 321):** no fechamento da história, atualizar a linha de `Pagamentos` para refletir a rota `POST /sales/:id/payments/card|pix|credit|external` e a US correspondente.
</Parecer de Código — Tarefa 1>
