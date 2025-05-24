import path from 'path';
import {validateAndGenerate} from "./src/utils/validateAndParseSchema";
import {inferSchemaFromExample} from "./src/utils/inferSchemaFromJson";
import fs from "fs";
import {coerceJson} from "./src/utils/coerceJsonValues";

async function main() {
    const getPath = (prefix: string) => `./src/schemas/examples/${prefix}-user.schema.json`
    // test type coercion
    const raw = fs.readFileSync(getPath("string"), 'utf-8');
    const parsed = JSON.parse(raw);
    const normalized = coerceJson(parsed);
    console.log("coercion", normalized)
    // test type inference
    const file = getPath("typed");
    const ts = await inferSchemaFromExample(file);
    console.log("typings", ts)
    const schemaPath = path.resolve(__dirname, file);
    const outputPath = path.resolve(__dirname, './types/User.ts');

    await validateAndGenerate(schemaPath, outputPath);
}

main().catch(console.error);