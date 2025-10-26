import { Project } from 'ts-morph';
import fs from 'fs';
import { Endpoint, EndpointAuthConfig, EndpointClientConfigFile } from 'models/api-definitions';
import path from 'path'
import { ensureDir, extractInterfaces, readEndpointClientConfigFile } from '../../utils/file-system';
import {
    addClientRequiredImports,
    assertDirectoryContainingAllSchemas,
    collectRequiredSchemas,
    constructUrlPath,
    determineHasBody,
    generateClientAction,
} from '../../utils/client-constructors';
import { Logger } from '../../utils/logger';
import { buildRetryWrapperName } from "../../utils/retry-constructors";
import { RetryEndpointMeta } from "models/retry-definitions";
import { generateRetryHelperForApiFile } from "./generate-retry-helper";
import { generateAuthHelperForApiFile } from "./generate-auth-helper";

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

    const useRetry = !!(config as any)?.retry?.enabled;

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
    addClientRequiredImports(sourceFile, outputFilePath, interfaceInputDir, requestSchema, responseSchema!, hasBody);

    if (config.authType && config.authType !== "none") {
        const authHelperModule = `./${fileName}.authHelper`;
        const existingAuthImport = sourceFile.getImportDeclarations().find(d => d.getModuleSpecifierValue() === authHelperModule);
        if (!existingAuthImport) {
            sourceFile.addImportDeclaration({
                namedImports: [{ name: "getAuthHeaders" }],
                moduleSpecifier: authHelperModule,
            });
        }
    }

    if (useRetry) {
        const helperModule = `./${fileName}.requestWithRetry`;
        const wrapperSymbol = buildRetryWrapperName(functionName);
        // add import if missing
        const existing = sourceFile.getImportDeclarations().find(d => d.getModuleSpecifierValue() === helperModule);
        if (!existing) {
            sourceFile.addImportDeclaration({
                namedImports: [{name: wrapperSymbol}],
                moduleSpecifier: helperModule,
            });
        } else if (!existing.getNamedImports().some(n => n.getName() === wrapperSymbol)) {
            existing.addNamedImports([{name: wrapperSymbol}]);
        }
    }

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
        Logger.info(funcName, `Function "${functionName}" already exists in ${fileName}.ts — skipping.`);
        return;
    }

    // Function
    sourceFile.addFunction({
        isExported: true,
        name: functionName,
        parameters,
        returnType: `Promise<${responseSchema}>`,
        isAsync: true,
        statements: useRetry ? `
      const authHeaders = ${config.authType && config.authType !== "none" ? "getAuthHeaders()" : "{}"};
      const response = await ${buildRetryWrapperName(functionName)}(
        () => axios.${method}(
          \`${baseUrl}${urlPath}\`,
          ${hasBody ? 'body,' : ''}
          {
            headers: {
              ...authHeaders,
              ...(headers ?? {}),
            },
          } as AxiosRequestConfig
        ),
        {
          enabled: true,
          maxAttempts: ${(config as any)?.retry?.maxAttempts ?? 3},
          initialDelayMs: ${(config as any)?.retry?.initialDelayMs ?? 250},
          multiplier: ${(config as any)?.retry?.multiplier ?? 2.0},
          method: "${endpoint.method.toUpperCase()}"
        }
      );
      return response.data;
    ` : `
      const authHeaders = ${config.authType && config.authType !== "none" ? "getAuthHeaders()" : "{}"};
      const response = await axios.${method}(
        \`${baseUrl}${urlPath}\`,
        ${hasBody ? 'body,' : ''}
        {
          headers: {
            ...authHeaders,
            ...(headers ?? {}),
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

    const metasByFile = new Map<string, RetryEndpointMeta[]>();

    for (const endpoint of config.endpoints) {
        const {objectName} = endpoint;
        if (!objectName) {
            Logger.warn(funcName, 'Missing modelName in endpoint:', endpoint);
            continue;
        }
        const {functionName, fileName} = generateClientAction(endpoint);

        // Build EndpointMeta for potential retry helper generation
        const responseType = endpoint.responseSchema!;
        // Compute module specifier RELATIVE TO the API output directory,
        // pointing to the actual interface file path, then strip ".ts".
        const responseFile = path.join(interfacesDir, `${responseType}.ts`);
        let responseModule = path.relative(outputDir, responseFile).replace(/\\/g, '/');
        if (!responseModule.startsWith('.')) {
            responseModule = './' + responseModule;
        }
        responseModule = responseModule.replace(/\.ts$/, '');
        const list = metasByFile.get(fileName) ?? [];
        list.push({functionName, responseType, responseModule});
        metasByFile.set(fileName, list);

        if (config.authType && config.authType !== "none") {
            await generateAuthHelperForApiFile(
                outputDir,
                fileName,
                config.authType,
                config.credentials
            );
        }

        generateApiClientFunction(
            config.baseUrl,
            fileName,
            functionName,
            endpoint,
            {
                authType: config.authType,
                credentials: config.credentials,
                retry: config.retry, // surfaced for useRetry
            } as any,
            interfacesDir,
            outputDir,
            'append'
        );
    }

    if (config.retry?.enabled) {
        for (const [fileBaseName, endpoints] of metasByFile.entries()) {
            generateRetryHelperForApiFile(outputDir, fileBaseName, endpoints, /* overwrite */ true);
        }
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
        const foundDir = assertDirectoryContainingAllSchemas(requiredSchemas, interfaceNameToDirs, configPath);

        if (!foundDir) {
            Logger.warn(funcName, `Could not find a directory containing all schemas for config: ${configPath}`);
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