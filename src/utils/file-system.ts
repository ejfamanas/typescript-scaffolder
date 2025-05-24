import fs from 'fs';
import path from 'path';

/**
 * Ensures the directory exists; creates it recursively if it doesn't.
 * @param dirPath - Absolute or relative path to the directory
 */
export function ensureDir(dirPath: string): void {
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
    baseDir: string = rootDir,
    ext: string = '.json',
): void {
    const entries = fs.readdirSync(rootDir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(rootDir, entry.name);

        if (entry.isDirectory()) {
            walkDirectory(fullPath, callback, baseDir, ext);
        } else if (entry.isFile() && entry.name.endsWith(ext)) {
            const relativePath = path.relative(baseDir, fullPath);
            callback(fullPath, relativePath);
        }
    }
}