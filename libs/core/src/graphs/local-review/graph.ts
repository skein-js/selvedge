import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import type { AgentResult, ReviewBundle } from '@selvedge/contracts';

import { executeReview } from '../../reviews/execute-review';

const state = Annotation.Root({
  bundle: Annotation<ReviewBundle>(),
  requestId: Annotation<string>(),
  result: Annotation<AgentResult>(),
});
export const graph = new StateGraph(state)
  .addNode('review', executeReview)
  .addEdge(START, 'review')
  .addEdge('review', END)
  .compile();
