import Fastify, { FastifyInstance } from "fastify"
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import fastifyWebsocket from "@fastify/websocket";
import fastifyView from "@fastify/view";
import fastifyStatic from "@fastify/static";
import ejs from "ejs";
import path from "node:path";
import { AiChatController } from "./controllers/talkAIController";
import { chatViewController } from "./controllers/chatViewController";

export async function buildApp(): Promise<FastifyInstance> {
    const fastify = Fastify({logger: true})
    await fastify.register(fastifyWebsocket);
    await fastify.register(fastifyView, {
        root: path.join(__dirname, 'views'),
        engine: {
            ejs: ejs,
        },
    })

    const model = new ChatGoogleGenerativeAI({
        model: "gemini-2.0-flash",
        temperature: 0
    });

    await fastify.register(fastifyStatic, {
        root: path.join(__dirname, 'public'),
        prefix: '/',
    })

    fastify.register((fastify) => {        
        fastify.get('/', chatViewController);
        fastify.get('/talkAi', { websocket: true }, (connect) => AiChatController(connect, model));
    }, {prefix: "/api/v1"})

    return fastify
}

export default buildApp