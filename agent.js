import { END, START, StateGraph } from '@langchain/langgraph';
import { ChatGroq } from '@langchain/groq';
import { config } from 'dotenv';
import { RESPONSE_GENERATOR_PROMPT, SOURCE_CHOSER_PROMPT, HAVE_ENOUGH_INFORMATION_PROMPT, CREATE_WEB_SEARCH_QUERY_PROMPT, RESPONSE_GENERATOR_PROMPT_FILES, RESPONSE_GENERATOR_PROMPT_SQL, RESPONSE_GENERATOR_PROMPT_WEB_SEARCH } from './prompt.js';
import { readdirSync } from 'fs';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { StateAnnotation, Sources } from './state.js';
import { getSqliteFilesWithTables, fetchAll } from './db.js';
import sqlite3 from 'sqlite3';
import { z } from 'zod';
import { getWebSearchResult } from './web_searcher.js';

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

    const response = await model.withStructuredOutput(Sources).invoke(messages)
    .catch(err => {
        console.error("Error in chooseSource:", err);
        return { files: [], sql_queries: [] };
    });
    return { ...response };
}

async function getFileContents(state) {
    const { files } = state;
    const fileContents = await Promise.all(files.map(async file => {
        const loader = new TextLoader(`${process.env.DATA_DIR}/documents/${file}`);
        const content = await loader.load().then(docs => docs.map(doc => doc.pageContent).join('\n'))
        .catch(err => {
            console.error(`Error loading file "${file}":`, err);
            return "";
        });
        return { filename: file, content };
    }));
    return { file_contents: fileContents };
}

async function getSqlQueryResults(state) {
    const { sql_queries } = state;
    const sqlQueryResults = await Promise.all(sql_queries.map(async query => {
        const db = new sqlite3.Database(`${process.env.DATA_DIR}/sqlite/${query.sqlite_file}`, sqlite3.OPEN_READONLY);
        const result = await fetchAll(db, query.query)
        .catch(err => {
            console.error(`Error executing query "${query.query}" on file "${query.sqlite_file}":`, err);
            return [];
        });
        db.close();
        return { query, result };
    }));
    return { sql_query_results: sqlQueryResults };
}

function checkWebSearchAllowed(state) {
    const { web_search_allowed } = state;
    if (web_search_allowed) {
        return "have_enough_information";
    }
    return "response_generator";
}

async function haveEnoughInformation(state) {
    const {file_contents, sql_query_results} = state;
    const systemMessage = HAVE_ENOUGH_INFORMATION_PROMPT
    .replace('{file_contents}', JSON.stringify(file_contents))
    .replace('{sql_query_results}', JSON.stringify(sql_query_results));
    const model = new ChatGroq({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        temperature: 0,
        apiKey: process.env.GROQ_API_KEY,
    })
    const messages = [
        { role: 'system', content: systemMessage },
        ...state.messages,
    ];
    const response = await model.withStructuredOutput(z.object({have_enough_info:z.boolean(),})).invoke(messages)
    .catch(err => {
        console.error("Error in haveEnoughInformation:", err);
        return { have_enough_info: false };
    });
    return { have_enough_info: response.have_enough_info };
}

function checkHaveEnoughInformation(state) {
    const { have_enough_info } = state;
    if (have_enough_info) {
        return "response_generator";
    }
    return "create_web_search_query";
}

async function createWebSearchQuery(state) {
    const { file_contents, sql_query_results } = state;
    const systemMessage = CREATE_WEB_SEARCH_QUERY_PROMPT
    .replace('{file_contents}', JSON.stringify(file_contents))
    .replace('{sql_query_results}', JSON.stringify(sql_query_results));
    const model = new ChatGroq({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        temperature: 0,
        apiKey: process.env.GROQ_API_KEY,
    })
    const messages = [
        { role: 'system', content: systemMessage },
        ...state.messages, 
    ];
    const response = await model.withStructuredOutput(z.object({ web_search_query: z.array(z.string()) })).invoke(messages)
    .catch(err => {
        console.error("Error in createWebSearchQuery:", err);
        return { web_search_query: [] };
    });
    return { web_search_query: response.web_search_query };
}

async function performWebSearch(state) {
    const { web_search_query } = state;
    const webSearchResults = await Promise.all(web_search_query.map(async query => {
        const result = await getWebSearchResult(query)
        .catch(err => {
            console.error(`Error performing web search for query "${query}":`, err);
            return null;
        });
        return { query, result };
    }
    ));
    return { web_search_results: webSearchResults };
}

async function generateResponse(state) {
    const { file_contents, sql_query_results, web_search_results } = state;
    const systemMessage = RESPONSE_GENERATOR_PROMPT +
    ((file_contents.length)? RESPONSE_GENERATOR_PROMPT_FILES.replace('{file_contents}', JSON.stringify(file_contents)) : "") + 
    ((sql_query_results.length)? RESPONSE_GENERATOR_PROMPT_SQL.replace('{sql_query_results}', JSON.stringify(sql_query_results)) : "") +
    ((web_search_results.length)? RESPONSE_GENERATOR_PROMPT_WEB_SEARCH.replace('{web_search_results}', JSON.stringify(web_search_results)) : "");
    const model = new ChatGroq({
        model: process.env.VITE_GROQ_MODEL || 'llama-3.3-70b-versatile',
        temperature: 0,
        apiKey: process.env.VITE_GROQ_API_KEY,
    })
    const messages = [
        { role: 'system', content: systemMessage },
        ...state.messages,
    ];
    const response = await model.invoke(messages)
    .catch(err => {
        console.error("Error in generateResponse:", err);
        return { content: "I don't know" };
    });
    return { messages: [response] };
}

const workflow = new StateGraph(StateAnnotation)
    .addNode("source_chooser", chooseSource)
    .addNode("get_file_contents", getFileContents)
    .addNode("get_sql_query_results", getSqlQueryResults)
    .addNode("response_generator", generateResponse)
    .addNode("have_enough_information", haveEnoughInformation)
    .addNode("create_web_search_query", createWebSearchQuery)
    .addNode("perform_web_search", performWebSearch)
    .addEdge(START, "source_chooser")
    .addEdge("source_chooser", "get_file_contents")
    .addEdge("get_file_contents", "get_sql_query_results")
    .addConditionalEdges("get_sql_query_results", checkWebSearchAllowed, [
        "response_generator",
        "have_enough_information",
    ])
    .addConditionalEdges("have_enough_information", checkHaveEnoughInformation, [
        "response_generator",
        "create_web_search_query",
    ])
    .addEdge("create_web_search_query", "perform_web_search")
    .addEdge("perform_web_search", "response_generator")
    .addEdge("response_generator", END)

export const agent = workflow.compile()
