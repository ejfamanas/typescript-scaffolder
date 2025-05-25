import {ensureDir} from "./utils/file-system";
import {inferSchemaFromPath} from "./utils/infer-schema-from-json";
import fs from "fs";
import path from "node:path";
import {Logger} from "./utils/logger";

/**
 * processes the JSON files and generates typescript interfaces using the same folder structure
 * @param filePath
 * @param relativePath
 * @param outputBaseDir
 */
export function generateTypedInterfaces(filePath: string, relativePath: string, outputBaseDir: string): void {
    const funcName = 'generateTypedInterfaces';
    Logger.debug(funcName, "Generating typed interfaces...")
    const outputDir = path.join(outputBaseDir, path.dirname(relativePath));
    ensureDir(outputDir);

    const outFile = path.join(outputDir, path.basename(filePath, '.json') + '.ts');

    inferSchemaFromPath(filePath)
        .then((tsInterface: string | null) => {
            if (tsInterface !== null) {
                fs.writeFileSync(outFile, tsInterface, 'utf-8');
                const inf = `Generated: ${outFile}`
                Logger.info(funcName, inf);
            } else {
                const err = `Failed to generate interface from ${filePath}`
                Logger.warn(funcName, err);
            }
        })
        .catch((error: Error) => {
            const err = `Critical error when trying to process ${filePath}, ${error}`
            Logger.error(funcName, err);
            throw new Error(err)
        });
}