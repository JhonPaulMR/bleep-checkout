# 📄 Product Requirements Document (PRD)

**Projeto:** Bleep Checkout
**Versão:** 1.0.0 · definição do tema e escopo inicial
**Última atualização:** 20/09/2026

> 🤖 **Este documento é a fonte da verdade sobre o QUE o produto faz.** Regra de
> negócio que não estiver aqui não existe — nem para a equipe, nem para a IA.
> Tecnologia **não** se discute aqui: isso é assunto do `architecture.md`.
>
> **Situação do tema:** o escopo abaixo foi definido a partir da proposta do aluno.
> A verificação de que o tema é único na turma e o aceite formal do professor ainda
> dependem da etapa presencial da disciplina.

---

## 🎯 1. Visão Geral e Objetivo

**O problema:** em uma operação de venda no balcão, o registro de produtos, a identificação do cliente, a montagem da compra e o controle de diferentes formas de pagamento podem ficar espalhados em processos manuais, tornando o atendimento mais demorado e aumentando a chance de erros na quantidade, no produto ou no valor recebido.

**A solução:** o Bleep Checkout reúne o cadastro de produtos e clientes em um único sistema e oferece um simulador de caixa para montar e finalizar vendas. O operador pode inserir um produto pelo código de barras, localizá-lo pelo nome ou usar um leitor de código de barras. Antes da inclusão, pode informar uma quantidade, de modo que uma única leitura ou seleção registre várias unidades do mesmo produto. No pagamento, a venda pode usar PIX, crédito de um cliente cadastrado, ou cartão de crédito/débito processado em uma máquina externa e apenas registrado no sistema.

**Como saberemos que deu certo:** o operador consegue cadastrar produtos e clientes, cadastrar um saldo de crédito para um cliente, montar uma venda pelos diferentes meios de identificação de produto, aplicar a quantidade desejada e registrar a conclusão da venda com a forma de pagamento escolhida. Quando o pagamento for por crédito do cliente, o sistema só conclui a venda se houver saldo suficiente. Quando for PIX, o sistema apresenta o QR Code e mantém a venda aguardando confirmação até que o pagamento seja confirmado ou a venda seja cancelada. Quando for crédito ou débito externo, o sistema registra o meio utilizado após a confirmação do operador.

---

## 📖 2. Glossário Ubíquo

| Termo | Significa | Não confundir com |
| :---- | :-------- | :---------------- |
| **Produto** | Item comercializado no caixa, com identificação, preço e código de barras. | Item de venda, que é a ocorrência do produto dentro de uma venda. |
| **Código de barras** | Identificador usado para localizar rapidamente um produto. | Código interno ou nome do produto. |
| **Cliente** | Pessoa cadastrada que pode ser associada a uma venda e possuir crédito para pagamento. | Operador de caixa, que realiza a operação. |
| **Crédito do cliente** | Saldo monetário disponível para um cliente usar como forma de pagamento. | Crédito ou débito de cartão processado externamente. |
| **Venda** | Registro do pedido feito no caixa, reunindo os produtos, quantidades, total e forma de pagamento. | Cadastro de produto ou consulta de produto. |
| **Item de venda** | Uma ocorrência de um produto dentro de uma venda, com sua quantidade e valor aplicado. | Produto cadastrado no catálogo. |
| **Quantidade** | Número de unidades do produto que serão adicionadas à venda em uma ação de inclusão. | Preço unitário do produto. |
| **Simulador de caixa** | Área do sistema onde o operador monta, calcula e registra uma venda. | Cadastro de produtos ou clientes. |
| **PIX** | Forma de pagamento em que o sistema apresenta um QR Code para o cliente realizar o pagamento. | Crédito do cliente ou cartão externo. |
| **Pagamento externo** | Pagamento realizado em uma máquina de cartão fora do sistema e depois registrado pelo operador. | Pagamento por crédito do cliente, cuja validação ocorre pelo saldo cadastrado. |
| **Forma de pagamento** | Meio escolhido para quitar uma venda: PIX, crédito do cliente, crédito externo ou débito externo. | Condição do pedido, que representa o estado da venda. |
| **Venda pendente** | Venda cujo pagamento ainda não foi confirmado. | Venda paga ou venda cancelada. |

---

