import path from "path";
import {generateEnumsFromPath, generateEnvLoader, generateInterfacesFromPath} from "./src";
import { generateApiClientFunction, generateApiClientsFromFile } from './src/features/generate-api-client';
import { readEndpointClientConfigFile } from './src/utils/file-system';

const ROOT_DIR = process.cwd();                // Base dir where the script is run
const LOCAL_DIR = __dirname;                   // Base dir where this file lives

// Interface generation config
const SCHEMA_INPUT_DIR = path.resolve(LOCAL_DIR, 'config/schemas');
const INTERFACE_OUTPUT_DIR = path.resolve(LOCAL_DIR, 'codegen/interfaces');

// Client endpoint generation config
const ENDPOINT_CONFIG_PATH = path.resolve(LOCAL_DIR, 'config/endpoint-configs/example.json');


// Generate enums, this will use the previously generated interface output
const ENUM_OUTPUT_DIR = path.resolve(LOCAL_DIR, 'codegen/enums');

// Env accessor config
const ENV_FILE = path.resolve(ROOT_DIR, '.env');
const ENV_OUTPUT_DIR = path.resolve(LOCAL_DIR, 'codegen/config');
const ENV_OUTPUT_FILE = 'env-config.ts';

async function build() {
    // using the env accessor
    // this is a sync function, and should be run first anyway
    generateEnvLoader(ENV_FILE, ENV_OUTPUT_DIR, ENV_OUTPUT_FILE);

    // using the interface generator
    await generateInterfacesFromPath(SCHEMA_INPUT_DIR, INTERFACE_OUTPUT_DIR)

    // use the enum generator from the output of the interface generator
    await generateEnumsFromPath(INTERFACE_OUTPUT_DIR, ENUM_OUTPUT_DIR);

    // Single API client function generation using the previously generated interfaces
    generateApiClientFunction(
        'https://example.com',
        'GET_PERSON',
        'PERSON_API',
        {
            method: 'GET',
            path: '/people/{id}',
            objectName: 'person',
            pathParams: ['id'],
            responseSchema: 'GET_RES_get_person',
            requestSchema: 'GET_REQ_get_person',
        },
        {
            authType: 'apikey',
            credentials: { apiKeyName: 'x-api-key', apiKeyValue: 'abc123' },
        },
        'source-charlie'
    );

    await generateApiClientsFromFile(ENDPOINT_CONFIG_PATH, 'source-charlie');

}

build();