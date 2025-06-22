import {Project} from 'ts-morph';
import * as fs from 'fs';
import dotenv from 'dotenv';
import {ensureDir} from "../utils/file-system";
import {inferPrimitiveType} from "../utils/object-helpers";
import {Logger} from "../utils/logger";
import path from "path";

dotenv.config();

/**
 * Takes in an env file and produces a typescript-safe interface of a class and enum
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
    envClassName ='EnvConfig',
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

    const envLines = fs.readFileSync(envFile, 'utf-8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => !!line && !line.startsWith('#') && line.includes('='));

    const envVars = envLines.map(line => {
        const [key, rawVal] = line.split('=');
        const cleanKey = key.trim();
        const value = rawVal?.trim() ?? '';
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
        return {key: cleanKey, value, inferred};

    });

    // Test min var count
    if (envVars.length < 2) {
        Logger.warn('generateEnvLoader', `Only ${envVars.length} environment variables found.`);
    }

    // test duplicate keys
    const seenKeys = new Set<string>();
    for (const { key } of envVars) {
        if (seenKeys.has(key)) {
            Logger.error(funcName, `Duplicate env key detected: ${key}`);
            throw new Error(funcName);
        }
        seenKeys.add(key);
    }
    const project = new Project();

    const sourceFile = project.createSourceFile(`${outputDir}/${outputFile}`, '', {overwrite: true});
    sourceFile.addClass({
        name: envClassName,
        isExported: true,
        properties: envVars.map(({key, value, inferred}) => ({
            name: key,
            isStatic: true,
            isReadonly: true,
            initializer: `process.env.${key} ?? ${inferred === 'string' ? `'${value}'` : value}`,
            type: inferred
        })),
    });

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