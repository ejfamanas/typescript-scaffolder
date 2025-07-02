import { Project } from 'ts-morph';
import fs from 'fs';
import { Endpoint, EndpointAuthConfig, EndpointClientConfigFile } from 'models/api-definitions';
import path from 'path'
import { ensureDir, readEndpointClientConfigFile, walkDirectory } from '../utils/file-system';
import { generateClientAction, generateInlineAuthHeader } from '../utils/client-constructors';
import { Logger } from '../utils/logger';

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

export function collectRequiredSchemas(endpoints: Endpoint[]): Set<string> {
	const requiredSchemas = new Set<string>();
	for (const endpoint of endpoints) {
		if (endpoint.requestSchema) {
			requiredSchemas.add(endpoint.requestSchema);
		}
		if (endpoint.responseSchema) {
			requiredSchemas.add(endpoint.responseSchema);
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

export function generateApiClientFunction(
	baseUrl: string,
	fileName: string,
	functionName: string,
	endpoint: Endpoint,
	config: EndpointAuthConfig,
	interfaceInputDir: string,
	clientOutputDir: string,
	writeMode: 'overwrite' | 'append' = 'overwrite',
) {
	const funcName = 'generateApiClientFunction';
	Logger.debug(funcName, 'Generating api client function...');
	const project = new Project();

	ensureDir(clientOutputDir);

	const outputFilePath = path.join(clientOutputDir, `${fileName}.ts`);
	let sourceFile;
	const fileExists = fs.existsSync(outputFilePath);

	if (writeMode === 'append' && fileExists) {
		sourceFile = project.addSourceFileAtPath(outputFilePath);
	} else {
		sourceFile = project.createSourceFile(outputFilePath, '', {
			overwrite: writeMode === 'overwrite',
		});
	}

	const method = endpoint.method.toLowerCase();
	const hasBody = determineHasBody(method);
	const requestSchema = endpoint.requestSchema;
	const responseSchema = endpoint.responseSchema;
	const pathParams = endpoint.pathParams ?? [];

	const urlPath = constructUrlPath(endpoint);

	// Imports
	addRequiredImports(sourceFile, outputFilePath, interfaceInputDir, requestSchema, responseSchema!, hasBody);

	// Function parameters
	const parameters = [
		...pathParams.map((param) => ({ name: param, type: 'string' })),
		...(hasBody && requestSchema ? [{ name: 'body', type: requestSchema }] : []),
		{ name: 'headers', hasQuestionToken: true, type: 'Record<string, string>' },
	];

	if (
		writeMode === 'append' &&
		sourceFile.getFunction(functionName)
	) {
		Logger.info(funcName,`Function "${functionName}" already exists in ${fileName}.ts — skipping.`);
		return;
	}

	// Function
	sourceFile.addFunction({
		isExported: true,
		name: functionName,
		parameters,
		returnType: `Promise<${responseSchema}>`,
		isAsync: true,
		statements: `
      const authHeaders = ${generateInlineAuthHeader(config.authType, config.credentials)};
      const response = await axios.${method}(
        \`${baseUrl}${urlPath}\`,
        ${hasBody ? 'body,' : ''}
        {
          headers: {
            ...authHeaders,
            ...headers,
          },
        } as AxiosRequestConfig
      );
      return response.data;
    `,
	});

	// Save to disk
	sourceFile.saveSync();
}

/**
 * Generates a grouped API client file from a client endpoint config file.
 *
 * Assumes each endpoint includes a `modelName` (e.g., "person") used for
 * determining both the function name and output file name.
 *
 * @param configPath - Path to the EndpointClientConfigFile JSON
 * @param interfacesDir - Path to where the interfaces are stored
 * @param outputDir - Output directory
 */
export async function generateApiClientFromFile(configPath: string, interfacesDir: string, outputDir: string) {
	const funcName = 'generateApiClientFromFile'
	const config: EndpointClientConfigFile | null = readEndpointClientConfigFile(configPath);
	if (!config) {
		return;
	}

	for (const endpoint of config.endpoints) {
		const {objectName} = endpoint;
		if (!objectName) {
			Logger.warn(funcName,'Missing modelName in endpoint:', endpoint);
			continue;
		}
		const {functionName, fileName} = generateClientAction(endpoint);

		generateApiClientFunction(
			config.baseUrl,
			fileName,
			functionName,
			endpoint,
			{
				authType: config.authType,
				credentials: config.credentials,
			},
			interfacesDir,
			outputDir,
			'append'
		);
	}
}

/**
 * Takes in a config directory, a directory of interfaces, and output directories and scaffolds out
 * all API clients based on the config and interfaces available
 * @param configDir
 * @param interfacesRootDir
 * @param outputRootDir
 */
export async function generateApiClientsFromPath(
	configDir: string,
	interfacesRootDir: string,
	outputRootDir: string
) {
	const funcName = 'generateApiClientsFromPath'
	Logger.debug(funcName, 'Starting API client generation from config and interface directories...');

	const configFiles = fs
		.readdirSync(configDir)
		.filter((file) => file.endsWith('.json'))
		.map((file) => path.join(configDir, file));

	// Map from interface name (without extension) to array of directories where found
	const interfaceNameToDirs: Map<string, Set<string>> = new Map();

	// Walk interfacesRootDir and cache directories by interface filename (without .ts)
	walkDirectory(
		interfacesRootDir,
		(interfacePath: string) => {
			const dir = path.dirname(interfacePath);
			const baseName = path.basename(interfacePath, '.ts');
			if (!interfaceNameToDirs.has(baseName)) {
				interfaceNameToDirs.set(baseName, new Set());
			}
			interfaceNameToDirs.get(baseName)!.add(dir);
		},
		'.ts'
	);

	for (const configPath of configFiles) {
		const config: EndpointClientConfigFile | null = readEndpointClientConfigFile(configPath);
		if (!config) {
			continue;
		}

		// Collect all unique schemas used in this config's endpoints
		const requiredSchemas = collectRequiredSchemas(config.endpoints);

		// Find a directory that contains all required schemas
		const foundDir = findDirectoryContainingAllSchemas(requiredSchemas, interfaceNameToDirs, configPath, funcName);

		if (!foundDir) {
			Logger.warn(funcName,`Could not find a directory containing all schemas for config: ${configPath}`);
			continue;
		}

		// Compute relative path of foundDir to interfacesRootDir to preserve structure in outputRootDir
		const relativeInterfaceDir = path.relative(interfacesRootDir, foundDir);
		const outputDir = path.join(outputRootDir, relativeInterfaceDir);
		ensureDir(outputDir);

		await generateApiClientFromFile(configPath, foundDir, outputDir);
	}

	Logger.info(funcName, 'API client generation completed.');
}