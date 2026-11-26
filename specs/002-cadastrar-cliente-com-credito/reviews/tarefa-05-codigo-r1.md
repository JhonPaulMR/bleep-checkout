# Parecer de Código — Tarefa 5

**Veredito:** APROVADO

## Apontamentos (bloqueiam)
Nenhum apontamento bloqueante. O diff respeita a arquitetura frontend definida em `docs/architecture.md` (§2 e §4) e os tokens semânticos de `docs/design-tokens.md`:
- `CustomersPage` permanece isolada na camada de página, consumindo apenas `CustomersService` via `inject()` e gerenciando estado com Signals (`signal`/`computed`) e controle de fluxo `@if`/`@else if`.
- O tratamento de erros em `submit()` desliga `saving` em todos os caminhos, delega `401` ao `authInterceptor`, mapeia `409` para `cpfConflictError` com fallback seguro e usa `CONNECTION_ERROR_MESSAGE` para falhas de rede/conexão.
- Os estilos usam exclusivamente tokens semânticos (`border-perigo`, `border-desabilitado`, `text-legenda`, `text-perigo`, `gap-xs`), sem valores hex soltos.
- Os testes em `customers.page.spec.ts` exercitam o comportamento observável via DOM e validam a integração real com `authInterceptor` no cenário `401`.

## Sugestões (não bloqueiam)
- **Simplificar exibição do erro de CPF no template** (`apps/web/src/app/features/customers/pages/customers.page.html:272-282` e `customers.page.ts:63-65`): os blocos `@if (cpfConflictError(); as message)` e `@else if (submitted() && cpfError(); as message)` renderizam a mesma marcação `<p>` com ícone `error`. Um `computed` `cpfDisplayError = computed(() => this.cpfConflictError() ?? (this.submitted() ? this.cpfError() : null))` eliminaria a duplicação no HTML e simplificaria `cpfHasError`.
- **Garantir limpeza do `sessionStorage` em caso de falha do teste** (`apps/web/src/app/features/customers/pages/customers.page.spec.ts:181,246`): mover `sessionStorage.clear()` para um `afterEach` (ou `try/finally`) garante que o estado de sessão não vaze caso alguma asserção falhe no meio do teste de `401`.

## Observações fora do escopo deste diff
- **Tratamento repetido de erros HTTP (`401`/`409`/rede) nas páginas do gerente**: `CustomersPage`, `ProductsPage` e `OperatorsPage` repetem o mesmo padrão de inspeção de `HttpErrorResponse` (`401`, extração de `err.error?.message` no `409` e constante `'Não foi possível conectar. Tente novamente.'`). Caso mais cadastros sejam adicionados, vale avaliar uma Issue de manutenção para extrair um helper compartilhado em `apps/web/src/app/core/` ou `shared/`.
