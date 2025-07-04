import path from "path";
import {
	generateApiClientsFromPath,
	generateApiRegistry,
	generateEnumsFromPath,
	generateEnvLoader,
	generateInterfacesFromPath,
	generateWebhookRegistry,
	generateWebhooksFromPath,
} from "./src";


const ROOT_DIR = process.cwd();                // Base dir where the script is run
const LOCAL_DIR = __dirname;                   // Base dir where this file lives
const CODEGEN_DIR = path.resolve(LOCAL_DIR, 'src/codegen')

// Interface generation config
const SCHEMA_INPUT_DIR = path.resolve(LOCAL_DIR, 'config/schemas');
const INTERFACE_OUTPUT_DIR = path.resolve(CODEGEN_DIR, 'interfaces');

// Client endpoint generation config
const ENDPOINT_CONFIG_PATH = path.resolve(LOCAL_DIR, 'config/endpoint-configs');
const CLIENT_OUTPUT_DIR = path.resolve(CODEGEN_DIR, 'apis')

// Generate enums, this will use the previously generated interface output
const ENUM_OUTPUT_DIR = path.resolve(CODEGEN_DIR, 'enums');

// Env accessor config
const ENV_FILE = path.resolve(ROOT_DIR, '.env');
const ENV_OUTPUT_DIR = path.resolve(CODEGEN_DIR, 'config');
const ENV_OUTPUT_FILE = 'env-config.ts';

const WEBHOOK_CONFIG_PATH = path.resolve(LOCAL_DIR, 'config/webhook-configs');
const WEBHOOK_OUTPUT_DIR = path.resolve(CODEGEN_DIR, 'webhooks');

async function build() {
	// using the env accessor
	// this is a sync function, and should be run first anyway
	generateEnvLoader(ENV_FILE, ENV_OUTPUT_DIR, ENV_OUTPUT_FILE);

	// using the interface generator
	await generateInterfacesFromPath(SCHEMA_INPUT_DIR, INTERFACE_OUTPUT_DIR)

	// use the enum generator from the output of the interface generator
	await generateEnumsFromPath(INTERFACE_OUTPUT_DIR, ENUM_OUTPUT_DIR);

	// Generates an object-centric api client based on a config file
	await generateApiClientsFromPath(ENDPOINT_CONFIG_PATH, INTERFACE_OUTPUT_DIR, CLIENT_OUTPUT_DIR);

	// Generate webhook handlers/senders based on the webhook configs
	await generateWebhooksFromPath(WEBHOOK_CONFIG_PATH, INTERFACE_OUTPUT_DIR, WEBHOOK_OUTPUT_DIR);

	// Generate the webhook registry for runtime resolution
	await generateWebhookRegistry(WEBHOOK_OUTPUT_DIR);

	// Generate the api registry to access the generated client functions
	await generateApiRegistry(CLIENT_OUTPUT_DIR);
}

build();