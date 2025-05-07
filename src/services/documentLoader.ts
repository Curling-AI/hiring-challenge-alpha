import * as fs from 'fs';
import * as path from 'path';

const directoryPath = process.env.DOCUMENTS_PATH || path.join(__dirname, '../../data/documents');

export function getDocumentFileNames(): string[]{
  try {
    const files = fs.readdirSync(directoryPath);
    return files.filter(file => !(fs.statSync(path.join(directoryPath, file)).isDirectory()) && file.endsWith('.txt'));
  } catch (error) {
    return [];
  }
}

export async function getAllDocuments(): Promise<string[]> {
  try {
    const files = getDocumentFileNames();
    const documents: string[] = [];
    
    if (files.length > 0) {
      for(const file of files) {
        const filePath = path.join(directoryPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory() || !file.endsWith('.txt')) {
          continue;
        }
        
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        documents.push(fileContent)
      }
    }
    
    return documents;
  } catch (error) {
    console.log('Error reading documents directory');
    return [];
  }
}
