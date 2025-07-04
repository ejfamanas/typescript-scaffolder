import * as path from 'path';
import * as fs from 'fs';
import { Logger } from "../utils/logger";
import { walkDirectory } from "../utils/file-system";

/**
 * Creates a registry of webhook functions within a file that can be used at runtime.
 * This function will produce an object in the following shape,
 * where the field name equals the folder name where the webhook files are located
 *
 * Example:
 * export const webhookRegistry = {
 *   'source-charlie': {
 *     ...handle_payment_webhook
 *   },
 *   'source-delta': {
 *     ...send_notification_webhook
 *   }
 * };
 *
 * @param webhookRootDir - the parent directory where the webhook files are located. Will go into child directories
 * @param registryFileName - the name of the registry file
 */
export async function generateWebhookRegistry(webhookRootDir: string, registryFileName = 'registry.ts') {
    const funcName = 'generateWebhookRegistry';
    Logger.debug(funcName, 'Generating webhook registry...');
    const importMap = new Map<string, string[]>(); // Map<subdirectory, filePaths>

    walkDirectory(webhookRootDir, (filePath) => {
        if (filePath.endsWith('.ts') && !filePath.endsWith(registryFileName)) {
            const subDir = path.relative(webhookRootDir, path.dirname(filePath));
            const files = importMap.get(subDir) || [];
            files.push(filePath);
            importMap.set(subDir, files);
        }
    }, '.ts');

    if (importMap.size === 0) {
        Logger.warn(funcName, 'No webhook files found. Registry will not be generated.');
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

export const webhookRegistry = {
${registryEntries.join(',\n')}
};
`;

    const registryPath = path.join(webhookRootDir, registryFileName);
    fs.writeFileSync(registryPath, output, 'utf8');
}

/**
 * Dynamically retrieves a webhook function from the generated registry.
 *
 * @param webhookRegistry - A nested record of namespace -> function name -> webhook function.
 * @param service - The top-level key representing a group of webhook handlers (e.g. a source system).
 * @param functionName - The exported name of the function within the selected service.
 * @returns The referenced webhook function.
 * @throws If the function or service cannot be found in the registry.
 */
export function getWebhookFunction(
    webhookRegistry: Record<string, Record<string, (...args: any[]) => Promise<any>>>,
    service: string,
    functionName: string
): (...args: any[]) => Promise<any> {
    const funcName = 'getWebhookFunction';
    Logger.debug(funcName, 'Fetching webhook function...');
    const serviceRegistry = webhookRegistry?.[service];
    if (!serviceRegistry) {
        Logger.warn(funcName, 'No service registry found.');
    }

    const fn = serviceRegistry?.[functionName];
    if (!fn || typeof fn !== 'function') {
        const msg = `Function "${functionName}" not found in service "${service}".`
        Logger.error(funcName, msg);
        throw new Error(msg);
    }

    return fn;
}