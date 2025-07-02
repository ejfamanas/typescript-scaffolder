# TypeScript Scaffolder
Includes alpha features for REST API client generation

![npm version](https://img.shields.io/npm/v/typescript-scaffolder)
### Unit Test Coverage: 97.64%

`typescript-scaffolder` is a utility that creates TypeScript interfaces, enums, and config accessors from structured inputs like JSON, .env files, or interface definitions.
Ideal for API integrations that expose schema via JSON — just drop the file in and generate clean, typed code for full-stack use. You can also integrate this into CI pipelines or dev scripts to keep generated types in sync with your schemas.

## Features
- Generate TypeScript interfaces from JSON or schemas
- Auto-create enums from interface keys
- Typed `.env` accessor generator
- Typed axios client api generation (alpha)
- Preserves directory structure

## Table of Contents
- [Installation](#installation)
- [Usage](#usage)
- [CLI Usage Examples](#cli-usage-examples)
- [Interface Generation](#interface-generation)
- [Environment Variable Interface](#environment-variable-interface)
- [Enum Generation](#enum-generation-from-interface)
- [Client Api Generation](#api-client-generation-from-interface-alpha)
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
- If your json has an array of objects, the program will throw to avoid unpredictable behaviour from Quicktype <br>
like unions or circular references. Please only use one object entry per array to avoid this.

- If a field value in the JSON is listed as "null", it will be coerced to "any" to allow for
flexibility.

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

### API Client generation from interface (BETA)
Generate TypeScript GET_ALL, GET, POST, PUT, DELETE REST Api client based on a configuration file 
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
- Output file: `codegen/apis/source-charlie/USER_api.ts`

The output will be:
- `codegen/apis/source-charlie/users_api.ts`


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
    interfaces/
    apis/
    config/
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
import path from "path";
import {
	generateApiClientsFromPath,
	generateApiRegistry,
	generateEnumsFromPath,
	generateEnvLoader,
	generateInterfacesFromPath,
	getApiFunction
} from "./src";
import { apiRegistry } from './src/codegen/apis/registry';


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

	// Generate the api registry to access the generated client functions
	await generateApiRegistry(CLIENT_OUTPUT_DIR);
}

// this test will check if the registry is working. axios should be called if the generation was successful
async function testApiFunction() {
	try {
		// use the getApiFunction in combination with the registry, service name, and function name to activate
		const fn = getApiFunction(apiRegistry, 'source-delta', 'GET_user');
		const result = await fn(); // You might need to pass args depending on the signature
		console.log('Function executed successfully:', result);
	} catch (error) {
		console.error('Function invocation failed:', error);
	}
}

build().then(testApiFunction);
```

## CLI Usage Examples (ALPHA)

Below are example commands to run each of the CLI subcommands available in `typescript-scaffolder`.

### Generate Interfaces

Generate TypeScript interfaces from JSON schema files:

```bash
typescript-scaffolder interfaces -i ./schemas -o ./codegen/interfaces
```

### Generate Enums

Generate TypeScript enums from interface files:

```bash
typescript-scaffolder enums -i ./codegen/interfaces -o ./codegen/enums --ext .ts
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
- [x] Generate TypeScript axios REST api client from interfaces
- [x] Command line interface access
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

