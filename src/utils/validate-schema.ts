export function assertRequiredFields(obj: Record<string, any>, required: string[]) {
    const missing = required.filter((key) => !(key in obj));
    if (missing.length > 0) {
        throw new Error(`❌ Missing required fields: ${missing.join(', ')}`);
    }
}

export function assertStructure(obj: any, structure: Record<string, string>) {
    for (const [key, expectedType] of Object.entries(structure)) {
        if (typeof obj[key] !== expectedType) {
            throw new Error(
                `❌ Field '${key}' should be of type '${expectedType}' but got '${typeof obj[key]}'`
            );
        }
    }
}

export function assertNoDuplicateKeys(jsonString: string) {
    const seenKeys = new Set<string>();
    const regex = /"([^"\\]*(?:\\.[^"\\]*)*)"\s*:/g; // Handles escaped quotes
    let match;
    while ((match = regex.exec(jsonString))) {
        const key = match[1];
        if (seenKeys.has(key)) {
            throw new Error(`❌ Duplicate key detected: ${key}`);
        }
        seenKeys.add(key);
    }
}

export function assertEnumValue(field: string, value: any, allowed: any[]) {
    if (!allowed.includes(value)) {
        throw new Error(
            `❌ Field '${field}' must be one of ${JSON.stringify(allowed)}, got '${value}'`
        );
    }
}

export function assertInRange(field: string, value: any, min: number, max: number) {
    if (typeof value !== 'number') {
        throw new Error(`❌ Field '${field}' must be a number, got '${typeof value}'`);
    }
    if (value < min || value > max) {
        throw new Error(`❌ Field '${field}' must be between ${min} and ${max}, got ${value}`);
    }
}