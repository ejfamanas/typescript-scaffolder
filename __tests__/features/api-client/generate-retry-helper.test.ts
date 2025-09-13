import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { generateRetryHelperForApiFile } from "../../../src";
import { Logger } from "../../../src/utils/logger";
import * as FsUtils from "../../../src/utils/file-system"
import { RetryEndpointMeta } from "../../../src";

describe('generateRetryHelperForApiFile', () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-retry-helper-'));
        jest.spyOn(Logger, 'debug').mockImplementation(() => {
        });
        jest.spyOn(Logger, 'info').mockImplementation(() => {
        });
        jest.spyOn(Logger, 'warn').mockImplementation(() => {
        });
        jest.spyOn(FsUtils, 'ensureDir').mockImplementation((dir: string) => {
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
        try {
            fs.rmSync(tmpDir, {recursive: true, force: true});
        } catch {
        }
    });

    const helperFile = (base: string) => path.join(tmpDir, `${base}.requestWithRetry.ts`);

    it('logs a warning and does not write a file when no endpoints are provided', () => {
        const base = 'person_api';

        generateRetryHelperForApiFile(tmpDir, base, [], true);

        expect(Logger.warn).toHaveBeenCalledWith(
            'generateRetryHelperForApiFile',
            expect.stringContaining('No endpoints provided')
        );
        expect(fs.existsSync(helperFile(base))).toBe(false);
    });

    it('ensures the directory exists and writes the helper file', () => {
        const base = 'person_api';
        const endpoints: RetryEndpointMeta[] = [
            {functionName: 'GET_person', responseType: 'Person', responseModule: '../interfaces/Person'},
        ];

        generateRetryHelperForApiFile(tmpDir, base, endpoints, true);

        expect(FsUtils.ensureDir).toHaveBeenCalledWith(tmpDir);
        expect(fs.existsSync(helperFile(base))).toBe(true);
    });

    it('embeds the generic retry implementation and adds type-only imports', () => {
        const base = 'person_api';
        const endpoints: RetryEndpointMeta[] = [
            {functionName: 'GET_person', responseType: 'Person', responseModule: '../interfaces/Person'},
            {functionName: 'GET_ALL_person', responseType: 'PersonList', responseModule: '../interfaces/PersonList'},
            {functionName: 'HEAD_person_meta', responseType: 'Person', responseModule: '../interfaces/Person'}, // duplicate type to dedupe
        ];

        generateRetryHelperForApiFile(tmpDir, base, endpoints, true);

        const text = fs.readFileSync(helperFile(base), 'utf8');

        // Generic impl present
        expect(text).toContain('export async function requestWithRetryImpl');
        expect(text).toContain('const defaultRetryStatuses');
        expect(text).toContain('const defaultIdempotentMethods');

        // Type-only imports for axios + scaffolder
        expect(text).toContain(`import type { AxiosResponse } from "axios";`);
        expect(text).toContain(`import type { RetryOptions } from "typescript-scaffolder";`);

        // Unique response type imports (deduped & grouped by module)
        expect(text).toContain(`import type { Person } from "../interfaces/Person";`);
        expect(text).toContain(`import type { PersonList } from "../interfaces/PersonList";`);
    });

    it('exports one typed wrapper per endpoint and sorts wrappers by function name', () => {
        const base = 'person_api';
        const endpoints: RetryEndpointMeta[] = [
            {functionName: 'GET_person', responseType: 'Person', responseModule: '../interfaces/Person'},
            {functionName: 'GET_ALL_person', responseType: 'PersonList', responseModule: '../interfaces/PersonList'},
            {functionName: 'HEAD_person_meta', responseType: 'PersonMeta', responseModule: '../interfaces/PersonMeta'},
        ];

        generateRetryHelperForApiFile(tmpDir, base, endpoints, true);
        const text = fs.readFileSync(helperFile(base), 'utf8');

        // Wrappers exist
        expect(text).toContain('export function requestWithRetry_GET_ALL_person(');
        expect(text).toContain('export function requestWithRetry_GET_person(');
        expect(text).toContain('export function requestWithRetry_HEAD_person_meta(');

        // Sorted by functionName
        const idxAll = text.indexOf('export function requestWithRetry_GET_ALL_person(');
        const idxGet = text.indexOf('export function requestWithRetry_GET_person(');
        const idxHead = text.indexOf('export function requestWithRetry_HEAD_person_meta(');
        expect(idxAll).toBeGreaterThan(-1);
        expect(idxGet).toBeGreaterThan(-1);
        expect(idxHead).toBeGreaterThan(-1);
        expect(idxAll).toBeLessThan(idxGet);
        expect(idxGet).toBeLessThan(idxHead);

        // Typed signatures / returns
        expect(text).toMatch(/Promise<AxiosResponse<PersonList>>/);
        expect(text).toMatch(/Promise<AxiosResponse<Person>>/);
        expect(text).toMatch(/Promise<AxiosResponse<PersonMeta>>/);

        // Delegation to impl
        expect(text).toContain('return requestWithRetryImpl<AxiosResponse<PersonList>>(attempt, opts);');
        expect(text).toContain('return requestWithRetryImpl<AxiosResponse<Person>>(attempt, opts);');
        expect(text).toContain('return requestWithRetryImpl<AxiosResponse<PersonMeta>>(attempt, opts);');
    });

    it('honors overwrite flag', () => {
        const base = 'person_api';
        const endpoints: RetryEndpointMeta[] = [
            {functionName: 'GET_person', responseType: 'Person', responseModule: '../interfaces/Person'},
        ];

        // First write
        generateRetryHelperForApiFile(tmpDir, base, endpoints, true);
        const full = helperFile(base);

        // Mutate file
        fs.appendFileSync(full, '\n// MARKER\n', 'utf8');

        // overwrite=false -> marker remains
        generateRetryHelperForApiFile(tmpDir, base, endpoints, false);
        let text = fs.readFileSync(full, 'utf8');
        expect(text).toContain('// MARKER');

        // overwrite=true -> marker removed
        generateRetryHelperForApiFile(tmpDir, base, endpoints, true);
        text = fs.readFileSync(full, 'utf8');
        expect(text).not.toContain('// MARKER');
    });

    it('is idempotent when run twice with same inputs (no duplicate imports or wrappers)', () => {
        const base = 'person_api';
        const endpoints: RetryEndpointMeta[] = [
            {functionName: 'GET_person', responseType: 'Person', responseModule: '../interfaces/Person'},
            {functionName: 'GET_ALL_person', responseType: 'PersonList', responseModule: '../interfaces/PersonList'},
        ];

        generateRetryHelperForApiFile(tmpDir, base, endpoints, true);
        generateRetryHelperForApiFile(tmpDir, base, endpoints, true);

        const text = fs.readFileSync(helperFile(base), 'utf8');

        // Imports appear once
        const axiosMatches = text.match(/import\s+type\s+\{\s*AxiosResponse\s*\}\s+from\s+"axios";/g) || [];
        const retryMatches = text.match(/import\s+type\s+\{\s*RetryOptions\s*\}\s+from\s+"typescript-scaffolder";/g) || [];
        expect(axiosMatches.length).toBe(1);
        expect(retryMatches.length).toBe(1);

        // Wrappers appear once
        const re1 = text.match(/export\s+function\s+requestWithRetry_GET_person\s*\(/g) || [];
        const re2 = text.match(/export\s+function\s+requestWithRetry_GET_ALL_person\s*\(/g) || [];
        expect(re1.length).toBe(1);
        expect(re2.length).toBe(1);
    });
});