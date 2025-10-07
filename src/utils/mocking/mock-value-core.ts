import { faker } from "@faker-js/faker";
import { Logger } from "../logger";
import { generateMockData } from "./mock-data-generator";

/**
 * Used to get faker values for basic primitive types
 * @param type
 */
export function generatePrimitiveMock(type: string): string | number | boolean {
    const funcName = "generatePrimitiveMock";
    Logger.debug(funcName, `Getting primitive value for type ${type}`);
    switch (type.toLowerCase()) {
        case "string":
            return faker.lorem.word();
        case "number":
            return faker.number.int({ min: 0, max: 100 });
        case "boolean":
            return faker.datatype.boolean();
        case "date":
            return faker.date.recent().toISOString();
        default:
            return `UnhandledType<${type}>`; // easier to catch visually
    }
}

/**
 * Handles default cases and calls the appropriate mock generative function based in value
 * @param value
 * @param key
 * @param arrayLength
 */
export function handleDefaultCase(value: any, key: string, arrayLength: number): any {
    const funcName = "handleDefaultCase";
    Logger.debug(funcName, "Handling default cases...");
    if (
        Array.isArray(value) &&
        value.length > 0 &&
        typeof value[0] === "object" &&
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
        typeof value[0] === "string"
    ) {
        Logger.debug(funcName, `Array of mixed primitive types detected at key: ${key}`);
        return value.map(type => generatePrimitiveMock(type));
    }

    if (typeof value === "object" && value !== null) {
        Logger.debug(funcName, `Nested object detected at key: ${key}`);
        return generateMockData(1, JSON.stringify(value), arrayLength)[0];
    }

    Logger.warn(funcName, `Unknown type or unsupported structure at key: ${key}`);
    return `UnhandledType<${JSON.stringify(value)}>`;
}

/**
 * Determines whether a given type represents an array type.
 * @param type
 */
export function isArrayType(type: string): boolean {
    const funcName = "isArrayType";
    Logger.debug(funcName, "Testing if value is of type array...")
    return type.endsWith("[]") || type.startsWith("Array<");
}

/**
 * Determines whether a given type represents a Date.
 * @param type
 */
export function isDateType(type: string): boolean {
    const funcName = "isDateType";
    Logger.debug(funcName, "Testing if value is of type Date...")
    return type === "Date" || type.includes("Date");
}

/**
 * Extracts the base type from an array type.
 * @param type
 */
export function extractBaseType(type: string): string {
    const funcName = "extractBaseType";
    Logger.debug(funcName, "extracting base type...")
    return type.replace("[]", "").replace(/^Array<|>$/g, "");
}