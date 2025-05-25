import {Logger} from "./logger";

export function assertRequiredFields(obj: Record<string, any>, required: string[]) {
    const funcName = 'assertRequiredFields';
    Logger.debug(funcName, 'Checking required fields', required);
    const missing = required.filter((key) => !(key in obj));
    if (missing.length > 0) {
        const err = `Missing required fields: ${missing.join(', ')}`
        Logger.error(funcName, err);
        throw new Error(err);
    }
    Logger.info(funcName, 'All required fields are present');
}

export function assertStructure(obj: any, structure: Record<string, string>) {
    const funcName = 'assertStructure';
    Logger.debug(funcName, 'Asserting structure', structure);
    for (const [key, expectedType] of Object.entries(structure)) {
        if (typeof obj[key] !== expectedType) {
            const err = `Field '${key}' should be of type '${expectedType}' but got '${typeof obj[key]}'`
            Logger.error(funcName, err);
            throw new Error(err);
        }
    }
    Logger.info(funcName, 'Structure successfully asserted');
}

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
            Logger.error(funcName, err)
            throw new Error(err);
        }
        seenKeys.add(key);
    }
    Logger.info(funcName, 'Asserted no duplicate keys');
}

export function assertEnumValue(field: string, value: any, allowed: any[]) {
    const funcName = 'assertEnumValue';
    Logger.debug(funcName, 'Asserting enum value', field, value);
    if (!allowed.includes(value)) {
        const err = `Field '${field}' must be one of ${JSON.stringify(allowed)}, got '${value}'`
        Logger.error(funcName, err);
        throw new Error(err);
    }
    Logger.info(funcName, 'Asserted enum values');
}

export function assertInRange(field: string, value: any, min: number, max: number) {
    const funcName = 'assertInRange';
    Logger.debug(funcName, 'Asserting in range', field, value, min, max)
    if (typeof value !== 'number') {
        const err = `Field '${field}' must be a number, got '${typeof value}'`
        Logger.error(funcName, err);
        throw new Error(err);
    }
    if (value < min || value > max) {
        const err = `Field '${field}' must be between ${min} and ${max}, got ${value}`
        Logger.error(funcName, err);
        throw new Error(err);
    }
    Logger.info(funcName, 'Asserted fields are in range');
}