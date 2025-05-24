import {ensureDir, walkDirectory} from "./src/utils/file-system";
import {processSchemaFile} from "./src/generate-interfaces";
import path from "path";

const SCHEMAS_DIR = path.resolve(__dirname, 'schemas');
const OUTPUT_DIR = path.resolve(__dirname, 'codegen/interfaces');

function main(): void {
    ensureDir(OUTPUT_DIR);
    walkDirectory(SCHEMAS_DIR, (filePath, relativePath) =>
        processSchemaFile(filePath, relativePath, OUTPUT_DIR)
    );
}

main();