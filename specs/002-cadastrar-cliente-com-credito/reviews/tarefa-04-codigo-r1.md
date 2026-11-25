# Parecer de Código — Tarefa 4

**Veredito:** APROVADO

## Apontamentos (bloqueiam)
Nenhum apontamento bloqueante.

Verificações realizadas contra `docs/architecture.md` e `docs/design-tokens.md`:
- **Camadas e fronteiras (§4):** `CustomersPage` consome exclusivamente `CustomersService` via `inject()`, sem acesso direto a `HttpClient`, URLs ou desembrulho de `{ data }`, e sem importar de outras `features/*`.
- **Padrões Angular 22+ (§2):** componente standalone (sem `standalone: true`), estado reativo com `signal()`/`computed()`, controle de fluxo com `@if`/`@else`, e `inject()`.
- **Design Tokens (§2 e `docs/design-tokens.md`):** o modal utiliza exclusivamente tokens semânticos de cor (`primaria`, `perigo`, `superficie`, `fundo`, `texto`, `texto-suave`, `desabilitado`), tipografia (`titulo-secao`, `corpo`, `corpo-destaque`, `legenda`) e espaçamento (`xs`, `sm`, `md`, `lg`), sem cores hex ou classes de cor arbitrárias.
- **Tratamento de erro e resiliência:** `submit()` desabilita ações e bloqueia `closeModal()` enquanto `saving()` está ativo, limpa o estado de carregamento e exibe feedback em `role="alert"` em caso de falha (o tratamento específico de `409`, `401` e falha de rede está corretamente reservado à Tarefa 5 do plano).
- **Testes (§2):** `customers.page.spec.ts` usa `vi.fn()` (Vitest/ESM) e valida comportamento observável no DOM e o contrato de `CustomersService.create`, sem acoplamento a detalhes internos de implementação.

## Sugestões (não bloqueiam)
- **Conversão monetária duplicada entre features (`apps/web/src/app/features/customers/pages/customers.page.ts:22-28` vs `apps/web/src/app/features/products/pages/products.page.ts:14-20`):** `parseBalanceToCents` repete quase integralmente a lógica de `parsePriceToCents` (com a diferença benéfica de limitar a até 2 casas decimais). Quando surgir um terceiro ponto de uso (ex.: recarga de crédito na US12 `#13`), vale subir os helpers de formatação/parsing BRL para `apps/web/src/app/shared/` conforme `docs/architecture.md` §4.
- **Clareza de mensagem em `balanceError` (`apps/web/src/app/features/customers/pages/customers.page.ts:61-66`):** valores não numéricos (como `abc`) ou com mais de 2 casas decimais (`10,123`) recebem a mesma mensagem `'O saldo inicial não pode ser negativo.'`. Diferenciar `cents === null` de `cents < 0` daria feedback mais preciso ao usuário.

## Observações fora do escopo deste diff
- `BRL_FORMATTER` já estava duplicado entre `products.page.ts` e `customers.page.ts` antes deste diff; candidato a extração conjunta para `shared/` em uma Issue de manutenção.
- `ProductsPage.closeModal()` (`apps/web/src/app/features/products/pages/products.page.ts:107-110`) não possui a guarda `if (this.saving()) return;` adotada corretamente em `CustomersPage.closeModal()`; candidata a alinhamento futuro.
