# TypeScript Scaffolder

Generates typescript code based off of files or schemas such as JSON. 
## ✨ Version 1.1-A Features

### Interface Generation (Beta)
Generate TypeScript interfaces automatically from JSON schemas or raw JSON data.

- Infers full TypeScript interfaces using [quicktype](https://github.com/quicktype/quicktype)
- Supports nested objects, arrays, optional fields, unions
- Preserves directory structure from i.e. `schemas/<folder_name>` into `codegen/interfaces/<folder_name>`
- Automatically creates output folders if they don't exist

### Mock Server Generation (GET) (Alpha)
- Reads all json files within a directory tree and scaffolds out mock server endpoints for GET requests
---

## Installation
To install the package, run the following command
```
npm install typescript-scaffolder
```
---

## Usage in Code - Interfaces
### Schema Inference
There are two functions available to infer the schema generation for output preview:
```
inferJsonSchmea                 // produces a preview of the interface inferred from json
inferJsonSchemaFromPath         // reads a json file and produces a preview of the interface from a schema
```

The above functions can be used with either async / await or Promise patterns:
```
const res = await inferSchema(<stringified json object>)
# returns a promise containing the interpreted interface as a string, or null if fails

const res = await inferSchemaFromPath(<filepath as string>)
# returns a promise containing the interpreted interface as a string, or null if fails
```

### Interface Generation
Interface generation automatically calls inferSchemaFromPath and generates a typescript file containing the interface
```
 generateInterfaces          // takes json file and generates an interface file
 
 generateInterfacesFromPath  // takes a directory of 1 or more levels and generates interfaces for each json
                             // the read directory tree will also be duplicated
```
The above functions can be used with either async / await or Promise patterns:
```
 // inferSchemaFromPath is already called in these functions, you do not need to call it separately
 await generateInterfaces(<path to file, directory where file is located, output folder name>)

 await generateInterfacesFromPath(<schema directory, output directory>)
```

## Usage in CLI - Interfaces
You can run the package directly from the CLI if building locally or as a dependency
```
 ### Run from source (for local development)

 npx ts-node src/cli.ts -i schemas -o codegen/interfaces

 ### Run as a linked dependency

 yarn link
 # in your other project:
 yarn link typescript-codegen

    typescript-codegen --input schemas --output codegen/interfaces
```
## Usage In Code - Mock Server Scaffolding
You can run the mock server by using the following function
```
 await scaffoldMockServer(<dir where files are kept>)
```
The server will then automatically generate service endpoints and print


## Roadmap
[x] Generate typescript interfaces from schema definitions <br>
[X] Scaffolding for service mocking (GET) <br>
[ ] Scaffolding for service mocking (POST) <br>
[ ] Scaffolding for service mocking (PUT) <br>
[ ] Scaffolding for service mocking (DELETE) <br>
[ ] Generate enums from definitions <br>
[ ] Generate classes from schema definitions <br>
[ ] Declarative function generation <br>

## License
Licensed under the [MIT License](LICENSE).

