import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from "zod";
import { querySQLite } from "./sqliteTool.js";
import { readDocument } from "./documentTool.js";
import { runBashCommand } from "./bashTool.js";

// Exporta todas as ferramentas (SQLite, documentos, Bash) para uso pelo agente

export const tools = [
    new DynamicStructuredTool({
        name: "sqlite_tool",
        description: `Tool for querying a music database. Main tables:
                    Artist
                    Album
                    Costumer
                    Employee
                    Track 
                    Genre
                    Playlist 
                    PlaylistTrack
                    MediaType
                    Invoice
                    InvoiceLine
                    Ask "show full schema" for details.`,
        schema: z.object({
            input: z.string().describe("The SQL query to execute."),
        }),
        func: async ({ input }) => {
            return await querySQLite(input);
        },
    }),

    new DynamicStructuredTool({
        name: "document_reader",
        description: `Use this tool to search and read documents related to economics.
                    The documents are stored in the 'documents' folder and contain information on various economic topics.
                    You can provide a keyword or a document title to retrieve relevant content.`,
        schema: z.object({
            input: z.string().describe("A keyword or document title to search for."),
        }),
        func: async ({ input }) => {
            return await readDocument(input);
        },
    }),

    new DynamicStructuredTool({
        name: "bash_tool",
        description: `Use this to run bash commands on the server, such as:
                    Downloading files using 'curl'
                    Listing files with 'ls'
                    Viewing file content with 'cat'

                    Be careful with destructive commands.`,
        schema: z.object({
            input: z.string().describe("The command to run, like 'curl https://example.com'"),
        }),
        func: async ({ input }) => {
            return await runBashCommand(input);
        },
    }),
];
