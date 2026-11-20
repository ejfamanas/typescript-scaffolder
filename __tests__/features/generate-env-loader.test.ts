import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import ts from 'typescript';
import { generateEnvLoader } from '../../src';
import { Logger } from '../../src/utils/logger';

describe('generateEnvLoader', () => {
    let tempDir: string;
    let envFile: string;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scaffolder-env-'));
        envFile = path.join(tempDir, '.env.example');
        jest.spyOn(Logger, 'warn').mockImplementation(() => {});
        jest.spyOn(Logger, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
        fs.rmSync(tempDir, {recursive: true, force: true});
    });

    it('generates typed accessors that read only the current runtime environment', () => {
        fs.writeFileSync(envFile, [
            'TEST_TOKEN=123=example-secret',
            'TEST_PORT=9876 # sample port',
            'TEST_ENABLED=true',
            'TEST_EMPTY=',
            'TEST_MULTILINE="first line',
            'PRIVATE_MARKER=inside the value',
            'last line"',
        ].join('\n'));
        generateEnvLoader(envFile, tempDir, 'config.ts', 'Settings', 'Keys');

        const configPath = path.join(tempDir, 'config.ts');
        const source = fs.readFileSync(configPath, 'utf8');
        expect(source).not.toContain('example-secret');
        expect(source).not.toContain('PRIVATE_MARKER');
        expect(source).not.toContain('9876');

        const consumerPath = path.join(tempDir, 'consumer.ts');
        fs.writeFileSync(consumerPath, [
            'import { Settings, Keys } from "./config";',
            'export const token: string = Settings[Keys.TEST_TOKEN];',
            'export const port: number = Settings.TEST_PORT;',
            'export const enabled: boolean = Settings.TEST_ENABLED;',
            'export const empty: string = Settings.TEST_EMPTY;',
        ].join('\n'));
        const program = ts.createProgram([consumerPath], {
            strict: true,
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.CommonJS,
            types: ['node'],
            typeRoots: [path.dirname(path.dirname(require.resolve('@types/node/package.json')))],
            skipLibCheck: true,
            noEmitOnError: true,
        });
        const diagnostics = ts.getPreEmitDiagnostics(program);
        expect(diagnostics.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n'))).toEqual([]);
        expect(program.emit().emitSkipped).toBe(false);

        jest.replaceProperty(process, 'env', {...process.env});
        delete process.env.TEST_TOKEN;
        const {Settings, Keys} = require(path.join(tempDir, 'config.js'));
        expect(Keys.TEST_TOKEN).toBe('TEST_TOKEN');
        expect(() => Settings.TEST_TOKEN).toThrow('Missing environment variable: TEST_TOKEN');

        process.env.TEST_TOKEN = 'runtime=value';
        process.env.TEST_PORT = '3000';
        process.env.TEST_ENABLED = 'false';
        process.env.TEST_EMPTY = '';
        expect(Settings.TEST_TOKEN).toBe('runtime=value');
        expect(Settings.TEST_PORT).toBe(3000);
        expect(Settings.TEST_ENABLED).toBe(false);
        expect(Settings.TEST_EMPTY).toBe('');

        process.env.TEST_ENABLED = 'true';
        expect(Settings.TEST_ENABLED).toBe(true);
        process.env.TEST_ENABLED = 'invalid';
        expect(() => Settings.TEST_ENABLED).toThrow('Expected true or false for environment variable: TEST_ENABLED');
        for (const invalid of ['', '  ', 'NaN', 'Infinity', 'abc']) {
            process.env.TEST_PORT = invalid;
            expect(() => Settings.TEST_PORT).toThrow('Expected a finite number for environment variable: TEST_PORT');
        }
    });

    it('warns about an empty value and fewer than two variables', () => {
        fs.writeFileSync(envFile, 'DEBUG=');
        generateEnvLoader(envFile, tempDir, 'config.ts');
        expect(Logger.warn).toHaveBeenCalledWith('generateEnvLoader', 'Empty value detected for env key: DEBUG');
        expect(Logger.warn).toHaveBeenCalledWith('generateEnvLoader', 'Only 1 environment variables found.');
    });

    it.each(['badKey=123', 'APP_PORT=3000\nAPP_PORT=4000'])('rejects invalid or duplicate keys', contents => {
        fs.writeFileSync(envFile, contents);
        expect(() => generateEnvLoader(envFile, tempDir, 'config.ts')).toThrow();
    });

    it('rejects a missing env file or invalid filename', () => {
        expect(() => generateEnvLoader(envFile, tempDir, 'config.ts')).toThrow();
        const invalidPath = path.join(tempDir, 'config.json');
        fs.writeFileSync(invalidPath, '');
        expect(() => generateEnvLoader(invalidPath, tempDir, 'config.ts')).toThrow();
    });
});
