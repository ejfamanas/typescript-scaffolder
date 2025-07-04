import { Project } from 'ts-morph';
import fs from 'fs';
import {Endpoint, EndpointAuthConfig, EndpointClientConfigFile, SchemaConsumer} from 'models/api-definitions';
import path from 'path'
import { ensureDir, extractInterfaces, readEndpointClientConfigFile, walkDirectory } from '../utils/file-system';
import {
	addRequiredImports, collectRequiredSchemas,
	constructUrlPath, determineHasBody, findDirectoryContainingAllSchemas,
	generateClientAction,
	generateInlineAuthHeader
} from '../utils/client-constructors';
import { Logger } from '../utils/logger';

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

	const {configFiles, interfaceNameToDirs} = extractInterfaces(configDir, interfacesRootDir);

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