import { faker } from "@faker-js/faker";
import { Logger } from "../logger";
import { generateMockData } from "./mock-data-generator";

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

/**
 * Determines whether a given type represents an array type.
 */
export function isArrayType(type: string): boolean {
    return type.endsWith("[]") || type.startsWith("Array<");
}

/**
 * Determines whether a given type represents a Date.
 */
export function isDateType(type: string): boolean {
    return type === "Date" || type.includes("Date");
}

/**
 * Extracts the base type from an array type.
 */
export function extractBaseType(type: string): string {
    return type.replace("[]", "").replace(/^Array<|>$/g, "");
}