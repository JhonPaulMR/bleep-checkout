# 🎨 Tokens de Design

**Projeto:** Bleep Checkout
**Versão:** 1.0.0 · proposta visual inicial do tema
**Última atualização:** 20/09/2026

> Esta versão registra uma proposta inicial de linguagem visual para manter as telas coerentes. Antes do commit definitivo da entrega, o aluno deve validar ou ajustar essas escolhas de acordo com o protótipo.

## Paleta

Nome semântico, nunca baseado apenas na aparência da cor.

| Token | Valor | Onde se usa |
| --- | --- | --- |
| `primaria` | `#2563EB` | ações principais, seleção e destaque de elementos importantes |
| `superficie` | `#FFFFFF` | fundo de cards, painéis e áreas de formulário |
| `texto` | `#111827` | texto principal e informações essenciais |
| `texto-suave` | `#6B7280` | legendas, valores auxiliares e mensagens de apoio |
| `perigo` | `#DC2626` | erros, exclusão e situações que impedem a operação |
| `sucesso` | `#16A34A` | confirmações, venda concluída e pagamento confirmado |
| `desabilitado` | `#D1D5DB` | controles indisponíveis e ações temporariamente bloqueadas |

## Escala de espaçamento

Uma única progressão, usada de forma consistente.

| Token | Valor |
| --- | --- |
| `xs` | `4px` |
| `sm` | `8px` |
| `md` | `16px` |
| `lg` | `24px` |
| `xl` | `32px` |

## Tipografia

| Token | Família · tamanho · peso | Papel |
| --- | --- | --- |
| `titulo-pagina` | Inter · 28px · 700 | título principal de cada área |
| `titulo-secao` | Inter · 20px · 600 | títulos de cards e seções |
| `corpo` | Inter · 16px · 400 | textos, campos e informações da operação |
| `corpo-destaque` | Inter · 16px · 600 | totais, preços e informações importantes |
| `legenda` | Inter · 13px · 400 | apoio, estados e informações secundárias |

## Estados de botão

| Estado | Aparência |
| --- | --- |
| normal | Fundo da cor `primaria`, texto de alto contraste e área clicável claramente identificada. |
| hover | Mantém a identidade da ação, com contraste ligeiramente mais forte para indicar interação. |
| foco (teclado) | Contorno visível ao redor do botão, sem depender apenas da mudança de cor. |
| desabilitado | Usa `desabilitado`, com contraste reduzido e sem aparência de ação disponível. |
| carregando | Mantém a área e o contexto da ação, mostra indicação de processamento e impede cliques repetidos. |

## Protótipo

**Link:** Pendente — ainda não criado nesta etapa.
**Telas planejadas:**

1. Cadastro e consulta de produtos.
2. Cadastro de cliente e visualização do crédito disponível.
3. Simulador de caixa com busca, código de barras, leitor e quantidade.
4. Tela de pagamento com escolha entre PIX, crédito do cliente, crédito externo e débito externo.
5. Estado de confirmação/pagamento pendente da venda PIX.
