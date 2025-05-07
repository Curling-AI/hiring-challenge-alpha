import { FastifyReply, FastifyRequest } from "fastify";

export const chatViewController = async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.view('index', { title: 'Homepage', name: 'Guest' });
};