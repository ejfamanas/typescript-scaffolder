import * as path from 'path';
import * as fs from 'fs';
import { walkDirectory } from '../utils/file-system';
import { Logger } from '../utils/logger';
import { buildImportMapAndRegistryEntries } from "../utils/client-constructors";

/**
 * Creates a registry of functions within a file that can be used at runtime. This function will produce
 * an object in the following shape, where the field name equals the folder name where the api files are
 * located
 *
 * Example:
 * export const apiRegistry = {
 *   'source-charlie': {
 *     ...person_api
 *   },
 *   'source-delta': {
 *     ...user_api
 *   }
 * };
 *
 * @param apiRootDir - the parent directory where the Api files are located. Will go into child directories
 * @param registryFileName - the name of the registry file
 */
export async function generateApiRegistry(apiRootDir: string, registryFileName = 'registry.ts') {
	const funcName = 'generateApiRegistry';
	Logger.debug(funcName, 'Generating registry...');
	const importMap = new Map<string, string[]>(); // Map<subdirectory, filePaths>

	walkDirectory(apiRootDir, (filePath) => {
			if (filePath.endsWith('.ts') && !filePath.endsWith(registryFileName)) {
				const subDir = path.relative(apiRootDir, path.dirname(filePath));
				const files = importMap.get(subDir) || [];
				files.push(filePath);
				importMap.set(subDir, files);
			}
		}, '.ts'
	);

	if (importMap.size === 0) {
		Logger.warn(funcName, 'No API files found. Registry will not be generated.');
		return;
	}

	const { importStatements, registryEntries } = buildImportMapAndRegistryEntries(importMap);

	const output = `${importStatements.join('\n')}
export const apiRegistry = {
${registryEntries.join(',\n')}
};
`;

	const registryPath = path.join(apiRootDir, registryFileName);
	fs.writeFileSync(registryPath, output, 'utf8');
}


/**
 * Dynamically retrieves an API function from the generated registry.
 *
 * Note: The returned function's argument signature must be known by the caller.
 * This function does not enforce parameter validation or ordering.
 * It is the caller's responsibility to pass the correct arguments.
 *
 * @param apiRegistry - A nested record of service -> function name -> API function.
 * @param service - The top-level key representing a group of API clients (e.g. a namespace).
 * @param functionName - The exported name of the function within the selected service.
 * @returns The referenced API function.
 * @throws If the function or service cannot be found in the registry.
 */
export function getApiFunction(
	apiRegistry: Record<string, Record<string, (...args: any[]) => Promise<any>>>,
	service: string,
	functionName: string
): (...args: any[]) => Promise<any> {
	const funcName = 'getApiFunction';
	Logger.debug(funcName, 'Fetching api function...');
	const serviceRegistry = apiRegistry?.[service];
	if (!serviceRegistry) {
		Logger.warn(funcName, 'No service registry found.');
	}

	const fn = serviceRegistry?.[functionName];
	if (!fn || typeof fn !== 'function') {
		const msg = `Function "${functionName}" not found in service "${service}".`
		Logger.error(funcName, `Function "${functionName}" not found in service "${service}".`);
		throw new Error(msg);
	}

	return fn;
}
