import { Annotation, END, START, StateGraph } from '@langchain/langgraph';

const state = Annotation.Root({
  checkedAt: Annotation<string>(),
  lastCheckAt: Annotation<string>(),
});

function recordCompletion(input: typeof state.State) {
  return { lastCheckAt: input.checkedAt };
}

export const graph = new StateGraph(state)
  .addNode('record-completion', recordCompletion)
  .addEdge(START, 'record-completion')
  .addEdge('record-completion', END)
  .compile();
