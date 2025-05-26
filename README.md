# TypeScript Code Generator

Generates typescript code based off of files or schemas such as JSON. 
## ✨ Version 1.0 Features

### Interface Generation
Generate TypeScript interfaces automatically from JSON schemas or raw JSON data.

- 🔍 Infers full TypeScript interfaces using [quicktype](https://github.com/quicktype/quicktype)
- 🧠 Supports nested objects, arrays, optional fields, unions
- 🛠 Preserves directory structure from i.e. `schemas/<folder_name>` into `codegen/interfaces/<folder_name>`
- 📁 Automatically creates output folders if they don't exist
- 🧪 Independent logging and unit tests to aid in debugging
---

### Installation
To install the package, run the following command
```
TODO
```
---

## Usage in Code - Interfaces
### Schema Inference
There are two functions available to infer the schema generation for output preview:
```
inferSchmea                 // produces a preview of the interface inferred from a schema
inferSchemaFromPath         // reads a json file and produces a preview of the interface from a schema
```

The above functions can be used with either async / await or Promise patterns:
```
const res = await inferSchema(<stringified json object)
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
## License
Licensed under the [MIT License](LICENSE).

