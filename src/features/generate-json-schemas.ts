import path from "path";
import { convertToJsonSchema } from "../utils/ts-to-json-schema-mapper";
import { ensureDir, walkDirectory } from "../utils/file-system";
import { extractInterfacesFromFile, ParsedInterface } from "../utils/interface-parser";
import { Logger } from "../utils/logger";
import fs from "fs";

export function generateJsonSchemaFromInterface(interfaces: ParsedInterface[]): any {
    if (interfaces.length === 0) return {};

    const root = convertToJsonSchema(interfaces[0], interfaces);

    interfaces.slice(1).forEach(i => {
        root.definitions[i.name] = convertToJsonSchema(i, interfaces);
    });

    return root;
}

/**
 * Generates a JSON schema from a TypeScript file and writes it to the output directory.
 * @param filePath
 * @param relativePath
 * @param outputBaseDir
 */
export async function generateJsonSchemaFromFile(
    filePath: string,
    relativePath: string,
    outputBaseDir: string
): Promise<void> {
    const funcName = "generateJsonSchemas";
    Logger.debug(funcName, "Generating JSON schema...");
    const outputDir = path.join(outputBaseDir, path.dirname(relativePath));
    const outFile = path.join(outputDir, path.basename(filePath, '.ts') + '.schema.json');
    ensureDir(outputDir);

    try {
        const interfaces = extractInterfacesFromFile(filePath);
        const schema = generateJsonSchemaFromInterface(interfaces);
        if (schema !== null) {
            fs.writeFileSync(outFile, JSON.stringify(schema, null, 2), 'utf-8');
            Logger.debug(funcName, `Generated: ${outFile}`);
        } else {
            Logger.warn(funcName, `Failed to generate schema from ${filePath}`);
        }
    } catch (error) {
        const err = `Critical error when trying to process ${filePath}, ${error}`;
        Logger.error(funcName, err);
        throw new Error(err);
    }
}

/**
 * Walks a directory tree, generating JSON schemas from TypeScript files and writing them out.
 * @param tsSourceDir
 * @param outputBaseDir
 * @param ext
 */
export async function generateJsonSchemasFromPath(
    tsSourceDir: string,
    outputBaseDir: string,
    ext: string = ".ts"
): Promise<void> {
    const funcName = "generateJsonSchemas";
    Logger.debug(funcName, `Walking directory for interfaces: ${tsSourceDir}`);
    ensureDir(outputBaseDir);

    const tasks: Promise<void>[] = [];

    walkDirectory(
        tsSourceDir,
        (filePath: string, relativePath: string) => {
            const task = generateJsonSchemaFromFile(filePath, relativePath, outputBaseDir);
            tasks.push(task);
        },
        ext
    );

    await Promise.all(tasks);
}