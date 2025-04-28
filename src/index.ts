import dotenv from 'dotenv';
import { createConnection } from './database/sqlite';
import { createDocumentProcessor } from './documents/processor';
import { createCommandExecutor } from './external/executor';

// Carrega as variáveis de ambiente
dotenv.config();

async function main() {
  try {
    console.log('Iniciando Multi-Source AI Agent...');

    // Configuração do banco de dados
    const dbConnection = await createConnection({
      path: process.env.SQLITE_DB_PATH || './data/sqlite',
    });

    // Configuração do processador de documentos
    const documentProcessor = createDocumentProcessor({
      path: process.env.DOCUMENTS_PATH || './data/documents',
    });

    // Configuração do executor de comandos
    const commandExecutor = createCommandExecutor({
      allowedCommands: ['curl', 'wget', 'cat', 'grep'],
      requireApproval: true,
    });

    // Teste de conexão com o banco de dados
    const dbResult = await dbConnection.query('SELECT name FROM sqlite_master WHERE type="table"');
    console.log('Tabelas disponíveis:', dbResult.data);

    // Teste de leitura de documentos
    const documents = await documentProcessor.readAllDocuments();
    console.log('Documentos disponíveis:', documents.map(doc => doc.filename));

    // Teste de comando
    const commandResult = await commandExecutor.execute('curl --version');
    console.log('Versão do curl:', commandResult.output);

    // Fecha a conexão com o banco de dados
    await dbConnection.close();

  } catch (error) {
    console.error('Erro ao iniciar o agente:', error);
    process.exit(1);
  }
}

main(); 