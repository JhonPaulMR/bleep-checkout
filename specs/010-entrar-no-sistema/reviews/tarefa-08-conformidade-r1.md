# Parecer de Conformidade — Tarefa 8

**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA2 (lado do front) — 401 mostra "E-mail ou senha inválidos." e a pessoa continua na tela com o e-mail preenchido | atendido | `login.page.ts` (handler `error`, ramo 401); `login.page.html` (bloco `@if (failure())`); teste `login.page.spec.ts` "resposta 401 ..." confere mensagem, e-mail mantido, botão habilitado e que não navegou |
| CA8 — falha de rede mostra "Não foi possível conectar. Tente novamente.", e-mail preenchido e botão sai do carregamento | atendido | `login.page.ts` (ramo que não é 401, `loading.set(false)`); teste `login.page.spec.ts` "erro de rede ..." confere a mensagem, que a mensagem de credencial não aparece, o e-mail mantido e o botão habilitado |
| Teste primeiro: o teste prova o que diz (botão em carregamento antes da resposta, depois sai) | atendido | `enviarEResponder` confere `disabled === true` antes de responder; os testes conferem `disabled === false` depois |
| Escopo (sem comportamento extra) | atendido | O diff só toca a página de login. O `// TODO` da Tarefa 8 foi removido. `failure` é zerado ao reenviar, o que é o comportamento esperado de uma mensagem de erro. |

Testes: `npm run test -w apps/web -- --watch=false` rodou com 6 arquivos e 19 testes, todos passando.

## Apontamentos
Nenhum.
