import {Project} from 'ts-morph';
import * as fs from 'fs';
import dotenv from 'dotenv';
import {ensureDir} from "../utils/file-system";
import {inferPrimitiveType} from "../utils/object-helpers";
import {Logger} from "../utils/logger";
import path from "path";

dotenv.config();

export function generateEnvLoader(
    ENV_FILE: string,
    OUTPUT_PATH: string,
    OUTPUT_FILE: string,
    CLASS_NAME ='EnvConfig',
    ENUM_NAME = 'EnvKeys'
): void {
    const funcName = "generateEnvLoader";
    Logger.debug(funcName, 'Generating env accessor')
    const baseEnvFile = path.basename(ENV_FILE);

    if (!/^\.env(\..+)?$/.test(baseEnvFile) && baseEnvFile !== '.env') {
        const error = `Expected an .env* file but received: ${ENV_FILE}`;
        Logger.error(funcName, error);
        throw new Error(error);
    }

    if (!fs.existsSync(ENV_FILE)) {
        const error = `ENV file does not exist at path: ${ENV_FILE}`
        Logger.debug(funcName, error);
        throw new Error(error);
    }

    const envLines = fs.readFileSync(ENV_FILE, 'utf-8')
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
            throw new Error(error);
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
            throw new Error(`Duplicate env key detected: ${key}`);
        }
        seenKeys.add(key);
    }
    const project = new Project();
    ensureDir(OUTPUT_PATH);

    const sourceFile = project.createSourceFile(`${OUTPUT_PATH}/${OUTPUT_FILE}`, '', {overwrite: true});
    sourceFile.addClass({
        name: CLASS_NAME,
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
        name: ENUM_NAME,
        isExported: true,
        members: envVars.map(({key}) => ({
            name: key,
            value: key
        }))
    });

    sourceFile.saveSync();
}