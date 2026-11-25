# Parecer de Código — Tarefa 4

**Veredito:** APROVADO

## Apontamentos (bloqueiam)
Nenhum. O diff respeita a arquitetura acordada em `docs/architecture.md` e os tokens de `docs/design-tokens.md`:
- **Camadas (§4):** `ProductsPage` consome apenas `ProductsService` via `inject()`, sem acesso direto a `HttpClient`, URLs ou envelope `{ data }`, e sem imports entre features.
- **Padrões Angular 22+ (§2):** componente standalone sem `standalone: true`, estado em signals (`signal` / `computed`), controle de fluxo `@if`, e testes em Vitest com `vi.fn()`.
- **Design Tokens (§2 e `docs/design-tokens.md`):** todas as cores, espaçamentos e tipografias do modal usam exclusivamente tokens semânticos definidos em `apps/web/src/styles.css` (`primaria`, `superficie`, `fundo`, `texto`, `texto-suave`, `perigo`, `sucesso`, `desabilitado`, `xs`–`lg`, `titulo-secao`, `corpo`, `corpo-destaque`, `legenda`), sem hex solto nem cores genéricas do Tailwind.
- **Testes:** os 4 novos testes em `products.page.spec.ts` exercitam o componente pelo DOM e pelo contrato de `ProductsService`, sem acoplamento a estado interno, cobrindo inclusive o estado `Salvando...` e o bloqueio de duplo envio via `Subject`.

## Sugestões (não bloqueiam)
- **Bloquear fechamento do modal durante salvamento (`products.page.html:42,150` / `products.page.ts:104`):** os botões `X` e `Cancelar` permanecem habilitados enquanto `saving()` é `true`. Desabilitá-los durante `saving()` (ou guardar `if (this.saving()) return;` em `closeModal()`) evita que o usuário feche e reabra o modal com uma requisição `POST /products` ainda em andamento, cujo callback `next`/`error` afetaria o formulário recém-aberto.
- **Restringir casas decimais em `parsePriceToCents` (`products.page.ts:11`):** a regex `/^-?\d+(?:[.,]\d+)?$/` aceita mais de 2 casas decimais (ex.: `10,999`) e arredonda silenciosamente via `Math.round(numeric * 100)` para `1100` (`R$ 11,00`). Restringir para `/^-?\d+(?:[.,]\d{1,2})?$/` evita divergência silenciosa entre o valor digitado e o preço gravado em centavos.
- **Redundância menor em `submit()` (`products.page.ts:132-133`):** `this.saving.set(false)` é chamado logo antes de `this.closeModal()`, que já invoca `this.resetForm()` e zera `saving`. Pode ser simplificado removendo a linha redundante.

## Observações fora do escopo deste diff
- **`shared/ui/` para botões reutilizáveis (`architecture.md §3`):** os botões primário/secundário com os 5 estados continuam estilizados diretamente nos templates das páginas (`products.page.html`, `operators.page.html`, `checkout.page.html`). Candidato a extração para `apps/web/src/app/shared/ui/` em uma task de manutenção quando o padrão consolidar.
- **Formatador de moeda BRL (`products.page.ts:5`):** `BRL_FORMATTER` introduzido na Tarefa 3 pode subir para `shared/` caso novas features (ex.: `customers` na US02/US12) precisem da mesma formatação.
