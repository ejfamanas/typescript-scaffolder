import { Logger } from '../logger';
import { generatePrimitiveMock, handleDefaultCase } from "./mock-value-core";
import { getRuntimeFakerValueForKey } from "./mock-value-resolver";

/**
 * Generates a mock data sample from a type-hinted json schema
 * @param count
 * @param schemaJson
 * @param arrayLength
 */
export function generateMockData(
    count: number,
    schemaJson: string,
    arrayLength = 1
): any[] {
    const funcName = 'generateMockData';
    Logger.debug(funcName, 'Starting mock data generation...');
    const results: any[] = [];

    const schema = JSON.parse(schemaJson);
    for (let i = 0; i < count; i++) {
        const autoFaked: Record<string, any> = {};

        Logger.debug(funcName, `Identified the following keys: ${Object.keys(schema).join(', ')}`);

        for (const key of Object.keys(schema)) {
            const value = schema[key];

            // Handle array type hints like "string[]"
            if (typeof value === 'string' && value.endsWith('[]')) {
                const baseType = value.replace('[]', '');
                Logger.debug(funcName, `Array type identified at key: ${String(key)} with base type ${baseType}`);
                autoFaked[key] = Array.from({length: arrayLength}).map(() =>
                    generatePrimitiveMock(baseType)
                );
                continue;
            }

            if (typeof value === 'string') {
                Logger.debug(funcName, `Primitive type string detected at key: ${String(key)} with type hint: ${value}`);
                autoFaked[key] = getRuntimeFakerValueForKey(String(key)) ?? generatePrimitiveMock(value);
            } else {
                autoFaked[key] = handleDefaultCase(value, String(key), arrayLength);
            }
        }

        results.push(autoFaked);
    }
    return results;
}