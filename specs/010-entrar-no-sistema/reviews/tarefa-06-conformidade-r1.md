# Parecer de Conformidade — Tarefa 6

**Veredito:** APONTAMENTOS

Testes rodados: `npm run test -w apps/web -- --watch=false` passou (5 arquivos, 13 testes). Não rodei `test:e2e`: a Tarefa 6 mexe no front e só adiciona o CORS na API, que nenhum teste e2e cobre.

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA1 (lado do front): gerente vai para Cadastros e operador para o Caixa depois de entrar | atendido | `login.page.ts:7-10,32`; testes em `login.page.spec.ts:49-61` |
| CA1: o menu mostra só a área do papel | atendido | `header.ts:5-8,21`; `header.spec.ts:18-34` (links exatamente `['Cadastros']` ou `['Caixa']`) |
| CA7: a sessão fica só no `sessionStorage` e a aba nova começa sem sessão | atendido | `auth.service.ts:16-35`; `auth.service.spec.ts:11-22,34-40` (`localStorage.length === 0`); `app.spec.ts:17-25` |
| Áreas de Cadastros e Caixa são páginas vazias com `// TODO` (seção "Assume que") | atendido | `products.page.ts:3`, `checkout.page.ts:3` (TODO #1 e TODO #4) |
| CORS na API (arquivo previsto na tarefa) | atendido | `apps/api/src/main.ts`, usa `WEB_ORIGIN`, que já existe no `env.validation` |
| CA2, CA3, CA8 (tarefas 7 e 8), CA4 e CA5 (tarefa 9), CA6 (tarefa 10) | fora desta tarefa | O TODO em `login.page.ts:34` e o TODO em `app.routes.ts:18` apontam corretamente para as Tarefas 8 e 9. |

## Apontamentos
1. **O cabeçalho mostra o nome da pessoa conectada, e a spec não pediu isso** — `apps/web/src/app/core/layout/header.ts:25`, e o teste que o fixa em `header.spec.ts:24,33`
   Critério violado: CA1 pede só "o menu mostra apenas a área desse papel". Não há exigência de exibir o nome do usuário, nem nos critérios nem no texto da Tarefa 6.
   Evidência: o template renderiza `<span>{{ current.name }}</span>`, e os testes afirmam `toContain('Maria')` e `toContain('João')`. É comportamento extra, coberto por teste, sem origem na spec (escopo inflado).

Observação, sem apontamento: `clearSession` (`auth.service.ts:30-35`) e o `authInterceptor` (anexa o Bearer) vão além do que CA1 e CA7 exigem nesta tarefa. Ficam dentro de `core/auth/*`, que a tarefa prevê, e as Tarefas 9 e 10 e a API protegida dependem deles, então não os reprovo. Se o usuário quiser rigor de escopo, vale checar se eles caberiam melhor nas Tarefas 9 e 10.
