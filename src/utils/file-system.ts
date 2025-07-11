import fs from 'fs';
import path from 'path';
import { Logger } from "./logger";
import { EndpointClientConfigFile } from 'models/api-definitions';
import { WebhookConfigFile } from 'models/webhook-definitions';

/**
 * Ensures the directory exists; creates it recursively if it doesn't.
 * @param dirPath - Absolute or relative path to the directory
 */
export function ensureDir(dirPath: string): void {
    const funcName = 'ensureDir';
    Logger.debug(funcName, 'testing if directory exists...')
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, {recursive: true});
    }
}

/**
 * Recursively walks a directory tree and applies a callback to each file that matches the extension.
 * @param rootDir - The current directory being walked
 * @param callback - Function to call with the full file path and relative path
 * @param baseDir - The base directory used to calculate relative paths (defaults to rootDir)
 * @param ext - File extension to match
 */
export function walkDirectory(
    rootDir: string,
    callback: (filePath: string, relativePath: string) => void,
    ext: string,
    baseDir: string = rootDir,
): void {
    const funcName = 'walkDirectory';
    Logger.debug(funcName, 'Walking file directory...')
    const entries = fs.readdirSync(rootDir, {withFileTypes: true});
    for (const entry of entries) {
        const fullPath = path.join(rootDir, entry.name);
        if (entry.isDirectory()) {

            // keep going if it is a file directory
            Logger.debug(funcName, 'Found file directory...')
            walkDirectory(fullPath, callback, ext, baseDir);
        } else if (entry.isFile() && entry.name.endsWith(ext)) {

            // if it's a file, run the callback against the whole directory
            Logger.debug(funcName, 'Invoking callback in directory...')
            const relativePath = path.relative(baseDir, fullPath);
            callback(fullPath, relativePath);
        }
    }
}

export function readEndpointClientConfigFile(configPath: string): EndpointClientConfigFile | null {
    const funcName = 'readEndpointClientConfigFile';
    Logger.debug(funcName, `Reading config file from ${configPath}`);
    if (!fs.existsSync(configPath)) {
        Logger.error(funcName, `Config file not found at path: ${configPath}`);
        return null;
    }
    const fileContent = fs.readFileSync(configPath, 'utf-8');
    try {
        const parsed: unknown = JSON.parse(fileContent);

        // Basic shape check (could later add Zod/Yup validation)
        if (
            typeof parsed === 'object' &&
            parsed !== null &&
            'baseUrl' in parsed &&
            'endpoints' in parsed &&
            Array.isArray((parsed as any).endpoints)
        ) {
            return parsed as EndpointClientConfigFile;
        } else {
            Logger.error(funcName, 'Invalid structure in EndpointClientConfigFile');
        }
    } catch (err) {
        Logger.error(funcName, 'Failed to parse config JSON', err);
    }
    return null;
}

export function readWebhookConfigFile(configPath: string): WebhookConfigFile | null {
    const funcName = 'readWebhookConfigFile';
    Logger.debug(funcName, `Reading webhook config file from ${configPath}`);
    if (!fs.existsSync(configPath)) {
        Logger.error(funcName, `Webhook config file not found at path: ${configPath}`);
        return null;
    }
    const fileContent = fs.readFileSync(configPath, 'utf-8');
    try {
        const parsed: unknown = JSON.parse(fileContent);

        if (
            typeof parsed === 'object' &&
            parsed !== null &&
            'webhooks' in parsed &&
            Array.isArray((parsed as any).webhooks)
        ) {
            return parsed as WebhookConfigFile;
        } else {
            Logger.error(funcName, 'Invalid structure in WebhookConfigFile');
        }
    } catch (err) {
        Logger.error(funcName, 'Failed to parse webhook config JSON', err);
    }
    return null;
}

export function extractInterfaces(configDir: string, interfacesRootDir: string) {
    const configFiles = fs
        .readdirSync(configDir)
        .filter((file) => file.endsWith('.json'))
        .map((file) => path.join(configDir, file));

    const interfaceNameToDirs: Map<string, Set<string>> = new Map();

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
    return {configFiles, interfaceNameToDirs};
}