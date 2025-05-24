import fs from 'fs';
import path from 'path';

export function ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

export function walkDirectory(
    rootDir: string,
    callback: (filePath: string, relativePath: string) => void,
    baseDir: string = rootDir, // 👈 passed down to preserve root for relativePath
    ext: string = '.json',
): void {
    const entries = fs.readdirSync(rootDir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(rootDir, entry.name);

        if (entry.isDirectory()) {
            walkDirectory(fullPath, callback, ext, baseDir);
        } else if (entry.isFile() && entry.name.endsWith(ext)) {
            const relativePath = path.relative(baseDir, fullPath);
            callback(fullPath, relativePath);
        }
    }
}