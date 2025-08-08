import { Method } from "models/api-definitions";

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
  /** HTTP method to use for this action (default is POST) */
  method: Method
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
/** Represents a config file defining sequences for a specific API/service */
export interface SequenceConfigFile {
  /** Name of the service this sequence config is associated with */
  serviceName: string;
  /** Base URL for this service's API (used for documentation or client context) */
  baseUrl: string;
  /** Authentication strategy, if needed */
  authType: 'apikey' | 'basic' | 'none';
  /** Optional credentials or env-mapped values */
  credentials?: Record<string, string>;
  /** List of sequences defined for this service */
  sequences: Sequence[];
}