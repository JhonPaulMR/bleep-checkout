# Parecer de Código — Tarefa 8

**Veredito:** APROVADO

Testes (19/19), lint e build passam.

## Apontamentos (bloqueiam)
Nenhum.

Conferi o diff contra `docs/architecture.md`:
- A página usa signals, `@if` e `inject()`, como a seção 2 pede.
- A cor `text-perigo` vem dos tokens do tema, sem hex solto.
- A página só consome o `LoginService`, sem `HttpClient` direto. O tratamento de `HttpErrorResponse` fica na página, e o `login.service.ts` não foi alterado.
- O erro não é engolido. Qualquer falha vira mensagem visível, e o `loading` volta a `false`.
- Os testes usam o DOM e o `HttpTestingController`, sem depender de detalhe interno do componente.

## Sugestões (não bloqueiam)
- `login.page.ts` (bloco `error`): qualquer status diferente de 401 mostra "Não foi possível conectar". Isso inclui 400 e 500, o que é impreciso mas é o que a tarefa pede. Se o CA8 vier a distinguir 5xx, o ponto de mudança é aqui.
- O comentário `TODO #10 (Tarefa 8)` foi removido corretamente.

## Observações fora do escopo deste diff
- A seção 4 do `docs/architecture.md` diz que uma resposta 401 "limpa a sessão e leva ao Login". O `auth.interceptor.ts` só anexa o token e não trata 401. Isso é da Tarefa 5 ou 6, e não do diff atual. Vale conferir se existe Issue ou tarefa para isso. Fica fora do login, porque a 401 do `/auth/login` não pode redirecionar.
