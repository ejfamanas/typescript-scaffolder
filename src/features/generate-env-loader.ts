import { Project, Scope } from 'ts-morph';
import * as fs from 'fs';
import dotenv from 'dotenv';
import { ensureDir } from "../utils/file-system";
import { inferPrimitiveType } from "../utils/object-helpers";
import { Logger } from "../utils/logger";
import path from "path";

dotenv.config();

/**
 * Generates a typed runtime accessor and key enum from an example environment file.
 *
 * @param envFile
 * @param outputDir
 * @param outputFile
 * @param envClassName
 * @param envEnumName
 */
export function generateEnvLoader(
    envFile: string,
    outputDir: string,
    outputFile: string,
    envClassName = 'EnvConfig',
    envEnumName = 'EnvKeys'
): void {
    const funcName = "generateEnvLoader";
    Logger.debug(funcName, 'Generating env accessor');
    // need to make sure the new codegen root exists
    ensureDir(outputDir);
    const baseEnvFile = path.basename(envFile);

    if (!/^\.env(\..+)?$/.test(baseEnvFile) && baseEnvFile !== '.env') {
        const error = `Expected an .env* file but received: ${envFile}`;
        Logger.error(funcName, error);
        throw new Error(funcName);
    }

    if (!fs.existsSync(envFile)) {
        const error = `ENV file does not exist at path: ${envFile}`
        Logger.error(funcName, error);
        throw new Error(funcName);
    }

    const contents = fs.readFileSync(envFile, 'utf-8');
    // Keep quoted values together across lines so their contents cannot become generated keys.
    const assignments = /^(?![ \t]*#)([^=\r\n]*)=[ \t]*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|[^#\r\n]*)[^\r\n]*/gm;
    const envVars = Array.from(contents.matchAll(assignments), ([, rawKey, rawValue]) => {
        const cleanKey = rawKey.trim();
        const value = rawValue.trim();
        const inferred = inferPrimitiveType(value);
        // test proper key naming
        const keyPattern = /^[A-Z_][A-Z0-9_]*$/;
        if (!keyPattern.test(cleanKey)) {
            const error = `Invalid env key format: ${cleanKey}`;
            Logger.error(funcName, error);
            throw new Error(funcName);
        }
        // warn on empty values
        if (value === '') {
            Logger.warn(funcName, `Empty value detected for env key: ${cleanKey}`);
        }
        return {key: cleanKey, inferred};

    });

    // Test min var count
    if (envVars.length < 2) {
        Logger.warn('generateEnvLoader', `Only ${envVars.length} environment variables found.`);
    }

    // test duplicate keys
    const seenKeys = new Set<string>();
    for (const {key} of envVars) {
        if (seenKeys.has(key)) {
            Logger.error(funcName, `Duplicate env key detected: ${key}`);
            throw new Error(funcName);
        }
        seenKeys.add(key);
    }
    const project = new Project();

    const sourceFile = project.createSourceFile(`${outputDir}/${outputFile}`, '', {overwrite: true});
    const readers = {string: 'readString', number: 'readNumber', boolean: 'readBoolean'};
    const envClass = sourceFile.addClass({
        name: envClassName,
        isExported: true,
        getAccessors: envVars.map(({key, inferred}) => ({
            name: key,
            isStatic: true,
            returnType: inferred,
            statements: `return this.${readers[inferred]}(${JSON.stringify(key)});`
        })),
    });

    const readerBodies = {
        string: [
            'const value = process.env[key];',
            'if (value === undefined) throw new Error(`Missing environment variable: ${key}`);',
            'return value;',
        ],
        number: [
            'const value = this.readString(key);',
            'const number = Number(value);',
            'if (value.trim() === "" || !Number.isFinite(number)) {',
            '    throw new Error(`Expected a finite number for environment variable: ${key}`);',
            '}',
            'return number;',
        ],
        boolean: [
            'const value = this.readString(key);',
            'if (value === "true") return true;',
            'if (value === "false") return false;',
            'throw new Error(`Expected true or false for environment variable: ${key}`);',
        ],
    };
    const readerTypes = new Set(envVars.map(({inferred}) => inferred));
    if (envVars.length) readerTypes.add('string');
    for (const type of readerTypes) {
        envClass.addMethod({
            name: readers[type],
            scope: Scope.Private,
            isStatic: true,
            parameters: [{name: 'key', type: 'string'}],
            returnType: type,
            statements: readerBodies[type],
        });
    }

    // Optionally generate an enum of the keys
    sourceFile.addEnum({
        name: envEnumName,
        isExported: true,
        members: envVars.map(({key}) => ({
            name: key,
            value: key
        }))
    });

    sourceFile.saveSync();
}
