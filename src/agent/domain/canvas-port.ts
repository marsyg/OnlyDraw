import { ElementSummary } from './element-summary';
import { ProposedChange } from './proposed-change';

export type AgentOrigin = {
  agent: true;
  runId: string;
  invokedBy: 'model' | 'human';
};

export interface CanvasPort {
  listElements(roomId: string): Promise<ElementSummary[]>;
  commit(roomId: string, change: ProposedChange, origin: AgentOrigin):
    Promise<{ committedIds: string[] }>;
  undoRun(roomId: string, runId: string): Promise<void>;
}