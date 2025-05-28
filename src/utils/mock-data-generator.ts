import {faker} from '@faker-js/faker';
import {Logger} from './logger';

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
            console.log("FROM FUNCTION", value)

            // Handle array type hints like "string[]"
            if (typeof value === 'string' && value.endsWith('[]')) {
                const baseType = value.replace('[]', '');
                Logger.debug(funcName, `Array type identified at key: ${String(key)} with base type ${baseType}`);
                autoFaked[key] = Array.from({length: arrayLength}).map(() =>
                    generatePrimitiveMock(baseType)
                );
                continue;
            }

            switch (value) {
                case 'string': {
                    Logger.debug(funcName, `String identified at key: ${String(key)}`);
                    autoFaked[key] = getFakerValueForKey(String(key)) ?? faker.lorem.word();
                    break;
                }
                case 'number': {
                    Logger.debug(funcName, `Number identified at key: ${String(key)}`);
                    autoFaked[key] = faker.number.int({min: 0, max: 100});
                    break;
                }
                case 'boolean': {
                    Logger.debug(funcName, `Boolean identified at key: ${String(key)}`);
                    autoFaked[key] = faker.datatype.boolean();
                    break;
                }
                case 'object':
                    autoFaked[key] = faker.lorem.words();
                    break;
                default: {
                    autoFaked[key] = handleDefaultCase(value, String(key), arrayLength);
                    break;
                }
            }
        }

        results.push(autoFaked);
    }
    return results;
}

export function generatePrimitiveMock(type: string): any {
    switch (type) {
        case 'string':
            return faker.lorem.word();
        case 'number':
            return faker.number.int({min: 0, max: 100});
        case 'boolean':
            return faker.datatype.boolean();
        default:
            return null;
    }
}

export function getFakerValueForKey(key: string): string | null {
    const funcName = 'getFakeValueForKey';
    Logger.debug(funcName, `String identified at key: ${String(key)}`);
    const lowerKey = key.toLowerCase();

    if (lowerKey.includes('email')) return faker.internet.email();
    if (lowerKey.includes('name')) return faker.person.fullName();
    if (lowerKey.includes('url')) return faker.internet.url();

    return null;
}

export function handleDefaultCase(value: any, key: string, arrayLength: number): any {
    const funcName = 'handleDefaultCase';

    if (
        Array.isArray(value) &&
        value.length > 0 &&
        typeof value[0] === 'object' &&
        value[0] !== null
    ) {
        Logger.debug(funcName, `Array of nested objects detected at key: ${key}`);
        return Array.from({ length: arrayLength }, () =>
            generateMockData(1, JSON.stringify(value[0]), arrayLength)[0]
        );
    }

    if (
        Array.isArray(value) &&
        value.length > 0 &&
        typeof value[0] === 'string'
    ) {
        Logger.debug(funcName, `Array of mixed primitive types detected at key: ${key}`);
        return value.map(type => generatePrimitiveMock(type));
    }

    if (typeof value === 'object' && value !== null) {
        Logger.debug(funcName, `Nested object detected at key: ${key}`);
        return generateMockData(1, JSON.stringify(value), arrayLength)[0];
    }

    Logger.warn(funcName, `Unknown type or unsupported structure at key: ${key}`);
    return null;
}