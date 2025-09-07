
/**
 * Models for describing API endpoint configurations used by typescript-scaffolder.
 */

import { RetryConfig } from "models/retry-definitions";

/** Allowed HTTP methods for an endpoint. */
export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

/** Supported authentication types for API endpoints. */
export type AuthType = 'basic' | 'apikey' | 'none'

/**
 * Common schema options indicating request/response validation or typing.
 */
export interface SchemaConsumer {
	/** Optional schema definition for request payloads. */
	requestSchema?: string;
	/** Optional schema definition for response payloads. */
	responseSchema?: string;
}

/**
 * Configuration for a single API endpoint, including HTTP method, path,
 * and associated schema and parameter details.
 */
export interface Endpoint extends SchemaConsumer {
	/** HTTP method for the endpoint. */
	method: Method;
	/** URL path template, e.g., "/users/{userId}". */
	path: string;
	/** Name of the resource object returned by the endpoint. */
	objectName: string;
	/** Optional custom name for the generated client method. */
	operationName?: string;
	/** List of named path parameters for URL interpolation. */
	pathParams?: string[];
	/** List of query parameter names to include. */
	queryParams?: string[];
	/** Static headers to send with each request. */
	headers?: Record<string, string>;
	/** Schema name for the response payload. */
	responseSchema: string;
}

/**
 * Root configuration object for API client generation,
 * including base URL and endpoint definitions.
 */
export type EndpointConfigType = {
	baseUrl: string
	endpoints: Endpoint[]
};

/**
 * Authentication configuration options for the API client.
 */
export interface EndpointAuthConfig {
	/** Type of authentication to use (basic, apikey, or none). */
	authType: AuthType;
	/** Optional credentials object, required for basic or API key auth. */
	credentials?: EndpointAuthCredentials
}

/**
 * Credential details for authentication, varying by authType.
 */
export interface EndpointAuthCredentials {
	/** Header name to use for authentication. */
	authHeaderName?: string;
	/** Username for basic authentication. */
	username?: string;
	/** Password for basic authentication. */
	password?: string;
	/** Header or parameter name for API key auth. */
	apiKeyName?: string;
	/** Value of the API key for authentication. */
	apiKeyValue?: string;
}

/**
 * Combined API client configuration file, including endpoints and auth settings.
 */
export interface EndpointClientConfigFile extends EndpointConfigType, EndpointAuthConfig {
	/** Optional retry configuration applied to all endpoints in this client. */
	retry?: RetryConfig;
}