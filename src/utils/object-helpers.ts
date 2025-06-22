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

/**
 * scans a json object and identifies all duplicate keys for preprocessing
 * @param input
 */
export function findGloballyDuplicatedKeys(input: any): Set<string> {
	const funcName = 'findGloballyDuplicatedKeys';
	Logger.debug(funcName, 'finding globally duplciated keys...');

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

/**
 * A preprocessor for Quicktype to prefix duplicate keys so that it does not create circular references
 * or bad interfaces. Will prefix all duplicate keys with the field name of the parent. The prefix is then
 * removed later downstream.
 * @param input
 * @param duplicateKeys
 */
export function prefixDuplicateKeys(input: any, duplicateKeys: Set<string>): any {
	const funcName = 'prefixDuplicateKeys';
	const clone = JSON.parse(JSON.stringify(input)); // deep clone to avoid mutation

	function transform(node: any, parentKey: string | null = null): void {
		if (Array.isArray(node)) {
			const objectElements = node.filter(item => typeof item === 'object' && item !== null);

			if (objectElements.length > 1) {
				const msg = `Array at key '${parentKey}' contains more than one object:`
				Logger.error(funcName,
					msg,
					JSON.stringify(node, null, 2)
				);
			}
			// Recurse on the first object element (if any)
			if (objectElements.length === 1) {
				transform(objectElements[0], parentKey);
			}
			// Primitive arrays are ignored
			return;
		}
		if (typeof node === 'object' && node !== null) {
			// First: rewrite duplicate keys
			if (parentKey) {
				for (const key of Object.keys(node)) {
					if (duplicateKeys.has(key)) {
						node[`${parentKey}_${key}`] = node[key];
						delete node[key];
					}
				}
			}

			// Then recurse into each property
			for (const key of Object.keys(node)) {
				transform(node[key], key);
			}
		}
	}

	transform(clone);
	return clone;
}