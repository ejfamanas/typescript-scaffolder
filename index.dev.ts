import path from "path";
import {
	generateApiClientsFromPath,
	generateApiRegistry,
	generateEnumsFromPath,
	generateEnvLoader,
	generateInterfacesFromPath,
} from "./src";
<<<<<<< Updated upstream
import { generateWebhookAppFromPath } from "./src/features/generate-webhook-app";
import { generateWebhookAppRegistriesFromPath } from "./src/features/generate-webhook-app-registry";

=======
>>>>>>> Stashed changes

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

	// Generates an object-centric axios api client based on a config file
	await generateApiClientsFromPath(ENDPOINT_CONFIG_PATH, INTERFACE_OUTPUT_DIR, CLIENT_OUTPUT_DIR);

	// Generate the api registry to access the generated client functions
	await generateApiRegistry(CLIENT_OUTPUT_DIR);

<<<<<<< Updated upstream
	// Generate an express webhook application
	await generateWebhookAppFromPath(WEBHOOK_CONFIG_PATH, INTERFACE_OUTPUT_DIR, WEBHOOK_OUTPUT_DIR)
}

build();
=======
// this test will check if the registry is working. axios should be called if the generation was successful
// async function testApiFunction() {
// 	try {
// 		// use the getApiFunction in combination with the registry, service name, and function name to activate
// 		const fn = getApiFunction(apiRegistry, 'source-delta', 'GET_user');
// 		const result = await fn(); // You might need to pass args depending on the signature
// 		console.log('Function executed successfully:', result);
// 	} catch (error) {
// 		console.error('Function invocation failed:', error);
// 	}
// }

build()
// build().then(testApiFunction);
>>>>>>> Stashed changes
