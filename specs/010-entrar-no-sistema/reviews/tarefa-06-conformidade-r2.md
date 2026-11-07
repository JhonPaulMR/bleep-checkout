# Parecer de Conformidade — Tarefa 6 (rodada 2)

**Veredito:** APONTAMENTOS

Testes: `npm run test -w apps/web -- --watch=false` passou, com 6 arquivos e 14 testes.

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA1 (front): gerente vai para Cadastros e operador para o Caixa depois de entrar | atendido | `login.page.ts:12-15,35`; `login.page.spec.ts:29-41` (os testes conferem `navigateByUrl('/cadastros')` e `'/caixa'`) |
| CA1: o menu mostra só a área do papel | atendido | `header.ts:6-9,29-33`; `header.spec.ts` (gerente vê só `Cadastros`, operador vê só `Caixa`, sem sessão não há menu) |
| CA1: áreas de Cadastros e Caixa existem como páginas vazias, com `// TODO #1` e `// TODO #4` | atendido | `products.page.ts`, `checkout.page.ts`, `app.routes.ts` |
| CA7: token e usuário só no `sessionStorage`, nunca no `localStorage` | atendido | `auth.service.ts:12-22`; `auth.service.spec.ts` (`localStorage.length` é 0; sem nada gravado, não há sessão) |
| CA7: ao abrir sem sessão, o sistema mostra a tela de entrada, sem menu | atendido | `app.spec.ts` (rota `/` leva a `login`, e `nav a` não existe) |
| Aceites da r1: nome fora do cabeçalho e URL da API via environment | atendido | `header.ts` não renderiza `user().name`; `api-url.ts`, `environment*.ts`, `angular.json` (`fileReplacements`) e `api-url.spec.ts` |
| CORS na API só para `WEB_ORIGIN` (previsto na tarefa) | atendido | `apps/api/src/main.ts` |
| CA2, CA3, CA8 (mensagens e validação), CA4, CA5, CA6 | fora desta tarefa | O `// TODO` do `error:` em `login.page.ts` aponta para a Tarefa 8, e o das rotas aponta para a Tarefa 9. |

## Apontamentos
1. **Interceptor que anexa `Authorization: Bearer` foi implementado antes da hora** — `apps/web/src/app/core/auth/auth.interceptor.ts` e `auth.interceptor.spec.ts`. Também aparece em `app.config.ts`, na linha `withInterceptors([authInterceptor])`.
   Critério violado: a Tarefa 6 cobre só "CA1 (lado do front), CA7". Nenhum desses critérios exige enviar o token em requisições. O `plan.md:68` lista `core/auth/auth.interceptor.ts` como arquivo previsto da tarefa posterior, a das ações e do 401 (CA6).
   Evidência: o interceptor e os testes dele não provam nenhum dos dois critérios da tarefa. Esse comportamento não foi pedido para esta tarefa, e anexa o token a qualquer URL, não só à da API. Isso é escopo adiantado, que a spec trata como falha de conformidade. O `plan.md:15` descreve o interceptor como parte do front da história, então a decisão de manter ou mover para a tarefa seguinte é do usuário na triagem.
