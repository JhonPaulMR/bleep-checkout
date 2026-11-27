<Parecer de Código — Tarefa 2>
**Veredito:** APROVADO

## Apontamentos (bloqueiam)
Nenhum.

## Sugestões (não bloqueiam)
- Em `apps/web/src/app/features/checkout/data/checkout.service.ts:24`, `ExternalPaymentMethod` pode ser derivado de `PaymentMethod` via `Extract<PaymentMethod, 'EXTERNAL_CREDIT' | 'EXTERNAL_DEBIT'>` para manter o vínculo estrutural caso o tipo base evolua. A união literal atual, porém, já é clara e coerente com o glossário do `docs/architecture.md` (§5.1).

## Observações fora do escopo deste diff
- Em `apps/web/src/app/features/checkout/data/checkout.service.ts:165`, `:204` e `:210`, os métodos pré-existentes `getSale()`, `payWithCard()` e `payWithPix()` interpolam `saleId` sem `encodeURIComponent(saleId)`, diferentemente de `payWithCustomerCredit()` e do novo `payExternal()`. Candidata a padronização em manutenção futura.

---
**Verificações executadas:**
- `git diff f9664174d7c4c4814e3556929d3514cdba91e290` revisado integralmente contra `docs/architecture.md` (§2, §4, §5.1).
- `cd apps/web; npm test` — 16 arquivos, 156 testes aprovados (`checkout.service.spec.ts`: 18 testes).
- `cd apps/web; npm run lint` — `All files pass linting.`
</Parecer de Código — Tarefa 2>