## 👤 3. Atores e Permissões

| Ator | Quem é | Pode | Não pode |
| :--- | :----- | :--- | :------- |
| **Operador de caixa** | Pessoa responsável por cadastrar dados e realizar as vendas no sistema. | Cadastrar produtos; cadastrar clientes e seus créditos; iniciar uma venda; localizar produtos por código ou nome; usar leitor de código de barras; definir quantidade; escolher a forma de pagamento; registrar pagamentos externos; acompanhar o estado da venda. | Aprovar uma venda por crédito quando o cliente não possui saldo suficiente; marcar uma venda como paga quando o pagamento PIX ainda não foi confirmado; alterar o saldo de crédito de forma que o sistema permita saldo negativo. |

> Nesta etapa não foi definida uma separação entre múltiplos perfis administrativos e operadores. Caso isso seja necessário, a decisão deverá ser registrada posteriormente.

## 🔗 3.1 Relações de negócio que o tema precisa comportar

- **Produto 1:N Item de venda:** um produto pode aparecer em vários itens de vendas diferentes; cada item de venda referencia um único produto.
- **Cliente 1:N Venda:** um cliente pode estar associado a várias vendas; cada venda pode identificar um cliente quando for necessário usar o crédito do cliente.

Essas relações representam o núcleo do domínio sem definir banco, endpoints ou outras decisões de tecnologia.

---

## 📝 4. Escopo Funcional (User Stories)

### US01 — Cadastrar produto · `Must Have` · `M` · Status: `🟡 Ready`

**Como** operador de caixa, **eu quero** cadastrar um produto com suas informações comerciais **para que** ele possa ser encontrado e vendido no simulador de caixa.

**Critérios de aceite:**

- [ ] **Dado** que o produto possui as informações obrigatórias, **quando** o operador concluir o cadastro, **então** o produto passa a estar disponível para busca e inclusão em vendas.
- [ ] **Dado** que o código de barras informado já pertence a outro produto, **quando** o operador tentar cadastrar o produto, **então** o cadastro é recusado e nenhum produto duplicado é criado.
- [ ] **Dado** que uma informação obrigatória está ausente, **quando** o operador tentar concluir o cadastro, **então** o sistema informa o problema e mantém o cadastro sem concluir.

**Regras relacionadas:** RN01, RN02

### US02 — Cadastrar cliente com crédito · `Must Have` · `M` · Status: `🟡 Ready`

**Como** operador de caixa, **eu quero** cadastrar um cliente com um saldo inicial de crédito **para que** esse saldo possa ser usado como forma de pagamento nas vendas.

**Critérios de aceite:**

- [ ] **Dado** que o cliente foi informado com seus dados obrigatórios e um saldo inicial válido, **quando** o operador concluir o cadastro, **então** o cliente fica disponível para seleção em uma venda e seu crédito fica registrado.
- [ ] **Dado** que o saldo inicial informado é negativo, **quando** o operador tentar concluir o cadastro, **então** o sistema rejeita o cadastro e não cria um saldo negativo.
- [ ] **Dado** que o operador tente pagar uma venda com crédito sem selecionar um cliente, **quando** confirmar essa forma de pagamento, **então** o sistema não conclui o pagamento e solicita a identificação do cliente.

**Regras relacionadas:** RN03, RN04

### US03 — Montar venda no simulador de caixa · `Must Have` · `M` · Status: `🟡 Ready`

**Como** operador de caixa, **eu quero** localizar e adicionar produtos à venda usando código de barras, busca por nome ou leitor de código de barras **para que** eu consiga registrar a compra sem depender de uma única forma de entrada.

**Critérios de aceite:**

- [ ] **Dado** que um produto existe no catálogo, **quando** o operador informar seu código de barras, **então** o produto é localizado e adicionado à venda.
- [ ] **Dado** que existem produtos cadastrados com determinado nome, **quando** o operador pesquisar pelo nome, **então** o sistema apresenta os produtos encontrados para seleção.
- [ ] **Dado** que o leitor de código de barras envia um código existente, **quando** o sistema receber a leitura, **então** o produto correspondente é adicionado à venda.
- [ ] **Dado** que o código informado ou lido não corresponde a um produto cadastrado, **quando** a inclusão for tentada, **então** nenhum item é adicionado e o operador é informado de que o produto não foi localizado.
- [ ] **Dado** que uma pesquisa por nome não encontra resultados, **quando** o operador realizar a busca, **então** a venda permanece sem alteração e o sistema informa que nenhum produto foi encontrado.

