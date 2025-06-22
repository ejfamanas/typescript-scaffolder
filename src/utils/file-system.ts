import fs from 'fs';
import path from 'path';
import {Logger} from "./logger";
import { EndpointClientConfigFile } from '../models/api-definitions';

/**
 * Ensures the directory exists; creates it recursively if it doesn't.
 * @param dirPath - Absolute or relative path to the directory
 */
export function ensureDir(dirPath: string): void {
    const funcName = 'ensureDir';
    Logger.debug(funcName, 'testing if directory exists...')
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

/**
 * Recursively walks a directory tree and applies a callback to each file that matches the extension.
 * @param rootDir - The current directory being walked
 * @param callback - Function to call with the full file path and relative path
 * @param baseDir - The base directory used to calculate relative paths (defaults to rootDir)
 * @param ext - File extension to match (default is '.json')
 */
export function walkDirectory(
    rootDir: string,
    callback: (filePath: string, relativePath: string) => void,
    ext: string,
    // TODO: this line is escaping test coverage because of the callback
    baseDir: string = rootDir,
): void {
    const funcName = 'walkDirectory';
    Logger.debug(funcName, 'Walking file directory...')
    const entries = fs.readdirSync(rootDir, { withFileTypes: true });
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
        Logger.error(funcName,`Config file not found at path: ${configPath}`);
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