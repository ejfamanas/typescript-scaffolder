import * as path from 'path';
import * as fs from 'fs';
import { walkDirectory } from '../utils/file-system';
import { Logger } from '../utils/logger';

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

	const output = `${importStatements.join('\n')}

export const apiRegistry = {
${registryEntries.join(',\n')}
};
`;

	const registryPath = path.join(apiRootDir, registryFileName);
	fs.writeFileSync(registryPath, output, 'utf8');
}

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
