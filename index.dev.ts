import path from "path";
import {generateEnumsFromPath, generateEnvLoader, generateInterfacesFromPath, scaffoldMockServer} from "./src";

const ROOT_DIR = process.cwd();                // Base dir where the script is run
const LOCAL_DIR = __dirname;                   // Base dir where this file lives

// Interface generation config
const SCHEMA_INPUT_DIR = path.resolve(LOCAL_DIR, 'schemas');
const INTERFACE_OUTPUT_DIR = path.resolve(LOCAL_DIR, 'codegen/interfaces');

// Generate enums, this will use the previously generated interface output
const ENUM_OUTPUT_DIR = path.resolve(LOCAL_DIR, 'codegen/enums');

// Env accessor config
const ENV_FILE = path.resolve(ROOT_DIR, '.env');
const ENV_OUTPUT_DIR = path.resolve(LOCAL_DIR, 'codegen/config');
const ENV_OUTPUT_FILE = 'env-config.ts';

async function build() {
    // using the env accessor (BETA)
    // this is a sync function, and should be run first anyway
    generateEnvLoader(ENV_FILE, ENV_OUTPUT_DIR, ENV_OUTPUT_FILE);

    // using the interface generator (BETA)
    await generateInterfacesFromPath(SCHEMA_INPUT_DIR, INTERFACE_OUTPUT_DIR)

    // use the enum generator from the output of the interface generator (BETA)
    await generateEnumsFromPath(INTERFACE_OUTPUT_DIR, ENUM_OUTPUT_DIR);

    // using the mock server scaffolder (ALPHA)
    await scaffoldMockServer(SCHEMA_INPUT_DIR);
}

build();