**Regras relacionadas:** RN05, RN06

### US04 — Inserir quantidade de produtos na venda · `Must Have` · `M` · Status: `🟡 Ready`

**Como** operador de caixa, **eu quero** informar a quantidade antes de inserir um produto **para que** uma única busca, digitação de código ou leitura do produto registre várias unidades de uma vez.

**Critérios de aceite:**

- [ ] **Dado** um produto válido e quantidade 4, **quando** o operador inserir o produto por código, nome ou leitor, **então** 4 unidades do mesmo produto são adicionadas à venda.
- [ ] **Dado** que o produto já está na venda, **quando** o operador adicionar novamente a quantidade 4, **então** a quantidade total daquele item é incrementada em 4, sem criar uma nova unidade conceitual do produto.
- [ ] **Dado** que a quantidade informada é zero, negativa ou inválida, **quando** o operador tentar adicionar o produto, **então** o sistema rejeita a inclusão e mantém a venda sem alteração.

**Regras relacionadas:** RN06, RN07

### US05 — Pagar com crédito do cliente · `Must Have` · `M` · Status: `🟡 Ready`

**Como** operador de caixa, **eu quero** usar o crédito de um cliente para pagar a venda **para que** o valor da compra seja descontado do saldo cadastrado.

**Critérios de aceite:**

- [ ] **Dado** que o cliente possui crédito igual ou superior ao total da venda, **quando** o operador confirmar o pagamento por crédito do cliente, **então** a venda é concluída e o saldo do cliente é reduzido exatamente pelo valor da venda.
- [ ] **Dado** que o cliente possui crédito inferior ao total da venda, **quando** o operador tentar pagar com crédito, **então** o sistema não conclui a venda e o saldo do cliente não é alterado.
- [ ] **Dado** que a venda ainda não possui produtos, **quando** o operador tentar pagar por crédito, **então** o sistema impede a conclusão da venda.

**Regras relacionadas:** RN03, RN08, RN09

### US06 — Pagar via PIX · `Must Have` · `M` · Status: `🟡 Ready`

**Como** operador de caixa, **eu quero** selecionar PIX e apresentar um QR Code de pagamento **para que** o cliente possa realizar o pagamento e a venda seja confirmada após a confirmação do pagamento.

**Critérios de aceite:**

- [ ] **Dado** que a venda possui itens e total válido, **quando** o operador escolher PIX, **então** o sistema apresenta um QR Code associado ao valor da venda e aguarda a confirmação do pagamento.
- [ ] **Dado** que o pagamento PIX foi confirmado, **quando** o sistema receber essa confirmação, **então** a venda passa para concluída e não permanece como pendente.
- [ ] **Dado** que o pagamento ainda não foi confirmado, **quando** o operador consultar o estado da venda, **então** ela permanece como pendente e não é tratada como paga.
- [ ] **Dado** que o cliente fecha a tela ou abandona o pagamento antes da confirmação, **quando** não houver confirmação do PIX, **então** a venda permanece pendente e não é registrada como paga.

**Regras relacionadas:** RN08, RN10

### US07 — Registrar pagamento externo de crédito ou débito · `Must Have` · `S` · Status: `🟡 Ready`

**Como** operador de caixa, **eu quero** registrar que uma venda foi paga por crédito ou débito em uma máquina externa **para que** o sistema mantenha o registro da forma de pagamento sem controlar a máquina.

**Critérios de aceite:**

- [ ] **Dado** que a venda está pronta para pagamento, **quando** o operador selecionar crédito ou débito externo e confirmar que a transação foi aprovada na máquina, **então** a venda é registrada como paga e guarda a forma escolhida.
- [ ] **Dado** que a transação externa não foi aprovada, **quando** o operador informar que o pagamento não ocorreu, **então** a venda não é concluída.
- [ ] **Dado** que o operador não confirmou a aprovação na máquina externa, **quando** tentar finalizar a venda, **então** o sistema não trata automaticamente o pagamento como aprovado.

