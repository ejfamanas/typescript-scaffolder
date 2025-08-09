import {InputData, jsonInputForTargetLanguage, quicktype} from 'quicktype-core';
import {Logger} from './logger';
import { deriveObjectName, findGloballyDuplicatedKeys, prefixDelimiter, prefixDuplicateKeys } from "./object-helpers";
import {assertNoDuplicateKeys} from "./structure-validators";
import fs from "fs";
import path from "path";

/**
 * Used to override quicktypes naming coercion by restoring underscores
 * @param schema
 * @param newName
 */
function renameFirstInterface(schema: string, newName: string): string {
    return schema.replace(
        /export interface (\w+)/,
        () => `export interface ${newName}`
    );
}

/**
 * Infers a schema based on JSON string
 * NOTE: Use JSON.stringify(obj) on the JSON value before passing to this function
 * NOTE:
 * @param json
 * @param interfaceName
 */
export async function inferJsonSchema(json: string, interfaceName: string): Promise<string | null> {
    const funcName = 'inferJsonSchema';
    Logger.debug(funcName, 'Inferring schema...');

    let parsed: any;
    try {
        parsed = JSON.parse(json);
    } catch (err: any) {
        const message = err?.message ?? String(err);
        const preview = json.slice(0, 120) + (json.length > 120 ? '…' : '');
        const fullMessage = `Invalid JSON input: ${message}. Preview: ${preview}`;
        Logger.warn(funcName, fullMessage);
        throw new Error(fullMessage);
    }

    try {
        // Step 2: Detect globally duplicated keys
        const duplicateKeys = findGloballyDuplicatedKeys(parsed);
        // @ts-ignore - works fine, already set to target ES2020
        Logger.debug(funcName, `Found duplicate keys: ${[...duplicateKeys].join(', ')}`);

        // Step 3: Prefix duplicate keys with parent field names
        const prefixedKeys = new Set<string>();

        const cleanedObject = prefixDuplicateKeys(parsed, duplicateKeys, prefixedKeys);

        // Step 4: Re-serialize cleaned JSON
        const cleanedJson = JSON.stringify(cleanedObject);

        // Step 5: Prepare Quicktype input
        const jsonInput = jsonInputForTargetLanguage('typescript');
        await jsonInput.addSource({
            name: interfaceName,
            samples: [cleanedJson]
        });

        const inputData = new InputData();
        inputData.addInput(jsonInput);

        Logger.debug(funcName, 'Awaiting quicktype result...');
        const result = await quicktype({
            inputData,
            lang: 'typescript',
            rendererOptions: {
                'infer-enums': 'false',
                'prefer-unions': 'false',
                'just-types': 'true',
            }
        });

        Logger.debug(funcName, 'Schema successfully inferred');

        // Step 6: Clean up nullable fields
        let cleanedLines = result.lines.map((line: string) =>
            line.replace(
                /(\s*)(?:(['"`].+?['"`])|(\w+))\s*:\s*null\b/,
                (_: string, spacing: string, quoted?: string, bare?: string) =>
                    `${spacing}${quoted ?? bare}?: any`
            )
        );

        // Step 7: Strip prefixes from duplicated keys in field names (only those we actually prefixed)
        if (prefixedKeys.size > 0) {
            const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const prefixedList = Array.from(prefixedKeys);

            cleanedLines = cleanedLines.map(line => {
                let out = line;
                for (const pk of prefixedList) {
                    const unprefixed = pk.split(prefixDelimiter).pop()!;
                    const pattern = new RegExp(escapeRegExp(pk), 'g');
                    out = out.replace(pattern, unprefixed);
                }
                return out;
            });
        }

        // Step 7.a: Remove delimiter core left inside identifier names by Quicktype (e.g., DataPREFIXObject)
        {
            const core = prefixDelimiter.replace(/_/g, ''); // e.g., "PREFIX"
            const coreCapitalized = core.charAt(0) + core.slice(1).toLowerCase(); // e.g., "Prefix"

            const idToken = new RegExp(`([A-Za-z0-9_])${core}(?=[A-Za-z0-9_])`, 'g');
            const idTokenCap = new RegExp(`([A-Za-z0-9_])${coreCapitalized}(?=[A-Za-z0-9_])`, 'g');

            cleanedLines = cleanedLines.map((line: string) =>
                line.replace(idToken, '$1').replace(idTokenCap, '$1')
            );
        }

        // Step 7.5: Validate no accidental duplicate keys in final TypeScript output
        {
            const interfaceStart = /^\s*export interface\s+(\w+)\s*\{/;
            const propertyLine = /^\s*(?:(["'`])([^"'`]+)\1|([A-Za-z_$][\w$]*))\??\s*:/;

            let currentInterface: string | null = null;
            let seen = new Set<string>();
            const dupes: Record<string, Set<string>> = {};

            for (const line of cleanedLines) {
                const startMatch = line.match(interfaceStart);
                if (startMatch) {
                    currentInterface = startMatch[1];
                    seen = new Set<string>();
                    continue;
                }
                if (currentInterface && line.trim().startsWith('}')) {
                    currentInterface = null;
                    continue;
                }
                if (!currentInterface) continue;

                const propMatch = line.match(propertyLine);
                if (propMatch) {
                    const name = (propMatch[2] ?? propMatch[3] ?? '').trim();
                    const norm = name; // already unprefixed and normalized by prior steps
                    if (seen.has(norm)) {
                        if (!dupes[currentInterface]) dupes[currentInterface] = new Set<string>();
                        dupes[currentInterface]!.add(norm);
                    } else {
                        seen.add(norm);
                    }
                }
            }

            const entries = Object.entries(dupes).filter(([, set]) => set.size > 0);
            if (entries.length > 0) {
                const msg = entries
                    .map(([iface, set]) => `${iface}: ${Array.from(set).join(', ')}`)
                    .join('; ');
                throw new Error(`Duplicate properties found in interface(s) ${msg}`);
            }
        }
        // Step 8: Ensure interface name is preserved
        return renameFirstInterface(cleanedLines.join('\n'), interfaceName);
    } catch (error: any) {
        Logger.warn(funcName, `Failed to infer JSON schema: ${error}`);
        return null;
    }
}

/**
 * Infers a schema from a JSON file
 * @param filePath
 */
export async function inferJsonSchemaFromPath(filePath: string): Promise<string | null> {
    const funcName = 'inferJsonSchemaFromPath';
    Logger.debug(funcName, 'Inferring schema from file...');

    try {
        const rawJson = fs.readFileSync(filePath, 'utf-8');
        Logger.debug(funcName, 'Successfully read json file');

        // 🔍 Check for duplicate keys in the raw JSON
        assertNoDuplicateKeys(rawJson, path.relative(process.cwd(), filePath));

        const interfaceName = deriveObjectName(filePath);
        Logger.debug(funcName, 'Inferring interface...');
        return await inferJsonSchema(rawJson, interfaceName);

    } catch (error: any) {
        Logger.warn(funcName, `Failed to process schema: ${error.message}`);
        return null;
    }
}
