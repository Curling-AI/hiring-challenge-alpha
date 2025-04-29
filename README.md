# Multi-Source AI Agent

## Visão Geral

Este projeto implementa um agente de IA capaz de responder perguntas do usuário utilizando múltiplas fontes de dados: bancos de dados SQLite, arquivos de documentos e conteúdo web via comandos bash. O agente é projetado para entender o contexto das perguntas, escolher automaticamente a fonte de dados mais adequada e apresentar respostas de forma clara e concisa.

## Funcionalidades

- **Consulta Inteligente a Bancos de Dados**
  - Detecção automática de tabelas relacionadas à pergunta
  - Mapeamento semântico entre termos (ex: "artistas" → tabela "Artist")
  - Suporte a consultas SQL com correção automática de nomes de tabelas

- **Processamento de Documentos**
  - Busca em arquivos .txt por termos relevantes
  - Extração de contexto em torno das correspondências
  - Leitura completa de documentos específicos

- **Acesso a Conteúdo Web (com aprovação)**
  - Execução segura de comandos `curl` para buscar informações na internet
  - Verificação do clima via wttr.in
  - Busca web via DuckDuckGo
  - Sistema de aprovação do usuário para comandos bash

- **Conversação Aprimorada**
  - Detecção automática de idioma (português, inglês, espanhol, francês)
  - Resposta no mesmo idioma da pergunta
  - Manutenção de histórico de conversas
  - Interface CLI colorida e intuitiva

- **Tratamento de Erros Robusto**
  - Mensagens de erro amigáveis
  - Informações detalhadas em modo de desenvolvimento
  - Recuperação elegante de falhas de API

## Tecnologias Utilizadas

- **Node.js & TypeScript**: Para desenvolvimento seguro e tipado
- **LangChain**: Framework para integração com modelos de linguagem 
- **Google Gemini 1.5 Pro**: Modelo de linguagem utilizado para processamento da linguagem natural
- **SQLite**: Para armazenamento de dados estruturados
- **Chalk**: Para melhorar a experiência de usuário no terminal

## Arquitetura

O projeto segue uma arquitetura modular baseada em ferramentas especializadas:

```
src/
├── agent/         # Núcleo do agente inteligente
│   ├── agent.ts   # Implementação principal do agente
│   └── tools.ts   # Ferramentas utilizadas pelo agente
├── database/      # Módulo de acesso a dados SQLite
├── documents/     # Módulo de processamento de documentos
├── external/      # Módulo para execução segura de comandos
└── index.ts       # Ponto de entrada da aplicação CLI
```

### Componentes Principais:

1. **CustomAgent**: Orquestra o fluxo de trabalho e toma decisões sobre quais ferramentas usar
2. **DatabaseTool**: Executa consultas em bancos de dados SQLite
3. **SearchContentTool**: Busca informações em documentos
4. **ReadDocumentTool**: Lê documentos completos
5. **CommandTool**: Executa comandos bash (principalmente curl)
6. **BashCommandExecutor**: Gerencia a execução segura de comandos com aprovação do usuário

## Decisões de Design

### 1. Mecanismo de Mapeamento de Entidades

Um dos maiores desafios em interfaces de linguagem natural é entender a intenção do usuário. Implementei um sistema de mapeamento que identifica entidades em perguntas como "quais artistas..." e as mapeia para tabelas como "Artist", mesmo quando há variações de idioma ou singularidade/pluralidade.

```typescript
// Exemplo de mapeamento de entidades para tabelas
const entityTableMapping = {
    'artista': ['artist', 'artists', 'performer', 'musicians'],
    'música': ['track', 'tracks', 'song', 'songs'],
    // ...
};
```

### 2. Sistema de Segurança para Comandos

Para permitir acesso a dados web mantendo a segurança, implementei um sistema de aprovação para comandos:

- Lista branca de comandos permitidos (curl, ls, cat, grep, find)
- Aprovação explícita do usuário via prompt
- Validação de comandos para evitar injeções

### 3. Interface Multilíngue

O agente detecta automaticamente o idioma da pergunta e responde no mesmo idioma, melhorando significativamente a experiência do usuário:

```typescript
async function detectLanguage(text: string, model: ChatGoogleGenerativeAI): Promise<string> {
    // Detecção de idioma usando LLM
    // ...
}
```

### 4. Tratamento de Erros Amigável

Mensagens de erro técnicas podem confundir usuários. Implementei um sistema que converte erros técnicos em mensagens amigáveis:

```typescript
function formatErrors(erro: any): string {
  if (mensagemErro.includes('429') || mensagemErro.includes('quota')) {
    return 'Limite diário de consultas atingido. Por favor, tente novamente amanhã...';
  }
  // ...
}
```

## Como Instalar

1. Clone o repositório:
   ```bash
   git clone https://github.com/zaqueu-1/hiring-challenge-alpha.git
   cd hiring-challenge-alpha
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Configure o arquivo `.env` com sua chave API:
   ```
   GEMINI_API_KEY=sua_chave_api_gemini
   ```

## Como Executar (versão Web)

```bash
npm start
```

Acesse o projeto em localhot:5173

## Como Executar (versão CLI)

```bash
npm run cli
```

O projeto irá rodar diretamente pelo terminal

## Executando com Docker

### Pré-requisitos
- Docker
- Docker Compose

### Instruções simplificadas
1. Clone o repositório e configure o `.env`

2. **Versão web:**
   ```bash
   sudo docker-compose up --build
   ```
   Acesse: http://localhost:5173

3. **Versão CLI:**
   ```bash
   sudo docker-compose run --rm app npm run cli
   ```

### Comando Docker sem docker-compose (alternativa):
Se tiver problemas com docker-compose, use Docker diretamente:

```bash
# Construir a imagem
sudo docker build -t ai-agent .

# Versão CLI
sudo docker run -it --rm -v "$(pwd)/data:/app/data" -v "$(pwd)/.env:/app/.env" ai-agent npm run cli
```

## Exemplos de Uso

### Consulta de Banco de Dados
```
Você: Quais artistas existem no music.db?
```

### Busca em Documentos
```
Você: Encontre informações sobre blockchain nos documentos
```

### Consulta Web
```
Você: Qual o clima em São Paulo hoje?
```
ou
```
Você: Busque informações sobre energia renovável na internet
```

### Execução de Comandos
```
Você: Execute curl para verificar os cabeçalhos do site google.com
```

## Licença

MIT

---

*Observação: Para testar completamente as funcionalidades, é necessário ter alguns bancos de dados SQLite de exemplo na pasta data/sqlite e documentos de texto na pasta data/documents.*
