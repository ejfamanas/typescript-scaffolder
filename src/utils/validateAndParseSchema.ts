import Ajv from 'ajv';
import { compileFromFile } from 'json-schema-to-typescript';
import fs from 'fs';

const ajv = new Ajv();

export async function validateAndGenerate(schemaPath: string, outputInterfacePath: string) {
    const rawSchema = fs.readFileSync(schemaPath, 'utf-8');
    const parsedSchema = JSON.parse(rawSchema);

    const isValid = ajv.validateSchema(parsedSchema);
    if (!isValid) {
        throw new Error(`❌ Invalid schema:\n${JSON.stringify(ajv.errors, null, 2)}`);
    }

    const tsInterface = await compileFromFile(schemaPath, {
        bannerComment: '',
    });

    fs.writeFileSync(outputInterfacePath, tsInterface);
    console.log(`✅ TypeScript interface written to ${outputInterfacePath}`);
}