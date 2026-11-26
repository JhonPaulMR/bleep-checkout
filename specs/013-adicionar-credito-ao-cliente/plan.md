# Plano — Issue #13

## Decisões técnicas

- **API (`apps/api/src/modules/customers/`):**
  - `POST /customers/:id/credits` — `@Roles(Role.MANAGER)`, corpo validado por `AddCreditDto` (`amountCents`: `@IsInt() @Min(1)` com `@ApiProperty`).
  - Em `CustomersService.addCredit(customerId: string, amountCents: number)`: dentro de `prisma.$transaction`, verifica existência do cliente (`findUnique`), lança `NotFoundException('Cliente não encontrado.')` (`404`) se não existir, atualiza `balanceCents: { increment: amountCents }` e cria `CreditTransaction` (`type: CreditType.TOP_UP`, `amountCents`). Retorna `201` com `{ data: updatedCustomer }`.
  - Documentação Swagger com `@ApiOperation` e `@ApiResponse` (`201`, `400`, `401`, `403`, `404`).
- **Frontend (`apps/web/src/app/features/customers/`):**
  - `CustomersService.addCredit(customerId: string, amountCents: number): Observable<Customer>` → `POST ${this.apiUrl}/customers/${customerId}/credits` enviando `{ amountCents }` e desembrulhando `{ data }`.
  - `CustomersPage`: habilita o botão `+ Adicionar crédito` (removendo `// TODO #13`), abre o modal **Adicionar crédito — [Nome]** fiel ao protótipo `clientes.html` (card **Saldo atual**, campo `Valor a adicionar (R$)*` com erro inline `"Informe um valor maior que zero. O saldo não foi alterado."`, prévia **Saldo após** com `saldo + valor` ou `—`, botões `Cancelar` e `Adicionar crédito` com estado carregando `"Adicionando..."`), atualiza o cliente na lista e os 3 cards de resumo após sucesso, e trata cancelamento sem envio, `401` (via `authInterceptor`) e falha de rede (`CONNECTION_ERROR_MESSAGE`).

## Tarefas

- [ ] **Tarefa 1 — Implementar `POST /customers/:id/credits` na API com transação `TOP_UP` (unit + e2e)**
  - Cobre: CA1 (lado da API), CA2 (lado da API), CA3, CA4, CA5
  - Teste primeiro: testes unitários em `customers.service.spec.ts` (incremento atômico de `balanceCents` + gravação de `CreditTransaction(TOP_UP)` na mesma `$transaction`; `NotFoundException` `"Cliente não encontrado."` quando cliente não existe) e testes e2e em `apps/api/test/customers.e2e-spec.ts` (`POST /customers/:id/credits` `201` para `MANAGER` somando exatamente o valor e gravando `CreditTransaction(TOP_UP)`; `400` para `0`, negativo, decimal ou campo extra sem alterar saldo; `403` para `OPERATOR` sem alterar saldo; `404` para `id` inexistente; `401` sem token/token inválido); falham porque DTO, método e rota ainda não existem
  - Arquivos previstos: `apps/api/src/modules/customers/dto/add-credit.dto.ts`, `apps/api/src/modules/customers/customers.service.ts`, `apps/api/src/modules/customers/customers.service.spec.ts`, `apps/api/src/modules/customers/customers.controller.ts`, `apps/api/test/customers.e2e-spec.ts`

- [ ] **Tarefa 2 — Adicionar `addCredit()` em `CustomersService` no frontend**
  - Cobre: CA1 (camada de serviço no frontend)
  - Teste primeiro: teste unitário em `customers.service.spec.ts` verificando que `addCredit(id, amountCents)` faz `POST /customers/:id/credits` com `{ amountCents }` e desembrulha `{ data }`; falha porque o método ainda não existe
  - Arquivos previstos: `apps/web/src/app/features/customers/data/customers.service.ts`, `apps/web/src/app/features/customers/data/customers.service.spec.ts`

- [ ] **Tarefa 3 — Habilitar "+ Adicionar crédito" e implementar modal de recarga com prévia, validação inline e tratamento de erros na tela de Clientes**
  - Cobre: CA1 (interface), CA2 (validação inline), CA6 (`401` via `authInterceptor`), CA7 (falha de rede), CA8 (cancelamento sem alterar saldo)
  - Teste primeiro: testes unitários em `customers.page.spec.ts` verificando botão `+ Adicionar crédito` habilitado, abertura do modal com nome e saldo atual, prévia "Saldo após" atualizada dinamicamente (ou `—` se inválido), bloqueio e mensagem `"Informe um valor maior que zero. O saldo não foi alterado."` para vazio/zero/negativo, envio válido atualizando saldo na tabela e cards de resumo, cancelamento sem chamar `addCredit`, erro de rede exibindo `"Não foi possível conectar. Tente novamente."` mantendo valor, e teste integrado de `401` com `authInterceptor` levando ao `/login`; falham porque o botão está desabilitado e o modal de recarga não existe
  - Arquivos previstos: `apps/web/src/app/features/customers/pages/customers.page.ts`, `apps/web/src/app/features/customers/pages/customers.page.html`, `apps/web/src/app/features/customers/pages/customers.page.spec.ts`

## Critérios sem tarefa
