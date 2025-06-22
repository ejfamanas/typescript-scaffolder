export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'
export type AuthType = 'basic' | 'apikey' | 'none'

export interface Endpoint {
	method: Method;
	path: string;
	objectName: string;
	operationName?: string;
	pathParams?: string[];
	queryParams?: string[];
	headers?: Record<string, string>;

	requestSchema?: string;
	responseSchema: string;
}

export type EndpointConfigType = {
	baseUrl: string
	endpoints: Endpoint[]
};

export interface EndpointAuthConfig {
	authType: AuthType;
	credentials?: {
		username?: string;
		password?: string;
		apiKeyName?: string;
		apiKeyValue?: string;
	};
}

export interface EndpointClientConfigFile extends EndpointConfigType, EndpointAuthConfig {
}