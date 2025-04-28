
export const SOURCE_CHOSER_PROMPT = `\
Your task is to choose the best sources to answer the user's question.

As source files you have the following:
{files}

The following json contains the name of the sqlite files and its tables with its columns:
{sqlite_files}

The queries should all be SELECT queries, and the tables should be the ones that are in the sqlite files.

Choose the files and sql queries that probably constains the infomation to best answer the user's question.
You can choose multiple files and sql queries. \
And you can choose no files or sql queries if you think the question can be answered without them.
`

export const HAVE_ENOUGH_INFORMATION_PROMPT = `\
Your task is to determine if the provided information is enough to answer the user's question.

The following json contains the contents and name of the files:
{file_contents}

The following json contains the results of the sql queries:
{sql_query_results}

If the question doesnt seen to require any additional information, \
or seems to be a general conversation instead of a question, \
like a greeting or a statement, \
you should answer with true. \

To determine if the information is enough to answer the user's question, \
consider all the already provided information, \
the files, the sql queries and their results. \

you have to answer with a boolean value. \
If the information is enough to answer the user's question, \
answer with true. \
If the information is not enough to answer the user's question, \
answer with false. \

JUST ANSWER WITH ONE WORD: TRUE OR FALSE. \
THERE IS NO NEED TO EXPLAIN YOUR ANSWER. \
`

export const CREATE_WEB_SEARCH_QUERY_PROMPT = `\
Your task is to create web search querys, that will be used in a web search engine \
to find aditional information to answer the user's question.

the currently available information is as follows:  \

The following json contains the contents and name of the files:
{file_contents}


The following json contains the results of the sql queries:
{sql_query_results}

You must create the querys to search for the information that is missing to answer the user's question. \
The query should be a string that can be used in a web search engine. \
The query should be as specific as possible, \
but also general enough to find relevant information. \
when creating the querys consider that the first results of the search engine \
will be used to answer the user's question. \

Create at most 3 querys. \

The querys must be given in a json array format. \
`

export const RESPONSE_GENERATOR_PROMPT = `\
Your task is to generate a response to the user's question based on the given content of files, sql query results, and web search results.\

Generate a comprehensive and informative answer for the \
given question based solely on the provided information. \
Do NOT ramble, and adjust your response length based on the question. If they ask \
a question that can be answered in one sentence, do that. If 5 paragraphs of detail is needed, \
do that. You must \
only use information from the provided information. Use an unbiased and \
journalistic tone. Combine information together into a coherent answer. Do not \
repeat text.\

If there is no relevant information in the provided information, \
generate a response that says "I don't know" or "I don't have enough information to answer that question." \
NEVER MAKE UP ANSWERS.\

`

export const RESPONSE_GENERATOR_PROMPT_FILES = `\

The following json contains the contents and name of the files:
{file_contents}

the file contents are in the following json format:
{
    "file_name": "name of the file",
    "content": "the content of the file"
}

`

export const RESPONSE_GENERATOR_PROMPT_SQL = `\

The following json contains the results of the sql queries:
{sql_query_results}

When considering the query results, \
analyze the query and its results to extract relevant information. \
The query results are in the following json format:
{
    "query": {
        "sqlite_file": "name of the sqlite file",
        "query": "the sql query"
    },
    "result": [
        {
            "column1": "value1",
            "column2": "value2",
            ...
        }
    ]
}
`

export const RESPONSE_GENERATOR_PROMPT_WEB_SEARCH = `\

The following json contains the results of the web search:
{web_search_results}

The web search results are in the following json format:
{
    "query": "the web search query",
    "result": {
        "link": "the link to the web page",
        "content": "the content of the web page"
    }
}
`
