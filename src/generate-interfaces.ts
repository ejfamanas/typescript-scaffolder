import {ensureDir} from "./utils/file-system";
import {inferSchemaFromPath} from "./utils/infer-schema-from-json";
import fs from "fs";
import path from "node:path";

/**
 * processes the JSON files and generates typescript interfaces using the same folder structure
 * @param filePath
 * @param relativePath
 * @param outputBaseDir
 */
export function generateTypedInterfaces(filePath: string, relativePath: string, outputBaseDir: string): void {
    const outputDir = path.join(outputBaseDir, path.dirname(relativePath));
    ensureDir(outputDir);

    const outFile = path.join(outputDir, path.basename(filePath, '.json') + '.ts');

    inferSchemaFromPath(filePath)
        .then(tsInterface => {
            fs.writeFileSync(outFile, tsInterface, 'utf-8');
            console.log(`✅ Generated: ${outFile}`);
        })
        .catch(err => {
            console.error(`❌ Failed to process ${filePath}`, err);
        });
}