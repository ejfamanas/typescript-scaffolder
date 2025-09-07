
/**
 * Options to control retry behavior for generated API clients.
 * These options are threaded from the generator into the endpoint-typed wrappers.
 */
export interface RetryOptions {
    /** When false, the attempt is executed once with no retries. */
    enabled: boolean;
    /** Total attempts including the first (default 3). */
    maxAttempts?: number;
    /** Base delay before first retry (default 250). */
    initialDelayMs?: number;
    /** Exponential backoff multiplier (default 2.0). */
    multiplier?: number;
    /** HTTP statuses to retry (default [429, 502, 503, 504]). */
    retryStatuses?: number[];
    /** HTTP method used for idempotency checks. */
    method?: string;
    /** Methods considered safe to retry (default ["GET","HEAD","PUT","DELETE","OPTIONS"]). */
    idempotentMethods?: string[];
}

/**
 * Configuration options for enabling client-wide retries at codegen time.
 */
export interface RetryConfig {
    /** Enable or disable retries for all endpoints in this client. Default: false. */
    enabled: boolean;
    /** Maximum number of attempts including the first. Default: 3. */
    maxAttempts?: number;
    /** Base delay before the first retry in milliseconds. Default: 250. */
    initialDelayMs?: number;
    /** Exponential backoff multiplier applied per attempt. Default: 2.0. */
    multiplier?: number;
}

/**
 * used by the retry helper to define the shape of an endpoint
 */
export interface RetryEndpointMeta {
    /** The generated endpoint function name, e.g. "GET_person". */
    functionName: string;
    /** The concrete response type name, e.g. "Person" or "PersonList". */
    responseType: string;
    /** The module specifier to import the response type from, e.g. "../interfaces/Person". */
    responseModule: string;
}