import {Logger} from "./logger";

/**
 * Checks an object to see if all required fields are present
 * @param obj
 * @param required
 */
export function assertRequiredFields(obj: Record<string, any>, required: string[]) {
    const funcName = 'assertRequiredFields';
    Logger.debug(funcName, 'Checking required fields', required);
    const missing = required.filter((key) => !(key in obj));
    if (missing.length > 0) {
        const err = `Missing required fields: ${missing.join(', ')}`
        Logger.error(funcName, err);
    }
    Logger.info(funcName, 'All required fields are present');
}

/**
 * Checks an object to see if the structure is correct to what is expected
 * @param obj
 * @param structure
 */
export function assertStructure(obj: any, structure: Record<string, string>) {
    const funcName = 'assertStructure';
    Logger.debug(funcName, 'Asserting structure', structure);
    for (const [key, expectedType] of Object.entries(structure)) {
        if (typeof obj[key] !== expectedType) {
            const err = `Field '${key}' should be of type '${expectedType}' but got '${typeof obj[key]}'`
            Logger.warn(funcName, err);
        }
    }
    Logger.info(funcName, 'Structure successfully asserted');
}

/**
 * Checks to see if there are any duplicate keys within the JSON
 * @param jsonString
 */
export function assertNoDuplicateKeys(jsonString: string) {
    const funcName = 'assertNoDuplicateKeys';
    Logger.debug(funcName, 'Asserting no duplicate keys', jsonString)
    const seenKeys = new Set<string>();
    const regex = /"([^"\\]*(?:\\.[^"\\]*)*)"\s*:/g;
    let match;
    while ((match = regex.exec(jsonString))) {
        const key = match[1];
        if (seenKeys.has(key)) {
            const err = `Duplicate key detected: ${key}`
            Logger.warn(funcName, err)
        }
        seenKeys.add(key);
    }
    Logger.debug(funcName, 'Asserted no duplicate keys');
}

/**
 * Checks to see if all values within an enum are valid
 * @param field
 * @param value
 * @param allowed
 */
export function assertEnumValue(field: string, value: any, allowed: any[]) {
    const funcName = 'assertEnumValue';
    Logger.debug(funcName, 'Asserting enum value', field, value);
    if (!allowed.includes(value)) {
        const err = `Field '${field}' must be one of ${JSON.stringify(allowed)}, got '${value}'`
        Logger.warn(funcName, err);
    }
    Logger.info(funcName, 'Asserted enum values');
}

/**
 * Checks to see whether the value declared in a spec is within the min and max range
 * @param field
 * @param value
 * @param min
 * @param max
 */
export function assertInRange(field: string, value: any, min: number, max: number) {
    const funcName = 'assertInRange';
    Logger.debug(funcName, 'Asserting in range', field, value, min, max)
    if (typeof value !== 'number') {
        const err = `Field '${field}' must be a number, got '${typeof value}'`
        Logger.warn(funcName, err);
    }
    if (value < min || value > max) {
        const err = `Field '${field}' must be between ${min} and ${max}, got ${value}`
        Logger.warn(funcName, err);
    }
    Logger.info(funcName, 'Asserted fields are in range');
}