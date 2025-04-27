import { Annotation, messagesStateReducer } from "@langchain/langgraph";
import { z } from "zod";

export const Sources = z.object({
  files: z.array(z.string()).describe('The list of files.'),
  sql_queries: z.array(z.object({
      sqlite_file: z.string().describe('The name of the sqlite file.'),
      query: z.string().describe('The SQL query.'),  
  })).describe('The list of SQL queries.'),
})
.describe('The source files and SQL queries to use for the response.');

export const StateAnnotation = Annotation.Root({
  // Human and Ai messages field to store an array of messages
  messages: Annotation({
    reducer: messagesStateReducer,
    default: () => [],
  }),

  // Files field to store an array of file names as strings
  files: Annotation({
    reducer: (currentFiles, newFiles) => currentFiles.concat(newFiles),
    default: () => [],
  }),

  // File contents field to store an array of file content objects
  // object structure: { filename: string, content: string }
  file_contents: Annotation({
    reducer: (currentContents, newContents) => currentContents.concat(newContents),
    default: () => [],
  }),

  // SQL query field to store an array of SQL query as objects
  // object structure: { sqlite_file: string, query: string }
  sql_queries: Annotation({
    reducer: (currentQueries, newQueries) => currentQueries.concat(newQueries),
    default: () => [],
  }),

  // SQL query results field to store an array of SQL query results as objects
  // object structure: { query: { sqlite_file: string, query: string }, result: array of objects }
  // each object structure: { column1: value1, column2: value2, ... }
  sql_query_results: Annotation({
    reducer: (currentResults, newResults) => currentResults.concat(newResults),
    default: () => [],
  }),

  // Mark the state as having enough information to answer the user's question
  have_enough_info: Annotation({
    reducer: (currentValue, newValue) => newValue,
    default: () => false,
  }),

  // Web search allowed field to store a boolean value indicating whether web search is allowed or not 
  web_search_allowed: Annotation({
    reducer: (currentValue, newValue) => newValue,
    default: () => false,
  }),

  // Web search query field to store an array of web search query as strings
  web_search_query: Annotation({
    reducer: (currentQueries, newQueries) => currentQueries.concat(newQueries),
    default: () => [],
  }),

  // Web search results field to store an array of web search results as objects
  // object structure: { query: string, result: {link: string, content: string }}
  web_search_results: Annotation({
    reducer: (currentResults, newResults) => currentResults.concat(newResults),
    default: () => [],
  }),


});