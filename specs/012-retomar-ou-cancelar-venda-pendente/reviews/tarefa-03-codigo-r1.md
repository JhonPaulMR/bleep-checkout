<Parecer de Código — Tarefa 3>
**Veredito:** APROVADO

## Apontamentos (bloqueiam)
Nenhum.

- **Camadas e fronteiras (`architecture.md` §4):** `PendingSalesPage` consome exclusivamente `PendingSalesService`, sem acessar `HttpClient`, URLs ou envelope `{ data }`, e sem importar de outras features (`checkout`, etc.).
- **Padrões Angular e Tailwind (`architecture.md` §2):** componente standalone (sem `standalone: true`), `inject()`, `signal()`, `@if`/`@else`/`@for` com `track sale.id`, lazy loading em `/pendentes` com `canMatch: [roleGuard('OPERATOR')]`, e uso exclusivo de tokens semânticos de `styles.css`/`docs/design-tokens.md` (sem cores hex soltas).
- **Glossário e idioma (`architecture.md` §5.1):** código e símbolos em inglês; interface de usuário em português.
- **Qualidade de testes e lint (`architecture.md` §2):** Vitest (`vi.fn()` / `vi.spyOn()`), testes orientados a comportamento observável (DOM, rotas e chamadas ao service), sem acoplamento a estado interno. Suíte completa (`cd apps/web; npm test`: 18 arquivos / 185 testes) e lint (`cd apps/web; npm run lint`) passando sem erros.

## Sugestões (não bloqueiam)
- **Concorrência entre reabertura de vendas distintas** — `apps/web/src/app/features/pending-sales/pages/pending-sales.page.ts:97-113`
  `isSaleBusy(saleId)` verifica apenas a própria venda; se o operador clicar em "Trocar forma" de duas vendas diferentes em sequência rápida, `reopeningSaleId` é sobrescrito e a primeira resposta a retornar pode limpar o estado de carregamento da segunda ou disparar navegação concorrente. Bloquear novas ações enquanto `reopeningSaleId() !== null` (ou manter o estado por conjunto de IDs) tornaria a proteção contra concorrência mais previsível.
- **Listener `Escape` duplicado no modal** — `apps/web/src/app/features/pending-sales/pages/pending-sales.page.html:160` e `apps/web/src/app/features/pending-sales/pages/pending-sales.page.ts:157-162`
  O fechamento por `Escape` já é tratado em `host: { '(window:keydown)': 'onWindowKeydown($event)' }`, tornando `(keydown.escape)="closeCancelConfirm()"` no container do modal redundante (embora inofensivo). Manter apenas o handler global evita duplicidade de caminho.

## Observações fora do escopo deste diff
- **Utilitários de formatação e erro HTTP repetidos entre features** — `apps/web/src/app/features/pending-sales/pages/pending-sales.page.ts`, `apps/web/src/app/features/customers/pages/customers.page.ts`, `apps/web/src/app/features/products/pages/products.page.ts` e `apps/web/src/app/features/checkout/pages/checkout.page.ts`
  A formatação monetária (`Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`) e a extração de mensagens do `HttpExceptionFilter` estão replicadas por feature, e a pasta `apps/web/src/app/shared/` prevista em `architecture.md` §3 ainda não foi criada. Candidata a Issue de manutenção para centralizar formatadores, extrator de erro da API e selos de status em `shared/`.
</Parecer de Código — Tarefa 3>
