
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

export const RESPONSE_GENERATOR_PROMPT = `\
Your task is to generate a response to the user's question based on the given content of files and sql query results.\

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

Generate a comprehensive and informative answer for the \
given question based solely on the provided information. \
Do NOT ramble, and adjust your response length based on the question. If they ask \
a question that can be answered in one sentence, do that. If 5 paragraphs of detail is needed, \
do that. You must \
only use information from the provided information. Use an unbiased and \
journalistic tone. Combine information together into a coherent answer. Do not \
repeat text. Cite source using [{{number}}] notation. Only cite the most \
relevant results that answer the question accurately, and the number represents the file, so if the information is in the same file the number has to be the same.

If there is no relevant information in the provided information, \
generate a response that says "I don't know" or "I don't have enough information to answer that question." \
NEVER MAKE UP ANSWERS. \

The following json contains the contents and name of the files:
{file_contents}

The following json contains the results of the sql queries:
{sql_query_results}
`