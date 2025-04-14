import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Ferramenta que permite ao agente ler e buscar informações em documentos locais

const DOCUMENT_PATH = path.resolve(process.env.DOCUMENT_PATH);

export async function readDocument() {
  try {
    await fs.access(DOCUMENT_PATH);

    const content = await fs.readFile(DOCUMENT_PATH, 'utf-8');
    return content;
  } catch (error) {
    console.error(`Error reading file: ${error.message}`);
    throw error;
  }
}
