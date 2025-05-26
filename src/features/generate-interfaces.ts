import {ensureDir, walkDirectory} from "../utils/file-system";
import {inferSchemaFromPath} from "../utils/infer-schema-from-json";
import fs from "fs";
import path from "node:path";
import {Logger} from "../utils/logger";

/**
 * processes the JSON files and generates typescript interfaces using the same folder structure
 * @param filePath
 * @param relativePath
 * @param outputBaseDir
 */
export function generateInterfaces(filePath: string, relativePath: string, outputBaseDir: string): Promise<void> {
    const funcName = 'generateTypedInterfaces';
    Logger.debug(funcName, "Generating typed interfaces...");
    const outputDir = path.join(outputBaseDir, path.dirname(relativePath));
    ensureDir(outputDir);

    const outFile = path.join(outputDir, path.basename(filePath, '.json') + '.ts');

    return inferSchemaFromPath(filePath)
        .then((tsInterface: string | null) => {
            if (tsInterface !== null) {
                fs.writeFileSync(outFile, tsInterface, 'utf-8');
                Logger.info(funcName, `Generated: ${outFile}`);
            } else {
                Logger.warn(funcName, `Failed to generate interface from ${filePath}`);
            }
        })
        .catch((error) => {
            const err = `Critical error when trying to process ${filePath}, ${error}`;
            Logger.error(funcName, err);
            throw new Error(err);
        });
}

/**
 * Parses a file structure housing JSON schemas and regenerates the directory tree with interfaces
 * @param schemaDir
 * @param outputDir
 */
export function generateInterfacesFromPath(schemaDir: string, outputDir: string) {
    walkDirectory(schemaDir, (filePath: string, relativePath: string) =>
        // TODO: this line is escaping test coverage
        generateInterfaces(filePath, relativePath, outputDir)
    );
}