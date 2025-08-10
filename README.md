# TypeScript Scaffolder
- Includes beta features for REST API client generation
- Includes alpha features for Webhook Server and Client Generation

![npm version](https://img.shields.io/npm/v/typescript-scaffolder)
### Unit Test Coverage: 97.53%

`typescript-scaffolder` is a utility that creates TypeScript interfaces, enums, and config accessors from structured inputs like JSON, .env files, or interface definitions.
Ideal for API integrations that expose schema via JSON — just drop the file in and generate clean, typed code for full-stack use. You can also integrate this into CI pipelines or dev scripts to keep generated types in sync with your schemas.

## Features
- Generate TypeScript interfaces from JSON or schemas
- Generate JSON schemas from TypeScript interfaces
- Auto-create enums from interface keys
- Typed `.env` accessor generator
- Typed axios client api generation
- Command sequence generator
- Typed express server and client webhook generation (beta)
- Preserves directory structure

## Table of Contents
- [Installation](#installation)
- [Usage](#usage)
- [CLI Usage Examples](#cli-usage-examples)
- [Interface Generation](#interface-generation)
- [Environment Variable Interface](#environment-variable-interface)
- [Enum Generation](#enum-generation-from-interface)
- [Schema Generation](#json-schema-generation-from-interface)
- [Client Api Generation](#api-client-generation-from-interface)
- [Sequence_Runner_Generation](#sequence-runner-generation--beta-)
- [Webhook Server Generation](#webhook-Server-generation-from-interface)
- [Roadmap](#roadmap)
- [Reporting Bugs](#reporting-bugs)
- [Contributing](#contributing)

### Interface Generation
Generate TypeScript interfaces automatically from JSON schemas or raw JSON data.

- Infers full TypeScript interfaces using [quicktype](https://github.com/quicktype/quicktype)
- Supports nested objects and arrays
- Preserves directory structure from i.e. `schemas/<folder_name>` into `codegen/interfaces/<folder_name>`
- Automatically creates output folders if they don't exist

This file:
```
{
  "id": "u_123",
  "email": "alice@example.com",
  "age": 29,
  "isActive": true,
  "roles": ["admin", "editor"],
  "preferences": {
    "newsletter": true,
    "theme": "dark"
  },
  "lastLogin": "2024-12-01T10:15:30Z"
}
```
Will give you:
```
export interface User {
    id:          string;
    email:       string;
    age:         number;
    isActive:    boolean;
    roles:       string[];
    preferences: Preferences;
    lastLogin:   Date;
}

export interface Preferences {
    newsletter: boolean;
    theme:      string;
}
```
It will also format out nested objects, where this file
```
{
  "records": [
    {
      "userID": 101,
      "sessionKey": "abc123",
      "events": [
        {
          "eventID": 1,
          "status": "ok",
          "code": 200,
          "message": "Success"
        }
      ],
      "status": "ok",
      "code": 200,
      "message": "Success"
    }
  ],
  "status": "ok",
  "code": 200,
  "message": "Success"
}
```
Will give you:
```
export interface ApiResponse {
  records:    Record[];
  status:     string;
  code:       number;
  message:    string;
}

export interface Record {
  userID:      number;
  sessionKey:  string;
  events:      Event[];
  status:      string;
  code:        number;
  message:     string;
}

export interface Event {
  eventID:     number;
  status:      string;
  code:        number;
  message:     string;
}
```

### IMPORTANT: Considerations for ingested JSON
**⚠️ JSON validators may emit warnings for structural issues. Check logs for details.**

- If your json has an array of objects, the program will warn and only pick the first element. <br>
This is to avoid unpredictable behaviour from Quicktype like unions or circular references. <br>

- If a field value in the JSON is listed as "null", it will be coerced to "any" to allow for
flexibility. The field will be type as optional

- The scaffolder expects correct values in all fields to infer typings. If a field is optional,
use the correct value type or see point two when considering "null"

### Environment Variable Interface
- Reduces need for calling dotenv.config() from multiple areas
- Creates an environment variable handler
- Automatically generated based on keys declared in .env file
- Automatically creates default values based on declared in .env file
- Supports filenames such as .env.local or .env.prod as well

This file:
```
SCHEMAS_DIR="schemas"
OUTPUT_DIR_ROOT="codegen"
INTERFACES_ROOT="interfaces"
```

Will give you:
```
export class EnvConfig {
    static readonly SCHEMAS_DIR: string = process.env.SCHEMAS_DIR ?? '"schemas"';
    static readonly OUTPUT_DIR_ROOT: string = process.env.OUTPUT_DIR_ROOT ?? '"codegen"';
    static readonly INTERFACES_ROOT: string = process.env.INTERFACES_ROOT ?? '"interfaces"';
}

export enum EnvKeys {
    SCHEMAS_DIR = "SCHEMAS_DIR",
    OUTPUT_DIR_ROOT = "OUTPUT_DIR_ROOT",
    INTERFACES_ROOT = "INTERFACES_ROOT"
}
```

### Enum Generation from Interface
Generate TypeScript enums automatically from existing interfaces to create type-safe keys.

- Handles multiple interfaces per file
- Preserves directory structure from i.e. `schemas/<folder_name>` into `codegen/enums/<folder_name>`
- Automatically creates output folders if they don't exist

This file:
```
export interface User {
    id:          string;
    email:       string;
    age:         number;
    isActive:    boolean;
    roles:       string[];
    preferences: Preferences;
    lastLogin:   Date;
}

export interface Preferences {
    newsletter: boolean;
    theme:      string;
}
```
Will give you:
```
export enum UserKeys {
  id = "id",
  email = "email",
  age = "age",
  isActive = "isActive",
  roles = "roles",
  preferences = "preferences",
  lastLogin = "lastLogin"
}

export enum PreferencesKeys {
  newsletter = "newsletter",
  theme = "theme"
}
```
### JSON Schema generation from interface
Generate JSON schemas automatically from existing interfaces.

- Handles multiple interfaces per file
- Preserves directory structure from i.e. `interfaces/<folder_name>` into `codegen/schemas/<folder_name>`
- Automatically creates output folders if they don't exist

This file:
```
export interface GET_RES_user {
    id:          string;
    firstName:   string;
    lastName:    string;
    title:       string;
    email:       string;
    metadata:    Metadata;
    phoneNumber: string;
    country:     string;
    address:     Address;
}

export interface Address {
    streetAddress: string;
    zipCode:       string;
    state:         string;
}

export interface Metadata {
    employeeId: string;
    department: string;
}
```
Will give you:
```
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "GET_RES_user",
  "type": "object",
  "properties": {
    "id": {
      "type": "string"
    },
    "firstName": {
      "type": "string"
    },
    "lastName": {
      "type": "string"
    },
    "title": {
      "type": "string"
    },
    "email": {
      "type": "string"
    },
    "metadata": {
      "$ref": "#/definitions/Metadata"
    },
    "phoneNumber": {
      "type": "string"
    },
    "country": {
      "type": "string"
    },
    "address": {
      "$ref": "#/definitions/Address"
    }
  },
  "required": [
    "id",
    "firstName",
    "lastName",
    "title",
    "email",
    "metadata",
    "phoneNumber",
    "country",
    "address"
  ],
  "definitions": {
    "Address": {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "title": "Address",
      "type": "object",
      "properties": {
        "streetAddress": {
          "type": "string"
        },
        "zipCode": {
          "type": "string"
        },
        "state": {
          "type": "string"
        }
      },
      "required": [
        "streetAddress",
        "zipCode",
        "state"
      ],
      "definitions": {}
    },
    "Metadata": {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "title": "Metadata",
      "type": "object",
      "properties": {
        "employeeId": {
          "type": "string"
        },
        "department": {
          "type": "string"
        }
      },
      "required": [
        "employeeId",
        "department"
      ],
      "definitions": {}
    }
  }
}
```

### API Client generation from interface
Generate TypeScript `GET_ALL, GET, POST, PUT, DELETE` REST Api client based on a configuration file 
that uses referenced interfaces for typing. 

### Directory Structure Notes

When using `generateApiClientsFromPath`, follow this pattern for best results:

- Config files should be stored in a **flat** folder structure (e.g., `config/endpoint-configs`)
- Generated interfaces can be stored in a **parent folder with subdirectories** to reflect source groupings (e.g., `codegen/interfaces/source-a`, `codegen/interfaces/source-b`)
- The output directory (e.g., `codegen/apis`) will **mirror** the structure of the interfaces directory
- The names specified in the api config file must match the interface file name.

For example, given:
- Interface input input: `codegen/interfaces/source-charlie/GET_RES_users.ts`
- Config file: `config/endpoint-configs/users.json`
- Config responseSchema value: `GET_RES_users`
- Output file: `codegen/apis/source-charlie/USESR_api.ts`

The following interface is used to define the api config

```
export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'
export type AuthType = 'basic' | 'apikey' | 'none'

export interface Endpoint {
	method: Method;
	path: string;
	objectName: string;
	operationName?: string;
	pathParams?: string[];
	queryParams?: string[];
	headers?: Record<string, string>;

	requestSchema?: string;
	responseSchema: string;
}

export type EndpointConfigType = {
	baseUrl: string
	endpoints: Endpoint[]
};

export interface EndpointAuthConfig {
	authType: AuthType;
	credentials?: {
		username?: string;
		password?: string;
		apiKeyName?: string;
		apiKeyValue?: string;
	};
}

export interface EndpointClientConfigFile extends EndpointConfigType, EndpointAuthConfig {
}
```
As an example, if you have interfaces generated from the following JSON files:
```
GET_RES_people.json // defines an array
GET_RES_person.json // defines a single object
POST_REQ_create_person.json // defines a single object for creation
```
And you define your JSON config as below:
```
{
  "baseUrl": "https://api.example.com",
  "endpoints": [
    {
      "method": "GET",
      "path": "/people",
      "responseSchema": "GET_RES_people",
      "pathParams": [],
      "objectName": "person"
    },
    {
      "method": "GET",
      "path": "/people/:id",
      "responseSchema": "GET_RES_person",
      "pathParams": ["id"],
      "objectName": "person"
    },
    {
      "method": "POST",
      "path": "/people",
      "requestSchema": "POST_REQ_create_person",
      "responseSchema": "GET_RES_person",
      "pathParams": [],
      "objectName": "person"
    },
    {
      "method": "PUT",
      "path": "/people/:id",
      "requestSchema": "POST_REQ_create_person",
      "responseSchema": "GET_RES_person",
      "pathParams": ["id"],
      "objectName": "person"
    },
    {
      "method": "DELETE",
      "path": "/people/:id",
      "responseSchema": "GET_RES_person",
      "pathParams": ["id"],
      "objectName": "person"
    }

  ],
  "authType": "apikey",
  "credentials": {
    "apiKeyName": "x-api-key",
    "apiKeyValue": "test-1234"
  }
}
```
The system will produce a file called person_api.ts
```
import { GET_RES_people } from "../../interfaces/source-charlie/GET_RES_people";
import axios from "axios";
import { GET_RES_person } from "../../interfaces/source-charlie/GET_RES_person";
import { POST_REQ_create_person } from "../../interfaces/source-charlie/POST_REQ_create_person";

export async function GET_ALL_person(headers?: Record<string, string>): Promise<GET_RES_people> {

          const authHeaders = { "x-api-key": "test-1234" };
          const response = await axios.get(
            `https://api.example.com/people`,
            
            {
              headers: {
                ...authHeaders,
                ...headers,
              },
            }
          );
          return response.data;
        
}

export async function GET_person(id: string, headers?: Record<string, string>): Promise<GET_RES_person> {

          const authHeaders = { "x-api-key": "test-1234" };
          const response = await axios.get(
            `https://api.example.com/people/${id}`,
            
            {
              headers: {
                ...authHeaders,
                ...headers,
              },
            }
          );
          return response.data;
        
}

export async function POST_person(body: POST_REQ_create_person, headers?: Record<string, string>): Promise<GET_RES_person> {

          const authHeaders = { "x-api-key": "test-1234" };
          const response = await axios.post(
            `https://api.example.com/people`,
            body,
            {
              headers: {
                ...authHeaders,
                ...headers,
              },
            }
          );
          return response.data;
        
}

export async function PUT_person(id: string, body: POST_REQ_create_person, headers?: Record<string, string>): Promise<GET_RES_person> {

          const authHeaders = { "x-api-key": "test-1234" };
          const response = await axios.put(
            `https://api.example.com/people/${id}`,
            body,
            {
              headers: {
                ...authHeaders,
                ...headers,
              },
            }
          );
          return response.data;
        
}

export async function DELETE_person(id: string, headers?: Record<string, string>): Promise<GET_RES_person> {

          const authHeaders = { "x-api-key": "test-1234" };
          const response = await axios.delete(
            `https://api.example.com/people/${id}`,
            
            {
              headers: {
                ...authHeaders,
                ...headers,
              },
            }
          );
          return response.data;
        
}

```
### Api Client Registry File
If you want to create a single registration file from the collection of APIs that you have in your service, you can use
the `generateApiRegistry` function to create a single file from which to programmatically access all your APIs. 

For example:
```
src/
  codegen/
    apis/
      source-charlie/
        person_api.ts
      source-delta/
        user_api.ts

```
Will generate:
```
import * as person_api from './source-charlie/person_api';
import * as user_api from './source-delta/user_api';

export const apiRegistry = {
  'source-charlie': {
    ...person_api
  },
  'source-delta': {
    ...user_api
  }
};
```
You can then use an example const:
```
const fn = apiRegistry?.[service]?.[functionName]
```
To store the function and call it as required, or user the helper function which has runtime validation built in:
```
const fn = getApiFunction(apiRegistry, 'source-delta', 'GET_user');
```

### Sequence Runner Generation (beta)

Generate TypeScript workflows that combine multiple API operations in order, using a declarative JSON config format.

- Supports `fetchList`, `loop`, and `action` steps
- Allows use of `extract` to assign response fields to variables
- Supports `{{variable}}` interpolation in action bodies
- Multi-service support via per-step `service` routing
- Emitted runners import and use `apiRegistry` functions
- Output to `src/codegen/sequences/<SequenceName>.runner.ts`

#### Example Config

```json
{
  "serviceName": "source-alpha",
  "sequences": [
    {
      "name": "PopulatePeople",
      "steps": [
        {
          "id": "fetchPeople",
          "type": "fetchList",
          "endpoint": "/people",
          "extract": {
            "as": "people",
            "field": "data"
          }
        },
        {
          "id": "loopPeople",
          "type": "loop",
          "over": "people",
          "itemName": "person",
          "steps": [
            {
              "id": "updatePerson",
              "type": "action",
              "method": "put",
              "endpoint": "/people/:person.id",
              "body": {
                "email": "{{person.email}}"
              },
              "extract": {
                "as": "updatedId",
                "field": "id"
              }
            }
          ]
        }
      ]
    }
  ]
}
```
Will generate:
```
PopulatePeople.runner.ts
// Auto-generated runner for sequence: PopulatePeople
// Service: populate-users
import { apiRegistry } from "../registry";

export async function runPopulatePeople() {
  const response = await apiRegistry["populate-users"].getAll_people();
  const people = response.data;
  for (const person of people) {
    const response = await apiRegistry["populate-users"].put_people(person.id, { active: true, source: "smoke-test" });
    const updatedId = response.id;
  }
}

PopulatePeopleWithEmail.runner.ts
// Auto-generated runner for sequence: PopulatePeopleWithEmails
// Service: populate-users
import { apiRegistry } from "../registry";

export async function runPopulatePeopleWithEmails() {
  const response = await apiRegistry["populate-users"].getAll_people();
  const people = response.data;
  for (const person of people) {
    const response = await apiRegistry["populate-users"].put_people(person.id, { email: person.email, updatedBy: "interpolator" });
    const updatedEmailId = response.id;
  }
}
```

### Webhook Server Generation from interface
When using `generateWebhookAppFromPath`, follow this pattern for best results:

- Config files should be stored in a **flat** folder structure (e.g., `config/webhook-configs`)
- Generated interfaces can be stored in a **parent folder with subdirectories** to reflect source groupings (e.g., `codegen/interfaces/source-a`, `codegen/interfaces/source-b`)
- The output directory (e.g., `codegen/webhooks`) will **mirror** the structure of the interfaces directory
- The names specified in the webhook config file must match the interface file name.

For example, given:
- Interface input input: `codegen/interfaces/source-echo/StripeWebhookPayload.ts`
- Config file: `config/webhook-configs/payment.json`
- Config responseSchema value: `StripeWebhookPayload`
- Output files: 
  - `codegen/webhooks/source-echo/webhookAppRegistry.ts`
  - `codegen/webhooks/source-echo/createSourceEchoWebhookApp.ts`
  - `codegen/webhooks/source-echo/routes/router.ts`
  - `codegen/webhooks/source-echo/routes/handle_stripePaymentWebhook.ts`

The following interface is used to define the webhook config
```
export interface IncomingWebhook extends BaseWebhook {
    direction: 'incoming'
    path: string; // Required for incoming
    handlerName: string; // required for route + handler generation
}

export interface OutgoingWebhook extends BaseWebhook {
    direction: 'outgoing'
    targetUrl: string; // Required for outgoing
}

export interface BaseWebhook extends SchemaConsumer {
    direction: 'incoming' | 'outgoing';
    name: string;
    requestSchema: string;
    responseSchema?: string;
    headers?: Record<string, string>;
    secretVerificationKey?: string; // Optional: used for signature validation
}

export type Webhook = IncomingWebhook | OutgoingWebhook;

export interface WebhookConfigFile {
    webhooks: Webhook[];
}
```
As an example, if you have interfaces generated from the following JSON files:
```
// StripeWebhookPayload.json (incoming)
{
  "id": "evt_12345",
  "object": "event",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "amount": 2000,
      "currency": "usd",
      "status": "succeeded"
    }
  }
}
```
And you define your JSON config as below:
```
{
  "webhooks": [
    {
      "direction": "incoming",
      "name": "stripe_payment",
      "path": "/webhooks/stripe",
      "requestSchema": "StripeWebhookPayload",
      "handlerName": "stripePaymentWebhook"
    }
  ]
}
```
The system will produce the following files:
```
// webhookAppRegistry.ts
import * as Router from './routes/router';
import * as handle_stripePaymentWebhook from './routes/handle_stripePaymentWebhook';

export const webhookAppRegistry = {
  'source-echo': {
    router: Router,
    handlers: {
      ...handle_stripePaymentWebhook
    }
  }
};

// createSourceEchoWebhookApp.ts
import express from "express";
import { webhookAppRegistry } from "./webhookAppRegistry";

export function createSourceEchoWebhookApp() {

    const app = express();
    app.use(express.json());

    const handlers = webhookAppRegistry['source-echo']?.handlers || {};

    for (const key of Object.keys(handlers)) {
      app.post('/' + key, handlers[key]);
    }

    return app;
}

// routes/handle_stripePaymentWebhook.ts
import { StripeWebhookPayload } from "../../../interfaces/source-echo/StripeWebhookPayload";

export async function handleStripePaymentWebhookWebhook(payload: StripeWebhookPayload): Promise<void> {
    // TODO: Implement webhook handler logic here
    console.log("Received webhook payload:", payload);
}

// routes/router.ts
import express from "express";
import type { StripeWebhookPayload } from "../../../interfaces/source-echo/StripeWebhookPayload";
import { handleStripePaymentWebhookWebhook } from "./handle_stripePaymentWebhook";
const router = express.Router();
router.use(express.json());
router.post('/webhooks/stripe', async (req, res) => {
	try {
		const payload = req.body as StripeWebhookPayload;
		await handleStripePaymentWebhookWebhook(payload);
		res.status(200).json({ ok: true });
	} catch (error) {
		console.error('Webhook error:', error);
		res.status(500).json({ ok: false });
	}
});
export default router;
```
Alternatively, if you express an outgoing webhook, it will look like this
```
import { NotifyPayload } from "../../../interfaces/source-foxtrot/NotifyPayload";
import { NotifyResponse } from "../../../interfaces/source-foxtrot/NotifyResponse";
import axios from "axios";
import { AxiosRequestConfig } from "axios";

export async function sendNotifyPartnerWebhook(body: NotifyPayload, headers?: Record<string, string>): Promise<NotifyResponse> {
    const response = await axios.post(`https://partner.example.com/webhook`, body, { headers });
    return response.data;
}

```

You can access the individual handlers by referencing the registry, e.g.
```
webhookAppRegistry['source-echo'].handlers.handle_stripePaymentWebhook
```
#### Webhook Test Routes and Fixtures (Beta)

When generating webhook server code, the generator now also produces a **test route** and a **fixture** for each webhook defined in your config.

- **Test Routes**: For every incoming webhook, a matching test route is generated alongside your router. This route can be used during development to send a mock payload to your handler without relying on the real external webhook source.
- **Fixtures**: For each request schema referenced in your webhook config, a `<InterfaceName>.fixture.ts` file is generated. This fixture contains a typed example payload matching the interface and can be used to drive unit tests or manual route testing.

The fixture generator will:
- Parse the referenced TypeScript interface to generate representative values for all fields.
- Use name-based faker heuristics for realistic values where possible, otherwise fall back to generic fakers.
- Handle nested objects, arrays, enums, unions, optional fields, and basic type inference.

The generated test routes import and send these fixtures to your handlers, providing an end-to-end loop for quickly verifying that your webhook handling logic and type expectations are correct.

> **Note:** This feature is currently in beta. Fixture generation is best-effort and may require manual adjustment for complex or domain-specific payloads.

## Installation
To install the package, run the following command
```
npm install typescript-scaffolder
```
---

## Usage
### IMPORTANT: Considerations for where to place generated code
If you intend to import the generated output into your main application code (e.g., use interfaces or API clients),
we recommend placing the `codegen/` directory inside your `src/` folder.

For example:
```
src/
  codegen/
    apis/
    apis/sequences
    config/
    enums/
    interfaces/
    schemas/
    webhooks/
```

This ensures:
- TypeScript includes the generated files in your compilation scope
- IDE tools (like IntelliSense or import resolution) behave correctly
- You avoid pathing issues or brittle import warnings

If you keep `codegen/` outside of `src/`, you may need to update your `tsconfig.json` to include it,
or manually relocate usable outputs into `src/` after generation.

### Example usages

Please refer to the following code block for example usages:
```
const ROOT_DIR = process.cwd();                // Base dir where the script is run
const LOCAL_DIR = __dirname;                   // Base dir where this file lives
const CODEGEN_DIR = path.resolve(LOCAL_DIR, 'src/codegen')

// Interface generation config
const SCHEMA_INPUT_DIR = path.resolve(LOCAL_DIR, 'config/schemas');
const INTERFACE_OUTPUT_DIR = path.resolve(CODEGEN_DIR, 'interfaces');

// Generate enums, this will use the previously generated interface output
const ENUM_OUTPUT_DIR = path.resolve(CODEGEN_DIR, 'enums');

// Generate typed json schemas, this will use the previously generated interface output
const SCHEMA_OUTPUT_DIR = path.resolve(CODEGEN_DIR, 'schemas');

// Client endpoint generation config
const ENDPOINT_CONFIG_PATH = path.resolve(LOCAL_DIR, 'config/endpoint-configs');
const CLIENT_OUTPUT_DIR = path.resolve(CODEGEN_DIR, 'apis')

// Webhook server generation config
const WEBHOOK_CONFIG_PATH = path.resolve(LOCAL_DIR, 'config/webhook-configs');
const WEBHOOK_OUTPUT_DIR = path.resolve(CODEGEN_DIR, 'webhooks');

// Env accessor config
const ENV_FILE = path.resolve(ROOT_DIR, '.env');
const ENV_OUTPUT_DIR = path.resolve(CODEGEN_DIR, 'config');
const ENV_OUTPUT_FILE = 'env-config.ts';

async function build() {
	// using the env accessor
	// this is a sync function, and should be run first anyway
	generateEnvLoader(ENV_FILE, ENV_OUTPUT_DIR, ENV_OUTPUT_FILE);

	// using the interface generator
	await generateInterfacesFromPath(SCHEMA_INPUT_DIR, INTERFACE_OUTPUT_DIR)

	// use the enum generator from the output of the interface generator
	await generateEnumsFromPath(INTERFACE_OUTPUT_DIR, ENUM_OUTPUT_DIR);

	// use the json schema generator from the output of the interface generator
	await generateJsonSchemasFromPath(INTERFACE_OUTPUT_DIR, SCHEMA_OUTPUT_DIR)

	// Generates an object-centric axios api client based on a config file
	await generateApiClientsFromPath(ENDPOINT_CONFIG_PATH, INTERFACE_OUTPUT_DIR, CLIENT_OUTPUT_DIR);

	// Generate the api registry to access the generated client functions
	await generateApiRegistry(CLIENT_OUTPUT_DIR);
	
	// Generates a command sequence file based on the generated client-api registry
	await generateSequencesFromPath(SEQUENCE_CONFIG_PATH, CLIENT_OUTPUT_DIR);

	// Generate an express webhook application
	await generateWebhookAppFromPath(WEBHOOK_CONFIG_PATH, INTERFACE_OUTPUT_DIR, WEBHOOK_OUTPUT_DIR)
}

build();
```

## CLI Usage Examples

Below are example commands to run each of the CLI subcommands available in `typescript-scaffolder`.

### Generate Interfaces

Generate TypeScript interfaces from JSON schema files:

```bash
typescript-scaffolder interfaces \
  --input ./schemas \
  --output ./codegen/interfaces
```

### Generate Schemas

Generate typed json schemas from typescript interfaces:

```bash
typescript-scaffolder jsonschemas \
  --input ./codegen/interfaces \
  --output ./codegen/schemas
```

### Generate Enums

Generate TypeScript enums from interface files:

```bash
typescript-scaffolder enums \
  --input ./codegen/interfaces \
  --output ./codegen/enums \
  --ext .ts
```

### Generate Environment Loader

Generate a typed environment variable accessor from a `.env` file:

```bash
typescript-scaffolder envloader \
  --env-file .env \
  --output-dir ./codegen/config \
  --output-file env-config.ts \
  --class-name EnvConfig \
  --enum-name EnvKeys
```

### Generate API Client From Single Config File

Generate an API client from a single JSON config file:

```bash
typescript-scaffolder apiclient-file \
  --config ./config/api.json \
  --interfaces ./codegen/interfaces \
  --output ./codegen/apis
```

### Generate API Clients From Config Directory

Generate API clients from multiple JSON config files in a directory:

```bash
typescript-scaffolder apiclient-dir \
  --config-dir ./config/api-configs \
  --interfaces-root ./codegen/interfaces \
  --output-root ./codegen/apis
```

### Generate API Client Registry

Generate a consolidated API client registry file from generated clients:

```bash
typescript-scaffolder apiclient-registry \
  --api-root ./codegen/apis \
  --registry-file registry.ts
```

### Generate Sequence Runner (Beta)

Generate command functions to call certain API points in sequence

```bash
typescript-scaffolder sequences \
  --config-dir ./config/sequences \
  --output ./src/codegen/sequences
```

### Generate Webhook App

Generate an Express webhook app and registry from a config file:

```bash
typescript-scaffolder webhooks \
  --config ./config/source-bravo.json \
  --interfaces ./codegen/interfaces \
  --output ./codegen/webhooks
```

---

To see all available commands and options, run:

```bash
typescript-scaffolder help
```

or

```bash
typescript-scaffolder --help
```


## Roadmap
- [x] Generate TypeScript interfaces from schema definitions
- [x] Generate TypeScript enums to assert key names
- [x] Generate TypeScript accessor for environment variables
- [x] Generate typed json schemas
- [x] Generate TypeScript axios REST api client from interfaces
- [x] Generate Typescript command sequences for REST api calls
- [x] Generate Typescript axios client webhook apps
- [x] Generate Typescript webhook test routes and fixtures
- [x] Generate Typescript express server webhook apps
- [x] Command line interface access
- [ ] Factory classes based on interfaces
- [ ] Scaffolding for service mocking (GET, POST, PUT, DELETE)
- [ ] Generate enums from definitions
- [ ] Generate classes from schema definitions
- [ ] Declarative function generation

## Reporting Bugs

If you encounter a bug or unexpected behavior, please open an issue with:

- A clear description of the problem
- Steps to reproduce it (code snippets, input files, etc.)
- The expected vs. actual result
- Your environment (OS, Node.js version, TypeScript version)

Bug reports are appreciated and help improve the project, even if you're not submitting a fix directly.

## Contributing

This project is currently maintained as a solo project. While issues and ideas are welcome, I’m not accepting external pull requests at this time.

## Repo
https://github.com/ejfamanas/typescript-scaffolder

## License
Licensed under the [MIT License](LICENSE).

