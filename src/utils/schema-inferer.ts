import {InputData, jsonInputForTargetLanguage, quicktype} from 'quicktype-core';
import fs from 'fs';
import {Logger} from './logger';
import {deriveObjectName} from "./object-helpers";
import {assertNoDuplicateKeys, assertRequiredFields, assertStructure} from "./structure-validators";

/**
 * Used to override quicktypes naming coercion by restoring underscores
 * @param schema
 * @param newName
 */
function renameFirstInterface(schema: string, newName: string): string {
    return schema.replace(
        /export interface (\w+)/,
        () => `export interface ${newName}`
    );
}

/**
 * Infers a schema based on JSON string
 * NOTE: Use JSON.stringify(obj) on the JSON value before passing to this function
 * @param json
 * @param interfaceName
 */
export async function inferJsonSchema(json: string, interfaceName: string): Promise<string | null> {
    const funcName = 'inferJsonSchema';
    Logger.debug(funcName, 'Inferring schema...');

    try {
        const jsonInput = jsonInputForTargetLanguage('typescript');
        await jsonInput.addSource({
            name:  interfaceName,
            samples: [json]
        });

        Logger.debug(funcName, 'Storing json input...');
        const inputData = new InputData();
        inputData.addInput(jsonInput);
        Logger.debug(funcName, 'Awaiting quicktype result...');
        const result = await quicktype({
            inputData,
            lang: 'typescript',
            rendererOptions: {
                'infer-enums': 'false',
                'prefer-unions': 'false',
                'just-types': 'true',
            }
        });
        Logger.debug(funcName, 'Schema successfully inferred');
        const cleanedLines = result.lines.map((line: string) =>
            line.replace(/(:\s*)null\b/, (_, group1) => `${group1}any`)
        );
        return renameFirstInterface(cleanedLines.join('\n'), interfaceName);
    } catch (error: any) {
        Logger.warn(funcName, `Failed to infer JSON schema: ${error}`);
        return null;
    }
}

/**
 * Infers a schema from a JSON file
 * @param filePath
 */
export async function inferJsonSchemaFromPath(filePath: string): Promise<string | null> {
    const funcName = 'inferJsonSchemaFromPath';
    Logger.debug(funcName, 'Inferring schema from file...');

    try {
        const rawJson = fs.readFileSync(filePath, 'utf-8');
        Logger.debug(funcName, 'Successfully read json file');

        // 🔍 Check for duplicate keys in the raw JSON
        assertNoDuplicateKeys(rawJson);

        const parsed = JSON.parse(rawJson);

        // ✅ Only validate structure/fields if not an array
        if (!Array.isArray(parsed)) {
            // Add these checks only if they make sense for your domain
            assertRequiredFields(parsed, ['errorCode', 'errorDesc']);
            assertStructure(parsed, {
                errorCode: 'string',
                errorDesc: 'string',
                // Add more structure keys as needed
            });
        }

        const interfaceName = deriveObjectName(filePath);
        Logger.debug(funcName, 'Inferring interface...');
        return await inferJsonSchema(rawJson, interfaceName);

    } catch (error: any) {
        Logger.warn(funcName, `Failed to process schema: ${error.message}`);
        return null;
    }
}
