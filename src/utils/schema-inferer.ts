import {InputData, jsonInputForTargetLanguage, quicktype} from 'quicktype-core';
import fs from 'fs';
import {Logger} from './logger';
import { deriveObjectName, findGloballyDuplicatedKeys, prefixDuplicateKeys } from "./object-helpers";
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
 * NOTE:
 * @param json
 * @param interfaceName
 */
export async function inferJsonSchema(json: string, interfaceName: string): Promise<string | null> {
    const funcName = 'inferJsonSchema';
    Logger.debug(funcName, 'Inferring schema...');

    try {
        // Step 1: Parse the raw JSON
        const parsed = JSON.parse(json);

        // Step 2: Detect globally duplicated keys
        const duplicateKeys = findGloballyDuplicatedKeys(parsed);
        Logger.debug(funcName, `Found duplicate keys: ${[...duplicateKeys].join(', ')}`);

        // Step 3: Prefix duplicate keys with parent field names
        const cleanedObject = prefixDuplicateKeys(parsed, duplicateKeys);

        // Step 4: Re-serialize cleaned JSON
        const cleanedJson = JSON.stringify(cleanedObject);

        // Step 5: Prepare Quicktype input
        const jsonInput = jsonInputForTargetLanguage('typescript');
        await jsonInput.addSource({
            name: interfaceName,
            samples: [cleanedJson]
        });

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

        // Step 6: Clean up nullable fields
        let cleanedLines = result.lines.map((line: string) =>
            line.replace(/(:\s*)null\b/, (_, group1) => `${group1}any`)
        );

        // Step 7: Strip prefixes from duplicated keys in field names
        if (duplicateKeys.size > 0) {
            cleanedLines = cleanedLines.map(line =>
                line.replace(/(\w+)_([a-zA-Z0-9_]+)/g, (_, prefix, key) => {
                    // If `key` is a known duplicated key, we un-prefix it
                    return duplicateKeys.has(key) ? key : `${prefix}_${key}`;
                })
            );
        }

        // Step 8: Ensure interface name is preserved
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

        const interfaceName = deriveObjectName(filePath);
        Logger.debug(funcName, 'Inferring interface...');
        return await inferJsonSchema(rawJson, interfaceName);

    } catch (error: any) {
        Logger.warn(funcName, `Failed to process schema: ${error.message}`);
        return null;
    }
}
