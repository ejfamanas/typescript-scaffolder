import { Endpoint } from '../models/api-definitions';

export function generateInlineAuthHeader(authType: string, credentials?: Record<string, string>): string {
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

export function deriveFunctionName(endpoint: Endpoint): string {
	const lastSegment = endpoint.path.split('/').filter(Boolean).pop()?.replace(/{|}/g, '') ?? 'request';
	const verb = endpoint.method === 'GET' && !endpoint.pathParams?.length ? 'getAll' : endpoint.method.toLowerCase();
	return `${verb}${capitalize(lastSegment)}`;
}

export function capitalize(str: string) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}