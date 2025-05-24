import {inferSchema, inferSchemaFromPath} from "./src/utils/inferSchemaFromJson";
import fs from "fs";
import {safeCoerceJson} from "./src/utils/coerceJsonValues";

function normalizeWhitespace(str: string): string {
    return str.replace(/\s+/g, ' ').trim();
}

function assertEqualTypes(typeA: string, typeB: string): void {
    const normA = normalizeWhitespace(typeA);
    const normB = normalizeWhitespace(typeB);

    if (normA !== normB) {
        console.error("❌ Type outputs are not equal.");
        console.error("▶️  From typed object:\n", typeA);
        console.error("▶️  From coerced stringified:\n", typeB);
        throw new Error("Inferred type outputs do not match.");
    }

    console.log("✅ Inferred typings are equal.");
}

async function main() {
    const getPath = (prefix: string) => `./src/schemas/examples/${prefix}-user.schema.json`;

    // From properly typed object
    const typedFile = getPath("typed");
    const typings = await inferSchemaFromPath(typedFile);
    console.log("▶️ From typed JSON:\n", typings);

    // From coerced stringified input
    const rawJson = fs.readFileSync(typedFile, 'utf-8');
    const coerced = safeCoerceJson(rawJson);
    const reTypings = await inferSchema(JSON.stringify(coerced));
    console.log("▶️ From stringified + coerced JSON:\n", reTypings);

    // Equality check
    assertEqualTypes(typings, reTypings);
}

main().catch(console.error);