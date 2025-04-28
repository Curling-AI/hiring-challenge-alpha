# Multi-Source AI Agent Challenge

## Challenge Overview

Welcome to the Multi-Source AI Agent Challenge! In this project, you'll build an intelligent agent using Node.js and modern LLM frameworks that can answer questions by leveraging multiple data sources including SQLite databases, document files, and web content via bash commands.

## Challenge Requirements

### Technology Stack
- Node.js
- [LangChain](https://js.langchain.com/docs/) - For LLM integration and chains
- [LangGraph](https://js.langchain.com/docs/langgraph/) - For agent workflow orchestration

### Core Features
Your AI agent must be able to:

1. **Answer questions using multiple data sources:**
   - **SQLite databases**: The agent should query `.db` files placed in the `data/sqlite` folder
   - **Document context**: The agent should extract information from `.txt` files in the `data/documents` folder
   - **External data**: The agent should be able to run bash commands (with user approval) to gather additional data (e.g., using `curl` to fetch web content)

2. **Implement a conversational interface** - either in the browser or terminal

3. **Provide intelligent routing** - decide which data source is most appropriate for each question and use the right tools accordingly

### Minimum Viable Product
Your solution must demonstrate:

- A functional agent that can respond to user questions
- Proper routing between different data sources
- A clear execution flow with user approval for bash commands
- Meaningful responses that integrate information from multiple sources when needed

## Submission Guidelines

1. Fork this repository
2. Implement your solution
3. Submit a pull request with your implementation
4. Include detailed instructions on how to run and test your solution
5. Your code must be 100% functional

## Evaluation Criteria

Your submission will be evaluated based on:

- **Functionality**: Does it work as expected? Can it correctly use all three data sources?
- **Code Quality**: Is the code well-organized, commented, and following best practices?
- **Error Handling**: How does the agent handle edge cases and errors?
- **User Experience**: Is the conversation with the agent natural and helpful?
- **Documentation**: Is the setup and usage well documented?

## Setup Instructions

Include detailed instructions on how to set up and run your solution. For example:

1. Clone the repository
2. Install dependencies: `npm install`
3. Configure environment variables (copy `.env.example` to `.env` and fill in required values)
4. Add sample databases to the `sqlite` folder
5. Add sample documents to the `documents` folder
6. Start the agent: `npm start`

## Testing Your Implementation

Your README should include instructions on how to test the agent functionality, such as:

1. Sample questions that query SQLite databases
2. Sample questions that require document context
3. Sample questions that would trigger bash commands (and how to approve them)
4. Examples of questions that combine multiple data sources

## Resources

- [LangChain JS Documentation](https://js.langchain.com/docs/)
- [LangGraph Documentation](https://js.langchain.com/docs/langgraph/)
- [SQLite in Node.js Guide](https://www.sqlitetutorial.net/sqlite-nodejs/)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

Good luck with your implementation! We're excited to see your creative solutions to this challenge.
