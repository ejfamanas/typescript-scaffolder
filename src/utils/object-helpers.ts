import path from 'path';
import { Logger } from "./logger";

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

export function findGloballyDuplicatedKeys(input: any): Set<string> {
	const keyCounts = new Map<string, number>();

	function scan(node: any): void {
		if (Array.isArray(node)) {
			node.forEach(scan);
		} else if (typeof node === 'object' && node !== null) {
			for (const key of Object.keys(node)) {
				keyCounts.set(key, (keyCounts.get(key) || 0) + 1);
				scan(node[key]);
			}
		}
	}

	scan(input);

	return new Set([...keyCounts.entries()]
		.filter(([_, count]) => count > 1)
		.map(([key]) => key));
}

export function prefixDuplicateKeys(input: any, duplicateKeys: Set<string>): any {
	const clone = JSON.parse(JSON.stringify(input));

	function transform(node: any, parentKey: string | null = null): void {
		if (Array.isArray(node)) {
			if (node.length > 1) {
				Logger.error('prefixDuplicateKeys', `Array at key '${parentKey}' contains more than one item:`, JSON.stringify(node, null, 2));
				throw new Error(`prefixDuplicateKeys: Only one element is allowed in arrays. Found array of length ${node.length} at key '${parentKey}'`);
			}
			if (node.length > 0) {
				transform(node[0], parentKey);
			}
		} else if (typeof node === 'object' && node !== null) {
			if (parentKey) {
				for (const key of Object.keys(node)) {
					if (duplicateKeys.has(key)) {
						node[`${parentKey}_${key}`] = node[key];
						delete node[key];
					}
				}
			}

			for (const key in node) {
				transform(node[key], key);
			}
		}
	}

	transform(clone);
	return clone;
}