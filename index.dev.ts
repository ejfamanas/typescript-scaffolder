import path from "path";
import { ensureDir } from "./src/utils/file-system";
import { generateEnvLoader, generateInterfacesFromPath, scaffoldMockServer } from "./src";

const ROOT_DIR = process.cwd();                // Base dir where the script is run
const LOCAL_DIR = __dirname;                   // Base dir where this file lives

const ENV_FILE     = path.resolve(ROOT_DIR, '.env');
const OUTPUT_PATH  = path.resolve(ROOT_DIR, 'codegen/config');
const SCHEMAS_DIR  = path.resolve(LOCAL_DIR, 'schemas');
const INTERFACE_DIR   = path.resolve(LOCAL_DIR, 'codegen/interfaces');
const OUTPUT_FILE  = 'env-config.ts';

async function main(): Promise<void> {
    await generateInterfacesFromPath(SCHEMAS_DIR, INTERFACE_DIR);
    await scaffoldMockServer(SCHEMAS_DIR);
    try {
        await generateEnvLoader(ENV_FILE, OUTPUT_PATH, 'env-config.ts');
    } catch (err) {
        console.error("Failed to generate env loader:", OUTPUT_FILE);
    }}

main();