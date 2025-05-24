import fs from "fs";
import {inferSchema, inferSchemaFromPath} from "./src/utils/infer-schema-from-json";
import {safeCoerceJson} from "./src/utils/coerce-json-values";

async function main() {
    const getPath = (prefix: string) => `./src/schemas/examples/${prefix}-user.schema.json`
    // test type coercion
    const typedFile = getPath("typed");
    const typings = await inferSchemaFromPath(typedFile)
    console.log("Typed file:", typings)

    // Stringified JSON version (testing coercion + inference)
    const rawJson = fs.readFileSync(typedFile, 'utf-8');
    const parsed = JSON.parse(rawJson);
    const stringified = JSON.stringify(parsed);
    const coerced = safeCoerceJson(stringified); // This will now normalize codegen

    const reTypings = await inferSchema(JSON.stringify(coerced));
    console.log("Stringified input:", reTypings);
}

main().catch(console.error);