# Decisões — Tarefa 1, rodada 1

| # | Apontamento (resumo) | Parecer | Decisão | Justificativa |
| --- | --- | --- | --- | --- |
| 1 | Dependência `tsx` entra sem constar no `architecture.md` §2 | código | recusado | O `tsx` é o executor que estava previsto: consta nas "Decisões técnicas" do `plan.md` aprovado ("`tsx` (dev, para rodar o seed)"). Não há alternativa já prevista que funcione: o Node 24 executa TypeScript nativamente, mas não resolve os imports `.js` do cliente gerado pelo Prisma (`generated/prisma/*.ts`). |
| 2 | O e2e fixa `expect(total).toBe(2)` sobre a tabela `User` inteira | código | aceito | |
