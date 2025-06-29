import { AuthType, Endpoint } from 'models/api-definitions';
import { Logger } from './logger';

export function generateInlineAuthHeader(authType: AuthType, credentials?: Record<string, string>): string {
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
				return `{"Authorization": "Basic ${token}"}`;
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

export function generateClientAction(endpoint: Endpoint, objectName: string): {
	functionName: string,
	fileName: string
} {
	const funcName = 'generateClientAction';
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

