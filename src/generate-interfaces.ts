import {ensureDir} from "./utils/file-system";
import {inferSchemaFromPath} from "./utils/infer-schema-from-json";
import fs from "fs";
import path from "node:path";

export function processSchemaFile(filePath: string, relativePath: string, outputBaseDir: string): void {
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