**Regras relacionadas:** RN10, RN11

### US08 — Concluir ou cancelar uma venda · `Must Have` · `M` · Status: `🟡 Ready`

**Como** operador de caixa, **eu quero** concluir uma venda somente depois de uma forma de pagamento válida ou cancelá-la quando necessário **para que** o registro das vendas não contenha compras pagas incorretamente.

**Critérios de aceite:**

- [ ] **Dado** que a forma de pagamento foi confirmada, **quando** o operador concluir a operação, **então** a venda é registrada como concluída com seus itens, quantidades, total e forma de pagamento.
- [ ] **Dado** que a venda está sem forma de pagamento confirmada, **quando** o operador tentar concluir, **então** o sistema impede a conclusão.
- [ ] **Dado** que uma venda pendente foi cancelada antes da confirmação do pagamento, **quando** o cancelamento for confirmado, **então** ela deixa de ser tratada como venda paga.

**Regras relacionadas:** RN08, RN10, RN11

---

## 🛡️ 5. Regras de Negócio (Constraints)

| ID | Regra |
| :-- | :---- |
| RN01 | Cada produto deve possuir nome, código de barras e preço unitário válidos; o código de barras deve ser único dentro do catálogo. |
| RN02 | Um produto somente fica disponível para venda depois de ter cadastro válido concluído. |
| RN03 | O crédito de um cliente não pode ficar negativo. |
| RN04 | O pagamento por crédito do cliente exige um cliente cadastrado e selecionado na venda. |
| RN05 | O código de barras usado na entrada por código ou leitor deve localizar um único produto cadastrado. |
| RN06 | Toda inclusão de produto em uma venda respeita a quantidade informada pelo operador. |
| RN07 | A quantidade adicionada deve ser um número inteiro positivo. |
| RN08 | O total da venda corresponde à soma dos valores dos itens multiplicados pelas respectivas quantidades. |
| RN09 | Se o crédito disponível for menor que o total da venda, o pagamento por crédito é recusado sem alterar o saldo. |
| RN10 | Uma venda só pode ser tratada como paga quando a forma de pagamento tiver uma confirmação válida: crédito do cliente com saldo suficiente, PIX confirmado ou confirmação do operador para crédito/débito externo. |
| RN11 | Crédito e débito realizados em máquina externa não são controlados pelo sistema; o sistema apenas registra o resultado informado pelo operador. |
| RN12 | Uma venda PIX sem confirmação permanece pendente e não deve ser tratada como paga. |

---

## 🚫 6. Fora de Escopo (Non-goals)

- **Controle ou integração com a máquina de cartão.** O sistema somente registra crédito/débito externo após a confirmação do operador.
- **Pagamento em dinheiro.** Não foi definido como forma de pagamento nesta versão.
- **Emissão fiscal ou integração com documentos fiscais.** Não faz parte do objetivo desta etapa/produto.
- **Controle de estoque, compras de fornecedor e entrada de mercadoria.** O cadastro de produto existe para permitir o registro das vendas.
- **Programa de descontos, cupons ou promoções.** O total da venda, nesta versão, é formado pelos preços cadastrados e pelas quantidades informadas.
- **Gestão de múltiplos níveis administrativos.** Nesta definição inicial existe um único ator operacional.
- **Relatórios gerenciais e análise de vendas.** Podem ser avaliados posteriormente, caso o escopo permita.

---

## ⚙️ 7. Requisitos Não Funcionais (Qualidade)

- **Consistência:** uma venda não pode ser apresentada como paga quando a respectiva forma de pagamento ainda não foi confirmada.
- **Usabilidade no caixa:** as ações de busca, inserção e definição de quantidade devem ser diretas, porque fazem parte de uma operação repetitiva durante o atendimento.
- **Acessibilidade básica:** os controles necessários para montar e finalizar uma venda devem possuir estados visíveis de foco, desabilitado e carregamento.
- **Clareza de estado:** o operador deve conseguir distinguir visualmente uma venda concluída, pendente ou não concluída.

---

## 🛠️ 8. Histórico

| Data | Versão | O que mudou |
| :--- | :----- | :---------- |
| 20/09/2026 | 1.0.0 | Definição inicial do tema Bleep Checkout, escopo funcional, regras de negócio e formas de pagamento. |
