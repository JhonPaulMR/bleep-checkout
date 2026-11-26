# Parecer de Conformidade — Tarefa 3

**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA1 — Botão `+ Adicionar crédito` habilitado, modal com saldo atual, campo de valor, prévia "Saldo após" e botão "Adicionar crédito"; ao confirmar com valor positivo (`amountCents > 0`), atualiza saldo na tabela e nos cards de resumo e fecha o modal | atendido | `apps/web/src/app/features/customers/pages/customers.page.html:169-183`, `355-476`; `apps/web/src/app/features/customers/pages/customers.page.ts:74-94`, `223-264`; `apps/web/src/app/features/customers/pages/customers.page.spec.ts:99-115`, `685-716`, `764-815` |
| CA1 (backend — incremento atômico, `CreditTransaction` `TOP_UP`, `prisma.$transaction`, `201`) | fora desta tarefa | — |
| CA2 — Bloqueio inline na tela para valor ausente, zero, negativo ou não numérico, destaque `perigo`, mensagem "Informe um valor maior que zero. O saldo não foi alterado." e prévia "Saldo após" mantida como "—" | atendido | `apps/web/src/app/features/customers/pages/customers.page.ts:23-29`, `80-94`, `240-246`; `apps/web/src/app/features/customers/pages/customers.page.html:439-464`; `apps/web/src/app/features/customers/pages/customers.page.spec.ts:685-762` |
| CA2 (backend — `ValidationPipe` recusando com `400`) | fora desta tarefa | — |
| CA3 — `RolesGuard` recusando `OPERATOR` com `403` | fora desta tarefa | — |
| CA4 — `JwtAuthGuard` recusando requisição sem token ou com token inválido/expirado com `401` | fora desta tarefa | — |
| CA5 — `404` para cliente inexistente na API | fora desta tarefa | — |
| CA6 — Resposta `401` na recarga mantém saldo inalterado, aciona `authInterceptor` (limpa sessão local, marca sessão expirada e redireciona para `/login`) sem exibir erro de conexão | atendido | `apps/web/src/app/features/customers/pages/customers.page.ts:259-263`; `apps/web/src/app/features/customers/pages/customers.page.spec.ts:843-904` |
| CA7 — Falha de rede exibe "Não foi possível conectar. Tente novamente.", mantém o valor digitado e retira o botão do estado de carregamento | atendido | `apps/web/src/app/features/customers/pages/customers.page.ts:14`, `259-263`; `apps/web/src/app/features/customers/pages/customers.page.html:467-469`; `apps/web/src/app/features/customers/pages/customers.page.spec.ts:817-841` |
| CA8 — Cancelar/fechar o modal antes de enviar não dispara requisição e mantém o saldo inalterado | atendido | `apps/web/src/app/features/customers/pages/customers.page.html:406-415`, `474-482`; `apps/web/src/app/features/customers/pages/customers.page.ts:231-237`; `apps/web/src/app/features/customers/pages/customers.page.spec.ts:635-683` |

## Apontamentos

*(nenhum — todos os critérios da tarefa foram atendidos, o glossário do `docs/architecture.md` foi respeitado, não há escopo inflado e a suíte `npm run test -w apps/web` executou com 16/16 arquivos e 116/116 testes passando, sendo 20/20 em `customers.page.spec.ts`.)*
