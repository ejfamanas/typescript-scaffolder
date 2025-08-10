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

export function addClientRequiredImports(
	sourceFile: import('ts-morph').SourceFile,
	outputFilePath: string,
	interfaceInputDir: string,
	requestSchema: string | undefined,
	responseSchema: string,
	hasBody: boolean,
	addAxios: boolean = true
) {
	const existingImports = sourceFile.getImportDeclarations().map(decl => decl.getModuleSpecifierValue());
	const addImportIfMissing = (specifier: string, namedImport: string, isDefault = false) => {
		if (!namedImport?.trim()) return; // Skip if name is empty or undefined
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

	if (addAxios) {
		addImportIfMissing('axios', 'axios', true);
		addImportIfMissing('axios', 'AxiosRequestConfig');
	}
}

/**
 * Creates a set for the schemas that are required of each consumer
 * @param consumers
 */
export function collectRequiredSchemas<T extends SchemaConsumer>(consumers: T[]): Set<string> {
	const funcName = 'collectRequiredSchemas'
	Logger.debug(funcName, `Collecting required schemas for ${consumers.length} consumer(s)`)
	const requiredSchemas = new Set<string>();
	for (const consumer of consumers) {
		if (consumer.requestSchema) {
			requiredSchemas.add(consumer.requestSchema);
		}
		if (consumer.responseSchema) {
			requiredSchemas.add(consumer.responseSchema);
		}
	}
	if (requiredSchemas.size === 0) {
		Logger.warn(funcName, `could not find any schemas for ${consumers[0]} and ${consumers.length - 1} others.`)
	}
	return requiredSchemas;
}

/**
 * Locates the directory where al the schemas are located and returns them as a string
 *
 * @param requiredSchemas
 * @param interfaceNameToDirs
 * @param configPath
 * @param funcName
 */
export function findDirectoryContainingAllSchemas(
	requiredSchemas: Set<string>,
	interfaceNameToDirs: Map<string, Set<string>>,
	configPath: string,
): string | null {
	const funcName = 'findDirectoryContainingAllSchemas'
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

/**
 * Wrapper that enforces a hard failure if the directory cannot be found.
 * Use this at call sites where generation must stop when schemas are missing.
 */
export function assertDirectoryContainingAllSchemas(
	requiredSchemas: Set<string>,
	interfaceNameToDirs: Map<string, Set<string>>,
	configPath: string,
): string {
	const funcName = 'assertDirectoryContainingAllSchemas';
	const dir = findDirectoryContainingAllSchemas(requiredSchemas, interfaceNameToDirs, configPath);
	if (!dir) {
		const needed = Array.from(requiredSchemas).join(', ');
		const configFileName = path.basename(configPath);
		// A warning has already been logged by findDirectoryContainingAllSchemas
		throw new Error(
			`[${funcName}] Failed to locate an interfaces directory containing all required schemas: ${needed}. ` +
			`Check your config: ${configFileName}`
		);
	}
	return dir;
}

export function buildImportMapAndRegistryEntries(importMap: Map<string, string[]>): { importStatements: string[], registryEntries: string[] } {
	const importStatements: string[] = [];
	const registryEntries: string[] = [];

	for (const [subDir, files] of importMap.entries()) {
		const registryKey = subDir.replace(/\\/g, '/'); // Normalize Windows paths
		const entryLines: string[] = [];

		for (const file of files) {
			const fileName = path.basename(file, '.ts');
			const importVar = `${fileName.replace(/[^a-zA-Z0-9_$]/g, '_')}`;
			const relativePath = `./${path.join(subDir, fileName).replace(/\\/g, '/')}`;
			importStatements.push(`import * as ${importVar} from '${relativePath}';`);
			entryLines.push(`...${importVar}`);
		}

		registryEntries.push(`  '${registryKey}': {\n    ${entryLines.join(',\n    ')}\n  }`);
	}

	return { importStatements, registryEntries };
}