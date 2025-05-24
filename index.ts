import {ensureDir, walkDirectory} from "./src/utils/file-system";
import {generateTypedInterfaces} from "./src/generate-interfaces";
import path from "path";

const SCHEMAS_DIR = path.resolve(__dirname, 'schemas');
const OUTPUT_DIR = path.resolve(__dirname, 'codegen/interfaces');

function main(): void {
    ensureDir(OUTPUT_DIR);
    walkDirectory(SCHEMAS_DIR, (filePath, relativePath) =>
        generateTypedInterfaces(filePath, relativePath, OUTPUT_DIR)
    );
}

main();