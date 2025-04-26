import { z } from 'zod'
import { END, START, StateGraph } from '@langchain/langgraph';
import { ChatGroq } from '@langchain/groq';
import { config } from 'dotenv';
import { RESPONSE_GENERATOR_PROMPT, SOURCE_CHOSER_PROMPT } from './prompt.js';
import { readdirSync } from 'fs';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { StateAnnotation } from './state.js';

config();

async function chooseSource(state) {
    const systemMessage = SOURCE_CHOSER_PROMPT.replace('{files}', JSON.stringify(readdirSync(process.env.DATA_DIR+'/documents')));
    const model = new ChatGroq({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        temperature: 0,
        apiKey: process.env.GROQ_API_KEY,
    })
    const messages = [
        { role: 'system', content: systemMessage },
        ...state.messages,
    ];
    const Files = z.object({
        files: z.array(z.string()).describe('The list of files.'),
    })
    .describe('The files to query information.');
    const response = await model.withStructuredOutput(Files).invoke(messages);
    return { files: response.files };
}

async function getFileContents(state) {
    console.log('getFileContents', state);
    const { files } = state;
    const fileContents = await Promise.all(files.map(async file => {
        const loader = new TextLoader(`${process.env.DATA_DIR}/documents/${file}`);
        const content = await loader.load().then(docs => docs.map(doc => doc.pageContent).join('\n'));
        return { filename: file, content };
    }));
    return { file_contents: fileContents };
}

async function generateResponse(state) {
    const { file_contents } = state;
    const systemMessage = RESPONSE_GENERATOR_PROMPT.replace('{file_contents}', JSON.stringify(file_contents));
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
    .addNode("response_generator", generateResponse)
    .addEdge(START, "source_chooser")
    .addEdge("source_chooser", "get_file_contents")
    .addEdge("get_file_contents", "response_generator")
    .addEdge("response_generator", END)


export const agent = workflow.compile()
