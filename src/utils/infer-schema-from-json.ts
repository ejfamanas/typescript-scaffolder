import { quicktype, InputData, jsonInputForTargetLanguage } from 'quicktype-core';
import fs from 'fs';
import { Logger } from './logger';

/**
 * Infers a schema based on JSON string
 * NOTE: Use JSON.stringify(obj) on the JSON value before passing to this function
 */
export async function inferSchema(json: string): Promise<string | null> {
    const funcName = 'inferSchema';
    Logger.debug(funcName, 'Inferring schema...');

    try {
        const jsonInput = jsonInputForTargetLanguage('typescript');

        await jsonInput.addSource({
            name: 'User',
            samples: [json]
        });

        const inputData = new InputData();
        inputData.addInput(jsonInput);

        const result = await quicktype({
            inputData,
            lang: 'typescript',
            rendererOptions: { 'just-types': 'true' }
        });

        Logger.info(funcName, 'Successfully inferred schema');

        return result.lines.join('\n');
    } catch (error: any) {
        Logger.warn(funcName, `Failed to infer JSON schema: ${error}`);
        return null;
    }
}

/**
 * Infers a schema from a JSON file
 */
export async function inferSchemaFromPath(filePath: string): Promise<string | null> {
    const funcName = 'inferSchemaFromPath';
    Logger.debug(funcName, 'Inferring schema from file...');
    try {
        const json = fs.readFileSync(filePath, 'utf-8');
        Logger.info(funcName, 'Successfully read json file');
        return await inferSchema(json);
    } catch (error: any) {
        Logger.warn(funcName, `Failed to read file: ${filePath}`);
        return null;
    }
}