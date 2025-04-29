FROM node:18-slim

WORKDIR /app

# Copiar arquivos de definição de pacotes
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar código fonte
COPY . .

# Verificar se as pastas de dados existem e criar se necessário
RUN mkdir -p data/sqlite data/documents

# Compilar o TypeScript
RUN npm run build

# Expor as portas
EXPOSE 5173 3001

# Comando padrão (versão web)
CMD ["npm", "start"] 