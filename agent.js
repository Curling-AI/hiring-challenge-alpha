import { z } from 'zod'
import { END, START, StateGraph } from '@langchain/langgraph';
import { ChatGroq } from '@langchain/groq';
import { config } from 'dotenv';
import { RESPONSE_GENERATOR_PROMPT, SOURCE_CHOSER_PROMPT } from './prompt.js';
import { readdirSync } from 'fs';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { StateAnnotation } from './state.js';
import { getSqliteFilesWithTables, fetchAll } from './db.js';
import sqlite3 from 'sqlite3';

config();

async function chooseSource(state) {
    const systemMessage = SOURCE_CHOSER_PROMPT
    .replace('{files}', JSON.stringify(readdirSync(process.env.DATA_DIR+'/documents')))
    .replace('{sqlite_files}', JSON.stringify(await getSqliteFilesWithTables()));
    const model = new ChatGroq({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        temperature: 0,
        apiKey: process.env.GROQ_API_KEY,
    })
    const messages = [
        { role: 'system', content: systemMessage },
        ...state.messages,
    ];

    const Sources = z.object({
        files: z.array(z.string()).describe('The list of files.'),
        sql_queries: z.array(z.object({
            sqlite_file: z.string().describe('The name of the sqlite file.'),
            query: z.string().describe('The SQL query.'),  
        })).describe('The list of SQL queries.'),
    })
    .describe('The source files and SQL queries to use for the response.');
    const response = await model.withStructuredOutput(Sources).invoke(messages);
    return { ...response };
}

async function getFileContents(state) {
    const { files } = state;
    const fileContents = await Promise.all(files.map(async file => {
        const loader = new TextLoader(`${process.env.DATA_DIR}/documents/${file}`);
        const content = await loader.load().then(docs => docs.map(doc => doc.pageContent).join('\n'));
        return { filename: file, content };
    }));
    return { file_contents: fileContents };
}

async function getSqlQueryResults(state) {
    const { sql_queries } = state;
    const sqlQueryResults = await Promise.all(sql_queries.map(async query => {
        const db = new sqlite3.Database(`${process.env.DATA_DIR}/sqlite/${query.sqlite_file}`, sqlite3.OPEN_READONLY);
        const result = await fetchAll(db, query.query)
        db.close();
        return { query, result };
    }));
    return { sql_query_results: sqlQueryResults };
}

async function generateResponse(state) {
    console.log('generateResponse', state);
    const { file_contents } = state;
    const systemMessage = RESPONSE_GENERATOR_PROMPT
    .replace('{file_contents}', JSON.stringify(file_contents))
    .replace('{sql_query_results}', JSON.stringify(state.sql_query_results));
    console.log('systemMessage', systemMessage);
    const model = new ChatGroq({
        model: process.env.VITE_GROQ_MODEL || 'llama-3.3-70b-versatile',
        temperature: 0,
        apiKey: process.env.VITE_GROQ_API_KEY,
    })
    const messages = [
        { role: 'system', content: systemMessage },
        ...state.messages,
    ];
    const response = await model.invoke(messages);
    return { messages: [response] };
}

const workflow = new StateGraph(StateAnnotation)
    .addNode("source_chooser", chooseSource)
    .addNode("get_file_contents", getFileContents)
    .addNode("get_sql_query_results", getSqlQueryResults)
    .addNode("response_generator", generateResponse)
    .addEdge(START, "source_chooser")
    .addEdge("source_chooser", "get_file_contents")
    .addEdge("get_file_contents", "get_sql_query_results")
    .addEdge("get_sql_query_results", "response_generator")
    .addEdge("response_generator", END)

export const agent = workflow.compile()
