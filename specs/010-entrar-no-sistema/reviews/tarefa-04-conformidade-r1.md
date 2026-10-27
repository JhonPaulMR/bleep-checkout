# Parecer de Conformidade — Tarefa 4

**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA3 (lado da API): e-mail em branco é recusado como dado inválido | atendido | `apps/api/src/modules/auth/dto/login.dto.ts:6-8`, teste "e-mail vazio" em `apps/api/test/auth.e2e-spec.ts` |
| CA3 (lado da API): e-mail em formato inválido é recusado | atendido | `login.dto.ts:6` (`@IsEmail`), teste "e-mail inválido" |
| CA3 (lado da API): senha em branco é recusada | atendido | `login.dto.ts:12-13`, teste "senha vazia" |
| Campo extra → 400 (previsto no plano da tarefa) | atendido | `apps/api/src/app.module.ts` (`whitelist` e `forbidNonWhitelisted`), teste "campo extra" |
| `ValidationPipe` global e Swagger em `/docs` (arquivos previstos) | atendido | `app.module.ts` (APP_PIPE), `apps/api/src/main.ts` |
| CA3 (lado da tela: mensagens "Informe o e-mail" etc.) | fora desta tarefa | tarefas seguintes (web) |
| CA1, CA2, CA4 a CA8 | fora desta tarefa | outras tarefas |

Testes rodados: `npm test` passou (API com 5 testes e web com 2). `npm run test:e2e` passou com 9 testes, incluindo os 4 casos novos de entrada malformada.

## Apontamentos
Nenhum.

Observações que não são apontamentos:
- O `ValidationPipe` foi registrado via `APP_PIPE` no `app.module.ts`, e não em `main.ts` como o plano previa. Isso não viola a spec. Como o pipe está no módulo, o e2e o exercita de fato.
- Os testes verificam o status 400 e o formato de erro do projeto. Não verificam o texto das mensagens de validação, o que está certo, porque a spec só pede "recusada como dado inválido" para a API.
