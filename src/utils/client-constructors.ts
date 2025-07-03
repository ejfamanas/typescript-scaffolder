import {AuthType, Endpoint, EndpointAuthCredentials, SchemaConsumer} from 'models/api-definitions';
import { Logger } from './logger';
import path from "path";

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


export function determineHasBody(method: string): boolean {
	return ['post', 'put'].includes(method.toLowerCase());
}

export function constructUrlPath(endpoint: Endpoint): string {
	const pathParams = endpoint.pathParams ?? [];
	return pathParams.reduce((p, param) => p.replace(`:${param}`, `\${${param}}`), endpoint.path);
}

export function addRequiredImports(
	sourceFile: import('ts-morph').SourceFile,
	outputFilePath: string,
	interfaceInputDir: string,
	requestSchema: string | undefined,
	responseSchema: string,
	hasBody: boolean
) {
	const existingImports = sourceFile.getImportDeclarations().map(decl => decl.getModuleSpecifierValue());
	const addImportIfMissing = (specifier: string, namedImport: string, isDefault = false) => {
		if (!existingImports.includes(specifier)) {
			sourceFile.addImportDeclaration({
				...(isDefault ? { defaultImport: namedImport } : { namedImports: [namedImport] }),
				moduleSpecifier: specifier,
			});
		}
	};

	if (requestSchema && hasBody) {
		const requestPath = path
			.relative(path.dirname(outputFilePath), path.join(interfaceInputDir, requestSchema))
			.replace(/\\/g, '/')
			.replace(/\.ts$/, '');
		addImportIfMissing(requestPath, requestSchema); // use requestSchema verbatim
	}

	const responsePath = path
		.relative(path.dirname(outputFilePath), path.join(interfaceInputDir, responseSchema))
		.replace(/\\/g, '/')
		.replace(/\.ts$/, '');
	addImportIfMissing(responsePath, responseSchema); // use responseSchema verbatim

	addImportIfMissing('axios', 'axios', true);
	addImportIfMissing('axios', 'AxiosRequestConfig');
}


export function collectRequiredSchemas<T extends SchemaConsumer>(consumers: T[]): Set<string> {
	const requiredSchemas = new Set<string>();
	for (const consumer of consumers) {
		if (consumer.requestSchema) {
			requiredSchemas.add(consumer.requestSchema);
		}
		if (consumer.responseSchema) {
			requiredSchemas.add(consumer.responseSchema);
		}
	}
	return requiredSchemas;
}

export function findDirectoryContainingAllSchemas(
	requiredSchemas: Set<string>,
	interfaceNameToDirs: Map<string, Set<string>>,
	configPath: string,
	funcName: string
): string | null {
	// To find a directory that contains all required schemas:
	// We build a map from directory to count of schemas found there
	const dirSchemaCount: Map<string, number> = new Map();
	for (const schema of requiredSchemas) {
		const dirs = interfaceNameToDirs.get(schema);
		if (!dirs) {
			const configFileName = path.basename(configPath);
			Logger.warn(funcName,`Schema "${schema}" not found in interface files. Referenced in config: ${configFileName}`);

			const availableSchemas = Array.from(interfaceNameToDirs.keys()).join(', ');
			Logger.debug(funcName, `Available schemas: ${availableSchemas}`);

			return null;
		}
		for (const dir of dirs) {
			dirSchemaCount.set(dir, (dirSchemaCount.get(dir) ?? 0) + 1);
		}
	}
	const totalSchemas = requiredSchemas.size;
	for (const [dir, count] of dirSchemaCount.entries()) {
		if (count === totalSchemas) {
			return dir;
		}
	}
	return null;
}