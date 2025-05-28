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
                autoFaked[key] = getFakerValueForKey(String(key)) ?? generatePrimitiveMock(value);
            } else {
                autoFaked[key] = handleDefaultCase(value, String(key), arrayLength);
            }
        }

        results.push(autoFaked);
    }
    return results;
}

export function generatePrimitiveMock(type: string): string | number | boolean {
    switch (type.toLowerCase()) {
        case 'string':
            return faker.lorem.word();
        case 'number':
            return faker.number.int({ min: 0, max: 100 });
        case 'boolean':
            return faker.datatype.boolean();
        case 'date':
            return faker.date.recent().toISOString();
        default:
            return `UnhandledType<${type}>`; // easier to catch visually
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
    return `UnhandledType<${JSON.stringify(value)}>`;
}