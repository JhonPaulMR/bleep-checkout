# Parecer de Código — Tarefa 3

**Veredito:** APROVADO

## Apontamentos (bloqueiam)
Nenhum. O código respeita as camadas (ID6), validação de entrada com DTOs e `ValidationPipe` global (ID7), acesso exclusivo via `PrismaService` com transação e valores monetários em centavos inteiros (ID8), autenticação/autorização estrita por papel e posse da venda (ID9), contrato global de resposta/erro (ID10) e documentação OpenAPI com `@ApiBearerAuth` e `@ApiProperty` (§2.2).

## Sugestões (não bloqueiam)
- **`apps/api/src/modules/sales/sales.service.spec.ts:120-123` e `239-242`:** Os testes unitários fazem asserção estrita sobre o objeto `include` passado ao Prisma (`items: { include: { product: true } }, payments: { orderBy: { createdAt: 'asc' } }`). Isso acopla levemente o teste unitário ao formato da query; usar `expect.objectContaining` (como já feito na linha 157) evita que ajustes futuros no `include` quebrem o teste unitário sem mudança de regra de negócio, deixando a conferência da estrutura retornada para o e2e.
- **`apps/api/src/modules/sales/sales.service.ts:49`:** O erro de negócio (422) usa `UnprocessableEntityException` diretamente do NestJS, consistente com o padrão atual de `UsersService`. Como o `docs/architecture.md` (ID10) prevê classes próprias para erros de domínio (409/422), vale considerar introduzir uma hierarquia enxuta em `apps/api/src/common/` quando surgirem novos erros de domínio nas próximas tarefas/histórias.

## Observações fora do escopo deste diff
- `docs/architecture.md` (§6 Mapa de Domínios): atualizar a tabela com os novos módulos (`products` e `sales`) no fechamento desta história, conforme convenção do documento ("uma linha por história implementada").
- `apps/api/src/common/`: ainda não possui classes próprias de erro de domínio (candidata a padronização transversal quando houver mais casos de 409/422).
