# Parecer de Conformidade — Tarefa 7

**Veredito:** APROVADO

## Critérios verificados
| Critério (da spec) | Situação | Onde |
| --- | --- | --- |
| CA3, lado do front: e-mail em branco mostra "Informe o e-mail" e a entrada não é enviada | atendido | `login.page.ts` (`emailError`, retorno antecipado em `submit`); teste "campos em branco..." em `login.page.spec.ts` |
| CA3, lado do front: senha em branco mostra "Informe a senha" e a entrada não é enviada | atendido | `login.page.ts` (`passwordError`); mesmo teste |
| CA3, lado do front: e-mail em formato inválido mostra "E-mail inválido" e a entrada não é enviada | atendido | `login.page.ts` (`EMAIL_FORMAT`); teste "e-mail em formato inválido..." |
| A mensagem aparece no campo com problema | atendido | `login.page.html`: cada `<span role="alert">` fica dentro do `<label>` do seu campo |
| "Nenhuma requisição sai" | atendido | os testes de campo vazio e de e-mail inválido usam `controller.expectNone` em `/auth/login` |
| Teste de controle: entrada válida não mostra mensagem e a requisição sai | atendido | teste "entrada válida..." |
| CA3, lado da API ("recusada como dado inválido") | fora desta tarefa | coberto na Tarefa 4 |

Os testes rodaram: 6 arquivos e 17 testes passaram.

## Apontamentos
Nenhum.
