import { Project } from 'ts-morph';
import fs from 'fs';
import { Endpoint, EndpointAuthConfig, EndpointClientConfigFile } from '../models/api-definitions';
import path from 'path'
import { ensureDir, readEndpointClientConfigFile } from '../utils/file-system';
import { deriveFunctionName, generateInlineAuthHeader } from '../utils/client-constructors';
import dotenv from 'dotenv';
import { Logger } from '../utils/logger';

dotenv.config();
const CODEGEN_DIR_ROOT = process.env.CODEGEN_DIR_ROOT || 'codegen';
const CLIENT_APIS_DIR_ROOT = process.env.CLIENT_APIS_DIR_ROOT || 'apis';
const INTERFACES_ROOT = process.env.INTERFACES_ROOT || 'interfaces'

export function generateApiClientFunction(
	baseUrl: string,
	fileName: string,
	functionName: string,
	endpoint: Endpoint,
	config: EndpointAuthConfig,
	inputSubDirectory: string = "",
	outputSubDirectory: string = inputSubDirectory,
	writeMode: 'overwrite' | 'append' = 'overwrite',
) {
	const funcName = 'generateApiClientFunction';
	Logger.debug(funcName, 'Generating api client function...');
	const project = new Project();

	const clientDir = path.join(process.cwd(), CODEGEN_DIR_ROOT, CLIENT_APIS_DIR_ROOT, outputSubDirectory);
	ensureDir(clientDir);

	const outputFilePath = path.join(clientDir, `${fileName}.ts`);
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
	const hasBody = ['post', 'put'].includes(method);
	const requestSchema = endpoint.requestSchema;
	const responseSchema = endpoint.responseSchema;
	const pathParams = endpoint.pathParams ?? [];

	const urlPath = pathParams.reduce((p, param) => p.replace(`{${param}}`, `\$\{${param}\}`), endpoint.path);
	const IFACE_DIR = path.join(process.cwd(), CODEGEN_DIR_ROOT, INTERFACES_ROOT, inputSubDirectory)

	// Imports
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
			.relative(path.dirname(outputFilePath), path.join(IFACE_DIR, requestSchema))
			.replace(/\\/g, '/')
			.replace(/\.ts$/, '');
		addImportIfMissing(requestPath, requestSchema);
	}

	const responsePath = path
		.relative(path.dirname(outputFilePath), path.join(IFACE_DIR, responseSchema))
		.replace(/\\/g, '/')
		.replace(/\.ts$/, '');
	addImportIfMissing(responsePath, responseSchema);

	addImportIfMissing('axios', 'axios', true);

	// Function parameters
	const parameters = [
		...pathParams.map((param) => ({name: param, type: 'string'})),
		...(hasBody && requestSchema ? [{name: 'body', type: requestSchema}] : []),
		{name: 'headers', hasQuestionToken: true, type: 'Record<string, string>'},
	];

	if (
		writeMode === 'append' &&
		sourceFile.getFunction(functionName)
	) {
		console.warn(`Function "${functionName}" already exists in ${fileName}.ts — skipping.`);
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
        }
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
 * @param subDirectory - if your files are stored in a subdirectory below the main folder
 */
export async function generateApiClientsFromFile(configPath: string, subDirectory: string = "") {
	const config: EndpointClientConfigFile | null = readEndpointClientConfigFile(configPath);
	if (!config) {
		return;
	}
	for (const endpoint of config.endpoints) {
		const {objectName} = endpoint;
		if (!objectName) {
			console.warn('Missing modelName in endpoint:', endpoint);
			continue;
		}
		const action =
			endpoint.method === 'GET' && endpoint.pathParams?.length
				? 'GET'
				: endpoint.method === 'GET'
					? 'GET_ALL'
					: endpoint.method.toUpperCase();

		const functionName = `${action}_${objectName}`;
		const fileName = `${objectName}_api`;

		generateApiClientFunction(
			config.baseUrl,
			fileName,
			functionName,
			endpoint,
			{
				authType: config.authType,
				credentials: config.credentials,
			},
			subDirectory, // inputSubDirectory
			subDirectory, // outputSubDirectory
			'append'
		);
	}
}