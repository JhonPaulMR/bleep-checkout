# Decisões — Tarefa 8, rodada 1

| # | Apontamento (resumo) | Parecer | Decisão | Justificativa |
| --- | --- | --- | --- | --- |
| 1 | Falha na consulta ao gateway engolida silenciosamente com HTTP 200 após gravar `WebhookEvent` | código | aceito | — |
| 2 | Condição de corrida (TOCTOU) nas atualizações de `Sale` e `Payment` dentro de `$transaction` | código | aceito | — |
| 3 | Transição de `Sale` executada independentemente da transição do `Payment` vinculado | código | aceito | — |
