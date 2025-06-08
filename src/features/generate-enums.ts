import { walkDirectory, ensureDir } from '../utils/file-system';
import fs from 'fs';
import path from 'node:path';
import { Logger } from '../utils/logger';
import { Project, InterfaceDeclaration } from 'ts-morph';

/**
 * Extracts interface names and keys from a TypeScript file using ts-morph.
 */
export function extractInterfaceKeysFromFile(filePath: string): { name: string; keys: string[] }[] {
    const funcName = 'extractInterfaceKeysFromFile';
    Logger.debug(funcName, `Parsing interfaces from: ${filePath}`);

    const project = new Project();
    const sourceFile = project.addSourceFileAtPath(filePath);
    const interfaces: { name: string; keys: string[] }[] = [];

    sourceFile.getInterfaces().forEach((iface: InterfaceDeclaration) => {
        const name = iface.getName();
        const keys = iface.getProperties().map(prop => prop.getName());
        interfaces.push({ name, keys });
    });

    return interfaces;
}

/**
 * Generates TypeScript enum string from interface key names.
 */
export function generateEnum(name: string, keys: string[]): string {
    const enumName = `${name}Keys`;
    const body = keys
        .map(k => `  ${isValidIdentifier(k) ? k : `"${k}"`} = "${k}"`)
        .join(',\n');
    return `export enum ${enumName} {\n${body}\n}\n`;
}
/**
 * Tests to make sure the identifier is a valid string using regex
 * @param str
 */
export function isValidIdentifier(str: string): boolean {
    return /^[a-zA-Z_$][a-zA-Z_$0-9]*$/.test(str);
}

/**
 * Processes a single file and writes enums for interfaces. Keeping async for now
 * To resolve race condition issues on the thread
 */
export async function generateEnums(filePath: string, relativePath: string, outputBaseDir: string) {
    const funcName = 'generateEnums';
    Logger.debug(funcName, `Generating enums for ${filePath}`);
    const outputDir = path.join(outputBaseDir, path.dirname(relativePath));
    ensureDir(outputDir);

    const parsed = extractInterfaceKeysFromFile(filePath);

    if (parsed.length === 0) {
        Logger.warn(funcName, `No interfaces found in ${filePath}`);
        return;
    }

    const enumsContent = parsed.map(i => generateEnum(i.name, i.keys)).join('\n');
    const outPath = path.join(outputDir, path.basename(filePath, '.ts') + '.enums.ts');
    fs.writeFileSync(outPath, enumsContent, 'utf-8');

    Logger.info(funcName, `Generated: ${outPath}`);
}

/**
 * Parses a file structure housing interfaces and regenerates the directory tree with enums.
 * Only does TypeScript Interfaces for now. This needs to be async for proper chaining as the previous
 * Executions should save first
 * @param schemaDir
 * @param outputDir
 * @param ext
 */
export async function generateEnumsFromPath(schemaDir: string, outputDir: string, ext: string = '.ts') {
    const funcName = 'generateEnumsFromPath';
    Logger.debug(funcName, `Walking directory for enums: ${schemaDir}`);
    ensureDir(outputDir);

    const tasks: Promise<void>[] = [];

    walkDirectory(
        schemaDir,
        (filePath: string, relativePath: string) => {
            // Wrap in Promise.resolve in case generateEnums becomes async later
            const result = Promise.resolve(generateEnums(filePath, relativePath, outputDir));
            tasks.push(result);
        },
        ext
    );

    await Promise.all(tasks);
}