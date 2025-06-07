import path from "path";
import { generateEnvLoader, generateInterfacesFromPath, scaffoldMockServer } from "./src";

const ROOT_DIR = process.cwd();                // Base dir where the script is run
const LOCAL_DIR = __dirname;                   // Base dir where this file lives

// Interface generation config
const SCHEMA_INPUT_DIR    = path.resolve(LOCAL_DIR, 'schemas');
const INTERFACE_OUTPUT_DIR= path.resolve(LOCAL_DIR, 'codegen/interfaces');

// Env accessor config
const ENV_FILE            = path.resolve(ROOT_DIR, '.env');
const ENV_OUTPUT_DIR      = path.resolve(ROOT_DIR, 'codegen/config');
const ENV_OUTPUT_FILE            = 'env-config.ts';

async function main(): Promise<void> {
    // using the interface generator (BETA)
    await generateInterfacesFromPath(SCHEMA_INPUT_DIR, INTERFACE_OUTPUT_DIR);

    // using the env accessor (BETA)
    await generateEnvLoader(ENV_FILE, ENV_OUTPUT_DIR, ENV_OUTPUT_FILE);

    // using the mock server scaffolder (ALPHA)
    await scaffoldMockServer(SCHEMA_INPUT_DIR);

}

main();