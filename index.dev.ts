import path from "path";
import {generateInterfacesFromPath} from "./src/features/generate-interfaces";
import {ensureDir} from "./src/utils/file-system";
import {scaffoldMockServer} from "./src/features/scaffold-mock-server";

const SCHEMAS_DIR = path.resolve(__dirname, 'schemas');
const OUTPUT_DIR = path.resolve(__dirname, 'codegen/interfaces');

async function main(): Promise<void> {
    await ensureDir(OUTPUT_DIR);
    await generateInterfacesFromPath(SCHEMAS_DIR, OUTPUT_DIR)
    await scaffoldMockServer(SCHEMAS_DIR)
}

main();