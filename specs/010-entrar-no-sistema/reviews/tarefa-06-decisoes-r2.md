# Decisões — Tarefa 6, rodada 2

| # | Apontamento (resumo) | Parecer | Decisão | Justificativa |
| --- | --- | --- | --- | --- |
| 1 | O interceptor que anexa `Authorization: Bearer` (`auth.interceptor.ts`, spec e `withInterceptors` em `app.config.ts`) teria sido adiantado: CA1 e CA7 não exigem enviar token, e o `plan.md` lista o arquivo na Tarefa 10 | conformidade | recusado | Não vou aceitar a mudança. É verdade que o interceptor sozinho não comprova CA1 nem CA7, mas isso não o torna escopo antecipado. No plan.md (Decisões técnicas → Front), o interceptor que anexa o Authorization: Bearer faz parte do core/auth desta história, e a Tarefa 6 lista core/auth/* entre os arquivos dela. A Tarefa 10 não cria o interceptor; ela só inclui nele o tratamento do 401 (CA6). Tirá-lo da Tarefa 6 apenas levaria o mesmo código para a tarefa seguinte, sem alterar comportamento nem cobertura. Sobre o token ser enviado a qualquer host: anotado, e o assunto volta quando existir uma chamada a um host externo (história de pagamento). |

Parecer de código da rodada 2: APROVADO, sem apontamentos. Sugestões não bloqueantes: nenhuma promovida.
