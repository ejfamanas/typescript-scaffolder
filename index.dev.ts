import path from "path";
import {generateFoldersAndTypedInterfaces} from "./src/features/generate-interfaces";
import {ensureDir} from "./src/utils/file-system";

const SCHEMAS_DIR = path.resolve(__dirname, 'schemas');
const OUTPUT_DIR = path.resolve(__dirname, 'codegen/interfaces');

function main(): void {
    ensureDir(OUTPUT_DIR);
    generateFoldersAndTypedInterfaces(SCHEMAS_DIR, OUTPUT_DIR)
}

main();