</Revisor de Conformidade>
<Parecer de Conformidade — Tarefa 1>
**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA12 — API recusa subir no boot se `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY` ou `MP_WEBHOOK_SECRET` estiverem ausentes (`ConfigModule` / `env.validation.ts`) | atendido | `apps/api/src/config/env.validation.ts:1-24`, `apps/api/src/app.module.ts:15`, `apps/api/src/config/env.validation.spec.ts:1-50` |
| CA12 — `.env.example` lista apenas os nomes/placeholders das variáveis, sem nenhuma credencial (nem de teste) no repositório | atendido | `apps/api/.env.example:16-19`, `.github/workflows/ci.yml:43-45` |
| Escopo Tarefa 1 (plan.md) — SDK oficial `mercadopago` instalado e variáveis descartáveis no CI | atendido | `apps/api/package.json:37`, `package-lock.json`, `.github/workflows/ci.yml:43-45` |

## Apontamentos
*(nenhum)*
</Parecer de Conformidade — Tarefa 1>
