# TypeScript Scaffolder

Generates typescript code based off of files or schemas such as JSON. 
## ✨ Version 1.1-B Features

### Interface Generation (Beta)
Generate TypeScript interfaces automatically from JSON schemas or raw JSON data.

- Infers full TypeScript interfaces using [quicktype](https://github.com/quicktype/quicktype)
- Supports nested objects, arrays, optional fields, unions
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

### Environment Variable Interface (Beta)
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

### Mock Server Generation (GET) (Alpha)
- Reads all json files within a directory tree and scaffolds out mock server endpoints for GET requests
---

## Installation
To install the package, run the following command
```
npm install typescript-scaffolder
```
---

## Usages in code
Please refer to the following code block for example usages:
```
import path from "path";
import { generateEnvLoader, generateInterfacesFromPath, scaffoldMockServer } from "typescript-scaffolder";

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
```


## Roadmap
[X] Generate typescript interfaces from schema definitions <br>
[ ] Generate typescript enums to assert key names to avoid magic strings <br>
[X] Generate typescript accessor to access environment variables <br>
[X] Scaffolding for service mocking (GET) <br>
[ ] Scaffolding for service mocking (POST) <br>
[ ] Scaffolding for service mocking (PUT) <br>
[ ] Scaffolding for service mocking (DELETE) <br>
[ ] Generate enums from definitions <br>
[ ] Generate classes from schema definitions <br>
[ ] Declarative function generation <br>

## License
Licensed under the [MIT License](LICENSE).

