# Multi-Source AI Agent

## Setup
1. Clone this repository
2. Add the necessary envs according to env.sample
3. Install the required dependencies: `yarn install`
4. Run the build script: `yarn build`
5. Run the server: `yarn start`
6. Alternativaly, you can run in dev mode without building: `yarn dev`

## ARCHITECTURE
The app uses the MVC pattern, but with a services folder instead of a model's one.
EJS for views and websockets for client-server communication.

## How to use

1. Wait for the server to start, then open the browser at the view route http://[::1]:{PORT:DEFAULT=3000}/api/v1/
example view Route: http://[::1]:3000/api/v1/

2. Start chatting with the AI agent.

## Functionalities

1. The AI agent can answer questions in multiple languages
example prompt: "change to portuguese"

2. The AI agent is able to read any txt file inside data/documents
example prompt: "search in the documents about economy books"

3. The AI agent is able to execute queries in data/sqlite
example prompt: "i wanna know about music, get musics from the database"

4. The AI agent is able to execute curl commands to search the web
example prompt: "get data from wikipedia about civil war"

## NECESSARY IMPROVEMENTS
1. Using @fastify/websocket is not scalable, since you cannot use it to emit events or create rooms,
which opens the necessity for several workarounds and messes the code. Changing to socket.io is the better choice.

2. Currently, the online search tool do work, but it is honestly not consistent. Should improve the prompt to make it better

3. The DOCUMENTS and QUERY tools need to query all the files in their folder, could add AI to filter it.
## DEPENDENCIES LIST

### fastify
@fastify/static
@fastify/view
@fastify/websocket

### langchain
@langchain/community
@langchain/core
@langchain/google-genai
@langchain/langgraph

### others
sqlite,
sqlite3
ejs,
dotenv,
nodemon,
ts-node,
typescript,
@types/sqlite3,
@types/ejs,
@types/node,
@types/ws,