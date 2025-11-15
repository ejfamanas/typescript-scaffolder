import { Method } from "models/api-definitions";

/**
 * Metadata about the request being executed, useful for logging or debugging.
 */
export interface RequestContext {
    /** The endpoint path (e.g., "/users/:id"). */
    endpointPath: string;
    /** The HTTP method used (e.g., "GET", "POST"). */
    method?: Method;
    /** Optional query or path parameters for the request. */
    params?: Record<string, unknown>;
}

/**
 * Configuration options for controlling how errors are handled in generated API wrappers.
 */
export interface WrapRequestOptions {
    /** Optional metadata for logging or debugging context. */
    context?: RequestContext;
    /** A logging function to be called when an error occurs. Defaults to console.error. */
    logFn?: (error: unknown, context?: RequestContext) => void;
    /** A function to sanitize the error before logging or rethrowing. */
    sanitizeFn?: (error: unknown) => unknown;
    /** Whether to rethrow the original error after logging. Default: true. */
    rethrow?: boolean;
}