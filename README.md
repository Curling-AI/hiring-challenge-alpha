# Hiring Challenge Alpha

Um agente inteligente que responde perguntas sobre um banco de dados musical e documentos sobre livros de economia, utilizando ferramentas como SQLite, leitura de arquivos e comandos Bash.

---

### Requisitos

- Git instalado
- Node.js v18+
- Banco SQLite local (`src/data/sqlite/music.db`)
- Terminal Bash (para execução de comandos shell)
- Chave de API do OpenRouter (veja abaixo)

## Como Rodar o Projeto

```bash
# Clone o repositório
git clone https://github.com/Curling-AI/hiring-challenge-alpha.git
cd hiring-challenge-alpha

# Baixe o PR como um branch local
git fetch origin pull/1/head:hiring-challenge-alpha/bruno-trindade

# Mude para o branch do PR
git checkout hiring-challenge-alpha/bruno-trindade

# Instale as dependências
npm install
```

## Autenticação com o LLM

Para que o agente se comunique com o modelo de linguagem (via OpenRouter), é necessário fornecer uma chave de API.

1. Crie um arquivo `.env` na raiz do projeto com o seguinte conteúdo:

```env
# Chave da API do OpenRouter (obtenha em https://openrouter.ai/)
LLM_API_KEY=sua-chave-aqui

# Configurações do LLM
LLM_BASE_URL=https://openrouter.ai/api/v1

# Caminhos para os arquivos locais
DOCUMENT_PATH=./src/data/documents/economy_books.txt  
DATABASE_PATH=./src/data/sqlite/music.db             
```

> Você pode obter uma chave gratuita (com limites) em: https://openrouter.ai/

2. No topo do arquivo `llm.js`, adicione:

```js
import dotenv from 'dotenv';
dotenv.config();
```

3. Use a variável de ambiente na configuração do modelo:

```js
import { ChatOpenAI } from 'langchain/chat_models/openai';
import dotenv from "dotenv";

dotenv.config();

export const llm = new ChatOpenAI({
  modelName: "openai/gpt-3.5-turbo",
  temperature: 0.2,
  apiKey: process.env.LLM_API_KEY,
  configuration: {
    baseURL: process.env.LLM_BASE_URL,
  },
  max_tokens: 4000,
});
```
> ℹ️ A biblioteca `dotenv` já está incluída nas dependências.

```bash
# Após todos os passos anteriores, execute o projeto
node src/main.js
```

---

## Funcionalidades

- Consultas a um banco de dados musical usando SQL (SQLite)
- Leitura e interpretação de documentos sobre livros de economia
- Execução de comandos Bash com aprovação do usuário
- Interface de linha de comando com histórico de conversa

---

## Exemplos de Uso

### Consultas Musicais
```bash
> Me fale 10 artistas do gênero pop.
> Liste 10 músicas do gênero 'Rock'
> Quais são os álbuns do AC/DC?
> Quais músicas estão no álbum Let There Be Rock?
> Mostre músicas com mais de 5 minutos
```

### Consultas Documentais
```bash
> Me mostre informações sobre inflação.
> O que o documento diz sobre PIB?
> Tem algo sobre desemprego nos documentos?
> Leia o documento 'Crescimento Econômico 2023'.
> Compare as visões de Keynes e Friedman sobre crescimento econômico.
```

### Comandos Bash (com aprovação)
```bash
> Liste arquivos no diretório atual [Aprovar? (y/n)]
> Verifique o uso de disco [Aprovar? (y/n)]
> Conte quantos documentos existem [Aprovar? (y/n)]
```

### Consultas Combinadas
```bash
> Compare artistas populares com tendências econômicas
> Relacione gêneros musicais com dados demográficos
```

---

## Estrutura do Projeto

```
src/
├── agent/      # Configuração e execução do agente (LLM, prompt, ferramentas)
│   ├── agent.js
│   ├── llm.js
│   └── prompt.js
├── cli/           
│   └── rl.js       # Interface via linha de comando
├── data/
│   ├── documents/      
│   │   └── economy_books.txt       # Documento txt com informações de livros sobre economia
│   └── sqlite/       
│       └── music.db      # Banco de dados SQLite
├── tools/              
│   ├── bashTool.js      # Execução de comandos bash
│   ├── documentTool.js       # Leitura de documentos locais
│   ├── sqliteTool.js     # Consulta ao banco SQLite
│   └── index.js      # Exporta todas as ferramentas
index.js      # Arquivo principal que inicializa tudo
```

---

## Tecnologias Usadas

- Node.js
- SQLite
- LangChain
- Zod
- Bash (simulado via Node.js)

---

## Autor

Feito por **Bruno Trindade**.

