"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const src_1 = require("./src");
const ROOT_DIR = process.cwd(); // Base dir where the script is run
const LOCAL_DIR = __dirname; // Base dir where this file lives
const CODEGEN_DIR = path_1.default.resolve(LOCAL_DIR, 'src/codegen');
// Interface generation config
const SCHEMA_INPUT_DIR = path_1.default.resolve(LOCAL_DIR, 'config/schemas');
const INTERFACE_OUTPUT_DIR = path_1.default.resolve(CODEGEN_DIR, 'interfaces');
// Generate enums, this will use the previously generated interface output
const ENUM_OUTPUT_DIR = path_1.default.resolve(CODEGEN_DIR, 'enums');
// Generate typed json schemas, this will use the previously generated interface output
const SCHEMA_OUTPUT_DIR = path_1.default.resolve(CODEGEN_DIR, 'schemas');
// Client API endpoint generation config
const ENDPOINT_CONFIG_PATH = path_1.default.resolve(LOCAL_DIR, 'config/endpoint-configs');
const CLIENT_OUTPUT_DIR = path_1.default.resolve(CODEGEN_DIR, 'apis');
// Client API sequence generation config
const SEQUENCE_CONFIG_PATH = path_1.default.resolve(LOCAL_DIR, 'config/sequence-config');
// Webhook server generation config
const WEBHOOK_CONFIG_PATH = path_1.default.resolve(LOCAL_DIR, 'config/webhook-configs');
const WEBHOOK_OUTPUT_DIR = path_1.default.resolve(CODEGEN_DIR, 'webhooks');
// Env accessor config
const ENV_FILE = path_1.default.resolve(ROOT_DIR, '.env');
const ENV_OUTPUT_DIR = path_1.default.resolve(CODEGEN_DIR, 'config');
const ENV_OUTPUT_FILE = 'env-config.ts';
async function build() {
    // using the env accessor
    // this is a sync function, and should be run first anyway
    (0, src_1.generateEnvLoader)(ENV_FILE, ENV_OUTPUT_DIR, ENV_OUTPUT_FILE);
    // using the interface generator
    await (0, src_1.generateInterfacesFromPath)(SCHEMA_INPUT_DIR, INTERFACE_OUTPUT_DIR);
    // use the enum generator from the output of the interface generator
    await (0, src_1.generateEnumsFromPath)(INTERFACE_OUTPUT_DIR, ENUM_OUTPUT_DIR);
    // use the json schema generator from the output of the interface generator
    await (0, src_1.generateJsonSchemasFromPath)(INTERFACE_OUTPUT_DIR, SCHEMA_OUTPUT_DIR);
    // Generates an object-centric axios api client based on a config file
    await (0, src_1.generateApiClientsFromPath)(ENDPOINT_CONFIG_PATH, INTERFACE_OUTPUT_DIR, CLIENT_OUTPUT_DIR);
    // Generate the api registry to access the generated client functions
    await (0, src_1.generateApiRegistry)(CLIENT_OUTPUT_DIR);
    // Generates a command sequence file based on the generated client-api registry
    await (0, src_1.generateSequencesFromPath)(SEQUENCE_CONFIG_PATH, CLIENT_OUTPUT_DIR);
    // Generate an express webhook application
    await (0, src_1.generateWebhookAppFromPath)(WEBHOOK_CONFIG_PATH, INTERFACE_OUTPUT_DIR, WEBHOOK_OUTPUT_DIR);
}
build();
