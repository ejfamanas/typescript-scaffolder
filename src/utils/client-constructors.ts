import { AuthType, Endpoint, EndpointAuthCredentials } from 'models/api-definitions';
import { Logger } from './logger';

/**
 * Creates an auth header object based on the endpoint credentials config
 * @param authType
 * @param credentials
 */
export function generateInlineAuthHeader(authType: AuthType, credentials?: EndpointAuthCredentials): string {
	const funcName = 'generateInlineAuthHeader';
	Logger.debug(funcName, 'Generating inline auth header...');
	if (authType === 'none' && credentials === undefined) {
		Logger.warn(funcName, 'No credentials found for auth header found.')
		return '{}';
	}
	switch (authType) {
		case 'basic':
			if (credentials?.username && credentials?.password) {
				const token = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
				const headerName = credentials.authHeaderName || 'Authorization';
				return `{ "${headerName}": "Basic ${token}" }`;
			}
			break;
		case 'apikey':
			if (credentials?.apiKeyName && credentials?.apiKeyValue) {
				return `{ "${credentials.apiKeyName}": "${credentials.apiKeyValue}" }`;
			}
			break;
		default:
			break;
	}
	return '{}';
}

/**
 * returns the function name and filename for a specified action given an endpoint and parent object
 * @param endpoint
 * @param objectName
 */
export function generateClientAction(endpoint: Endpoint): {
	functionName: string,
	fileName: string
} {
	const funcName = 'generateClientAction';
	const { objectName } = endpoint
	Logger.debug(funcName, 'Generating client action...');
	const action =
		endpoint.method === 'GET' && endpoint.pathParams?.length
			? 'GET'
			: endpoint.method === 'GET'
				? 'GET_ALL'
				: endpoint.method.toUpperCase();

	const functionName = `${action}_${objectName}`;
	const fileName = `${objectName}_api`;
	return {functionName, fileName};
}
