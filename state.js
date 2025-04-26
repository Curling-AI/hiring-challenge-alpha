import { Annotation, messagesStateReducer } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";

// Define the structure for file contents
const FileContents = {
  filename: String,
  content: String,
};

export const StateAnnotation = Annotation.Root({
  // Messages field with a reducer to handle message updates
  messages: Annotation({
    reducer: messagesStateReducer,
    default: () => [],
  }),

  // Files field to store an array of file names
  files: Annotation({
    reducer: (currentFiles, newFiles) => currentFiles.concat(newFiles),
    default: () => [],
  }),

  // File contents field to store an array of FileContents objects
  file_contents: Annotation({
    reducer: (currentContents, newContents) => currentContents.concat(newContents),
    default: () => [],
  }),
});