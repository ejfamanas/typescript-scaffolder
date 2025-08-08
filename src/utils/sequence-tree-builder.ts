import { Sequence, SequenceStep } from "models/sequence-definitions";
import { Logger } from "./logger";

export interface TreeNode {
  id: string;
  type: 'fetchList' | 'action' | 'loop';
  step: SequenceStep;
  children: TreeNode[];
}

/**
 * Builds a tree from a sequence instruction
 * @param sequence
 */
export function buildTreeFromSequence(sequence: Sequence): TreeNode[] {
  const funcName = "buildTreeFromSequence"
  Logger.debug(funcName, "Building graph from sequence...")
  return sequence.steps.map(step => buildNode(step));
}

/**
 * Builds an individual node within a sequence tree
 * @param step
 */
function buildNode(step: SequenceStep): TreeNode {
  const funcName = "buildNode";
  Logger.debug(funcName, "Building nodes...")
  switch (step.type) {
    case 'loop':
      return {
        id: step.id,
        type: step.type,
        step,
        children: step.steps.map(buildNode),
      };
    case 'fetchList':
    case 'action':
    default:
      return {
        id: step.id,
        type: step.type,
        step,
        children: [],
      };
  }
}