<Parecer de Conformidade — Tarefa 3>
**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA1 — Seleção de **Crédito externo** (`EXTERNAL_CREDIT`) ou **Débito externo** (`EXTERNAL_DEBIT`), clique em **Aprovado na máquina** (`approved: true`) e tela de conclusão exibindo *Crédito externo* ou *Débito externo* | atendido | `apps/web/src/app/features/checkout/pages/checkout.page.html:498-501`, `apps/web/src/app/features/checkout/pages/checkout.page.html:635-667`, `apps/web/src/app/features/checkout/pages/checkout.page.html:743-755`, `apps/web/src/app/features/checkout/pages/checkout.page.ts:207-212`, `apps/web/src/app/features/checkout/pages/checkout.page.ts:595-615`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:1619-1705` |
| CA2 — Clique em **Não aprovado na máquina** (`approved: false`) mantendo `Sale` em `OPEN`, exibindo alerta claro de recusa (sem botão de cartão) e permitindo tentar novamente ou trocar de forma | atendido | `apps/web/src/app/features/checkout/pages/checkout.page.html:670-690`, `apps/web/src/app/features/checkout/pages/checkout.page.html:757-769`, `apps/web/src/app/features/checkout/pages/checkout.page.ts:30-31`, `apps/web/src/app/features/checkout/pages/checkout.page.ts:214-218`, `apps/web/src/app/features/checkout/pages/checkout.page.ts:595-615`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:1707-1759` |
| CA3 — Seleção de **Crédito externo** ou **Débito externo** não aprova automaticamente nem oferece atalho sem confirmação explícita | atendido | `apps/web/src/app/features/checkout/pages/checkout.page.ts:499-513`, `apps/web/src/app/features/checkout/pages/checkout.page.html:727-771`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:1580-1617` |
| CA4 — Restrição por papel (`MANAGER` / outro `OPERATOR` → `403`) e venda inexistente (`404`) | fora desta tarefa | Coberto na Tarefa 1 (API) |
| CA5 — Botões de confirmação (e seletores de forma) desabilitados em estado de carregamento enquanto a requisição está em andamento, impedindo duplo clique | atendido | `apps/web/src/app/features/checkout/pages/checkout.page.html:646`, `apps/web/src/app/features/checkout/pages/checkout.page.html:663`, `apps/web/src/app/features/checkout/pages/checkout.page.html:747-768`, `apps/web/src/app/features/checkout/pages/checkout.page.ts:598-604`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:1761-1809` |
| CA6 — Trocar de forma de pagamento sem confirmar nunca dispara requisição; erro de rede na confirmação mantém `OPEN`, exibe erro claro e mantém os controles ativos para repetir a ação | atendido | `apps/web/src/app/features/checkout/pages/checkout.page.ts:499-513`, `apps/web/src/app/features/checkout/pages/checkout.page.ts:616-620`, `apps/web/src/app/features/checkout/pages/checkout.page.html:692-694`, `apps/web/src/app/features/checkout/pages/checkout.page.spec.ts:1811-1844` |

## Apontamentos

*(nenhum)*

**Verificações executadas:**
- `git diff 93c8f6a89342510da078432ad4b95034f3066290`: apenas os 3 arquivos previstos na Tarefa 3 alterados, sem escopo inflado e com nomenclatura fiel ao glossário de `docs/architecture.md` (`EXTERNAL_CREDIT`, `EXTERNAL_DEBIT`, `APPROVED`, `DECLINED`, `OPEN`, `COMPLETED`).
- `cd apps/web; npm test`: 16 arquivos de teste, 162 testes passaram (47 em `checkout.page.spec.ts`).
- `cd apps/web; npm run lint`: `All files pass linting.`
</Parecer de Conformidade — Tarefa 3>
