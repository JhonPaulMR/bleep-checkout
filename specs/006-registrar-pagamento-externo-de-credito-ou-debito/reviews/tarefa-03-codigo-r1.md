<Parecer de Código — Tarefa 3>
**Veredito:** APROVADO

## Apontamentos (bloqueiam)
Nenhum.

Verificações realizadas contra `docs/architecture.md`:
- **Camadas (§4):** `CheckoutPage` consome exclusivamente `CheckoutService.payExternal(...)`, sem acesso direto a `HttpClient`, URLs ou envelope `{ data }`.
- **Padrões Angular 22+ (§2):** uso consistente de signals (`computed`), controle de fluxo `@if` / `@else if` / `@else`, e `vi.fn()` nos testes Vitest.
- **Design Tokens (§2 + `docs/design-tokens.md`):** todas as classes do diff usam tokens semânticos (`primaria`, `sucesso`, `perigo`, `fundo`, `superficie`, `texto`, `texto-suave`, `desabilitado`, espaçamentos e tipografia), sem cores hex soltas. As variantes `sucesso` ("Aprovado na máquina") e `perigo` ("Não aprovado na máquina") seguem a tabela de botões de `docs/design-tokens.md`.
- **Tratamento de erro:** `submitExternalPayment` trata erro de rede/API exibindo mensagem via `paymentError` e restaurando `submittingPayment`, delegando `401` ao interceptor global de autenticação.
- **Testes:** os 6 novos testes em `checkout.page.spec.ts` verificam comportamento observável via DOM e mock do `CheckoutService`, sem acoplamento a propriedades internas. Suíte (`162/162`) e `ng lint` passaram sem erros.

## Sugestões (não bloqueiam)
- **Reutilizar `PaymentMethod` em vez de manter alias duplicado** — `apps/web/src/app/features/checkout/pages/checkout.page.ts:35-40`: `CheckoutPaymentMethod` agora possui exatamente a mesma união de `PaymentMethod` já exportado em `apps/web/src/app/features/checkout/data/checkout.service.ts:17-22`. Importar `PaymentMethod` diretamente evita manter dois tipos idênticos em sincronia.
- **Centralizar os rótulos dos métodos externos** — `apps/web/src/app/features/checkout/pages/checkout.page.ts:203-212`: `selectedExternalMethodLabel` e `completedExternalMethodLabel` repetem o mapeamento `'EXTERNAL_CREDIT' -> 'Crédito externo'` e `'EXTERNAL_DEBIT' -> 'Débito externo'`. Um mapa constante `Record<ExternalPaymentMethod, string>` deixaria ambos os `computed` mais concisos.

## Observações fora do escopo deste diff
- **Tamanho crescente da `CheckoutPage`** — `apps/web/src/app/features/checkout/pages/checkout.page.ts` (~890 linhas) e `checkout.page.html` (~1160 linhas) já acumulam simulador de caixa, modais de busca/cliente e 5 formas de pagamento. Candidata a Issue de manutenção futura para extração de subcomponentes em `features/checkout/components/` (seguindo `input()`/`output()` conforme `architecture.md` §4).
</Parecer de Código — Tarefa 3>
