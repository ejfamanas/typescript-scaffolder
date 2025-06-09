import path from 'path';
import {Logger} from "./logger";

/**
 * Converts a filename (e.g. user-profile.json or order_log.json)
 * into a PascalCase TypeScript interface name (e.g. UserProfile, OrderLog).
 * @param filePath
 */
export function deriveObjectName(filePath: string): string {
    const funcName = 'deriveObjectName';
    Logger.debug(funcName, 'deriving object name from filename...');
    const fileBase = path.basename(filePath, '.json');

    // Preserve underscores, strip dashes
    const rawParts = fileBase.split(/(_|-)/g); // include delimiters
    const transformed = rawParts.map(part => {
        if (part === '-') return '';
        if (part === '_') return '_';
        return part.charAt(0).toUpperCase() + part.slice(1);
    });

    return transformed.join('');
}

/**
 * Takes in a stringified value and infers the primitive type
 * @param value
 */
export function inferPrimitiveType(value: string): 'string' | 'number' | 'boolean' {
    if (value === 'true' || value === 'false') return 'boolean';
    if (!isNaN(Number(value))) return 'number';
    return 'string';
}