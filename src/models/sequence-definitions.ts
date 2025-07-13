/**
 * Defines a named sequence of steps to execute against API endpoints.
 */
export interface Sequence {
  /** Unique name for this sequence */
  name: string;
  /** Ordered list of steps in the sequence */
  steps: SequenceStep[];
}

/** Union type for any step in a sequence */
export type SequenceStep = FetchListStep | LoopStep | ActionStep;

/** Shared fields across all sequence steps */
export interface SequenceStepBase {
  /** Unique identifier for the step */
  id: string;
  /** The kind of step: fetchList, loop, or action */
  type: 'fetchList' | 'loop' | 'action';
}

/** Step that fetches a list of IDs (or other field) from a GET endpoint */
export interface FetchListStep extends SequenceStepBase {
  type: 'fetchList';
  /** HTTP method and path, e.g., "GET /users" */
  endpoint: string;
  /** Extraction instructions from the JSON response */
  extract: {
    /** Variable name to bind the extracted list to */
    as: string;
    /** Field in the response to extract, e.g., "id" */
    field: string;
  };
}

/** Step that performs a POST/PUT/GET action (optionally extracting a value) */
export interface ActionStep extends SequenceStepBase {
  type: 'action';
  /** HTTP method and path, e.g., "POST /users/{userId}/pictures" */
  endpoint: string;
  /** Optional request body for POST/PUT */
  body?: Record<string, any>;
  /** Optional extraction of a single field from the response */
  extract?: {
    as: string;
    field: string;
  };
}

/** Step that loops over a previously extracted array variable */
export interface LoopStep extends SequenceStepBase {
  type: 'loop';
  /** Name of the array variable to iterate over */
  over: string;
  /** Loop variable name for each item, e.g., "userId" */
  itemName: string;
  /** Nested steps to execute for each item in the loop */
  steps: SequenceStep[];
}