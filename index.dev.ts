import path from "path";
import {generateInterfacesFromPath} from "./src/features/generate-interfaces";
import {ensureDir} from "./src/utils/file-system";

const SCHEMAS_DIR = path.resolve(__dirname, 'schemas');
const OUTPUT_DIR = path.resolve(__dirname, 'codegen/interfaces');

function main(): void {
    ensureDir(OUTPUT_DIR);
    generateInterfacesFromPath(SCHEMAS_DIR, OUTPUT_DIR)
}

main();