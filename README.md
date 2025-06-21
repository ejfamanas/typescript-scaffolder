# TypeScript Scaffolder

```typescript-scaffolder``` is a CLI-first codegen utility that creates TypeScript interfaces, enums, and config accessors from structured inputs like JSON, .env files, or interface definitions.
Ideal for API integrations that expose schema via JSON — just drop the file in and generate clean, typed code for full-stack use. You can also integrate this into CI pipelines or dev scripts to keep generated types in sync with your schemas.

## ✨ Version 1.3.67 with 97.64% unit test coverage

### Interface Generation
Generate TypeScript interfaces automatically from JSON schemas or raw JSON data.

- Infers full TypeScript interfaces using [quicktype](https://github.com/quicktype/quicktype)
- Supports nested objects, and arrays
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
import {
    generateEnumsFromPath,
    generateEnvLoader,
    generateInterfacesFromPath,
    scaffoldMockServer
    } from "typescript-scaffolder";

const ROOT_DIR = process.cwd();                // Base dir where the script is run
const LOCAL_DIR = __dirname;                   // Base dir where this file lives

// Interface generation config
const SCHEMA_INPUT_DIR      = path.resolve(LOCAL_DIR, 'schemas');
const INTERFACE_OUTPUT_DIR  = path.resolve(LOCAL_DIR, 'codegen/interfaces');

// Generate enums, this will use the previously generated interface output
const ENUM_OUTPUT_DIR       = path.resolve(LOCAL_DIR, 'codegen/enums');

// Env accessor config
const ENV_FILE              = path.resolve(ROOT_DIR, '.env');
const ENV_OUTPUT_DIR        = path.resolve(LOCAL_DIR, 'codegen/config');
const ENV_OUTPUT_FILE       = 'env-config.ts';

async function main(): Promise<void> {
    // using the env accessor
    // this is a sync function, and should be run first anyway
    generateEnvLoader(ENV_FILE, ENV_OUTPUT_DIR, ENV_OUTPUT_FILE);

    // using the interface generator
    await generateInterfacesFromPath(SCHEMA_INPUT_DIR, INTERFACE_OUTPUT_DIR)

    // use the enum generator from the output of the interface generator
    await generateEnumsFromPath(INTERFACE_OUTPUT_DIR, ENUM_OUTPUT_DIR);
}

main();
```


## Roadmap
[X] Generate TypeScript interfaces from schema definitions <br>
[X] Generate TypeScript enums to assert key names to avoid magic strings <br>
[X] Generate TypeScript accessor to access environment variables <br>
[ ] Command line interface access <br>
[ ] Scaffolding for service mocking (GET) <br>
[ ] Scaffolding for service mocking (POST) <br>
[ ] Scaffolding for service mocking (PUT) <br>
[ ] Scaffolding for service mocking (DELETE) <br>
[ ] Generate enums from definitions <br>
[ ] Generate classes from schema definitions <br>
[ ] Declarative function generation <br>

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

