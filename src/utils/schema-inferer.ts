import {InputData, jsonInputForTargetLanguage, quicktype} from 'quicktype-core';
import fs from 'fs';
import {Logger} from './logger';
import {deriveObjectName} from "./object-helpers";

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
        return renameFirstInterface(result.lines.join('\n'), interfaceName);
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
        const json = fs.readFileSync(filePath, 'utf-8');
        Logger.debug(funcName, 'Successfully read json file');

        const interfaceName = deriveObjectName(filePath)
        Logger.debug(funcName, 'Inferring interface...');
        return await inferJsonSchema(json, interfaceName);
    } catch (error: any) {
        Logger.warn(funcName, `Failed to read file: ${filePath}`);
        return null;
    }
}
