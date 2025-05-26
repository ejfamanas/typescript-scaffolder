import path from 'path';
import {Logger} from "./logger";

/**
 * Converts a filename (e.g. user-profile.json or order_log.json)
 * into a PascalCase TypeScript interface name (e.g. UserProfile, OrderLog).
 */
export function deriveInterfaceName(filePath: string): string {
    const funcName = 'deriveInterfaceName';
    Logger.info(funcName, 'deriving interface name from filename...')
    const fileBase = path.basename(filePath, '.json');
    return fileBase
        .split(/[-_]/)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');
}