
export const SOURCE_CHOSER_PROMPT = `\
Your task is to choose the best sources to answer the user's question.

As source files you have the following:
{files}

Choose the files that probably constains the best answer to the user's question.
`

export const RESPONSE_GENERATOR_PROMPT = `\
Your task is to generate a response to the user's question based on the given content of files.\

Generate a comprehensive and informative answer for the \
given question based solely on the provided content. \
Do NOT ramble, and adjust your response length based on the question. If they ask \
a question that can be answered in one sentence, do that. If 5 paragraphs of detail is needed, \
do that. You must \
only use information from the provided content. Use an unbiased and \
journalistic tone. Combine content together into a coherent answer. Do not \
repeat text. Cite source using [{{number}}] notation. Only cite the most \
relevant results that answer the question accurately, and the number represents the file, so if the information is in the same file the number has to be the same.\
Place these citations at the end \
of the individual sentence or paragraph that reference them. \
Do not put them all at the end, but rather sprinkle them throughout. If \
different results refer to different entities within the same name, write separate \
answers for each entity.\

If there is no relevant information in the provided content, \
generate a response that says "I don't know" or "I don't have enough information to answer that question." \
NEVER MAKE UP ANSWERS. \

The following json contains the contents and name of the files:
{file_contents}
`