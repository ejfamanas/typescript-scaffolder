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
    Logger.debug(funcName, 'All required fields are present');
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
    Logger.debug(funcName, 'Structure successfully asserted');
}

/**
 * Checks to see if there are any duplicate keys within the JSON
 * @param jsonString
 */
export function assertNoDuplicateKeys(jsonString: string, filename: string) {
    const funcName = 'assertNoDuplicateKeys';
    Logger.debug(funcName, 'Asserting no duplicate keys', jsonString)
    const seenKeys = new Set<string>();
    const regex = /"([^"\\]*(?:\\.[^"\\]*)*)"\s*:/g;
    let match;
    while ((match = regex.exec(jsonString))) {
        const key = match[1];
        if (seenKeys.has(key)) {
            const err = `Duplicate key detected: ${key} in ${filename}`
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
    Logger.debug(funcName, 'Asserted enum values');
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
    Logger.debug(funcName, 'Asserted fields are in range');
}


/**
 * Validates a top-level sequences array, if present.
 * @param config The full parsed configuration object
 */
export function assertSequences(config: any) {
    const funcName = 'assertSequences';
    Logger.debug(funcName, 'Validating sequences block');
    const sequences = config.sequences;
    if (sequences === undefined || sequences === null) {
        Logger.error(funcName, 'No sequences defined');
        return;
    }
    if (!Array.isArray(sequences)) {
        Logger.error(funcName, '`sequences` must be an array');
        return;
    }
    for (const seq of sequences) {
        assertSequence(seq);
    }
    Logger.debug(funcName, 'Sequences block validated');
}

/**
 * Validates a single sequence object.
 * Ensures required fields and step-array structure before recursing.
 * @param seq The sequence object to validate
 */
export function assertSequence(seq: any) {
    const funcName = 'assertSequence';
    Logger.debug(funcName, 'Validating sequence', seq.name);

    if (seq.name === undefined) {
        Logger.error(funcName, "Missing required field 'name'");
        return;
    }
    if (seq.steps === undefined) {
        Logger.error(funcName, "Missing required field 'steps'");
        return;
    }
    if (!Array.isArray(seq.steps)) {
        Logger.error(funcName, `\`steps\` must be an array in sequence ${seq.name}`);
        return;
    }
    for (const step of seq.steps) {
        assertSequenceStep(step);
    }
    Logger.debug(funcName, 'Sequence validated', seq.name);
}

/** Validate a single step based on its type */
export function assertSequenceStep(step: any) {
    const funcName = 'assertSequenceStep';
    Logger.debug(funcName, 'Validating step', step.id);
    assertRequiredFields(step, ['id', 'type']);
    switch (step.type) {
        case 'fetchList':
            assertFetchListStep(step);
            break;
        case 'action':
            assertActionStep(step);
            break;
        case 'loop':
            assertLoopStep(step);
            break;
        default:
            Logger.error(funcName, `Unknown step type '${step.type}' in step ${step.id}`);
    }
}

/** Validate a fetchList step */
function assertFetchListStep(step: any) {
    const funcName = 'assertFetchListStep';
    Logger.debug(funcName, 'Validating fetchList step', step.id);
    assertRequiredFields(step, ['endpoint', 'extract']);
    assertStructure(step, { endpoint: 'string', extract: 'object' });
    if (step.extract) {
        assertStructure(step.extract, { as: 'string', field: 'string' });
    }
    Logger.debug(funcName, 'fetchList step validated', step.id);
}

/** Validate an action step */
function assertActionStep(step: any) {
    const funcName = 'assertActionStep';
    Logger.debug(funcName, 'Validating action step', step.id);
    assertRequiredFields(step, ['endpoint']);
    assertStructure(step, { endpoint: 'string' });
    if (step.extract) {
        assertStructure(step.extract, { as: 'string', field: 'string' });
    }
    Logger.debug(funcName, 'action step validated', step.id);
}

/** Validate a loop step */
function assertLoopStep(step: any) {
    const funcName = 'assertLoopStep';
    Logger.debug(funcName, 'Validating loop step', step.id);
    assertRequiredFields(step, ['over', 'itemName', 'steps']);
    assertStructure(step, { over: 'string', itemName: 'string', steps: 'object' });
    if (Array.isArray(step.steps)) {
        for (const nested of step.steps) {
            assertSequenceStep(nested);
        }
    }
    Logger.debug(funcName, 'loop step validated', step.id);
}

