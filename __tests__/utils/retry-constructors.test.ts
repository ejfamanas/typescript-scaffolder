import { Project } from 'ts-morph';
import {
    addRetryHelperImportsToSourceFile,
    buildEndpointRetryWrapperExport,
    buildRetryHelperImplSource,
    buildRetryWrapperName,
    requestWithRetryImpl
} from "../../src/utils/retry-constructors";

describe('retry-constructors', () => {
    describe('buildRetryWrapperName', () => {
        it('builds the correct wrapper name from a valid function name', () => {
            expect(buildRetryWrapperName('GET_person')).toBe('requestWithRetry_GET_person');
            expect(buildRetryWrapperName('POST_user')).toBe('requestWithRetry_POST_user');
        });

        it('handles empty or whitespace-only names', () => {
            expect(buildRetryWrapperName('')).toBe('requestWithRetry');
            expect(buildRetryWrapperName('   ')).toBe('requestWithRetry');
        });
    });

    describe('requestWithRetryImpl', () => {
        it('executes once when disabled', async () => {
            let calls = 0;
            const attempt = async () => {
                calls++;
                return {status: 200};
            };
            const res = await requestWithRetryImpl(attempt, {enabled: false, maxAttempts: 3});
            expect(res).toEqual({status: 200});
            expect(calls).toBe(1);
        });

        it('retries on retryable HTTP status for idempotent method', async () => {
            const attempt = jest.fn()
                .mockResolvedValueOnce({status: 503})
                .mockResolvedValueOnce({status: 200});

            const res = await requestWithRetryImpl(attempt, {
                enabled: true,
                maxAttempts: 3,
                initialDelayMs: 0,
                multiplier: 1.0,
                method: 'GET',
            });
            expect(res).toEqual({status: 200});
            expect(attempt).toHaveBeenCalledTimes(2);
        });

        it('does not retry non-retryable HTTP status', async () => {
            const attempt = jest.fn().mockResolvedValue({status: 500});
            const res = await requestWithRetryImpl(attempt, {
                enabled: true,
                maxAttempts: 3,
                initialDelayMs: 0,
                multiplier: 1.0,
                method: 'GET',
            });
            expect(res).toEqual({status: 500});
            expect(attempt).toHaveBeenCalledTimes(1);
        });

        it('retries network errors (no response) for idempotent methods', async () => {
            const networkErr = {response: undefined}; // axios-style network error
            const attempt = jest.fn()
                .mockRejectedValueOnce(networkErr)
                .mockResolvedValueOnce({status: 200});

            const res = await requestWithRetryImpl(attempt, {
                enabled: true,
                maxAttempts: 2,
                initialDelayMs: 0,
                multiplier: 1.0,
                method: 'GET',
            });
            expect(res).toEqual({status: 200});
            expect(attempt).toHaveBeenCalledTimes(2);
        });

        it('does not retry for non-idempotent methods by default', async () => {
            const attempt = jest.fn()
                .mockResolvedValueOnce({status: 503})
                .mockResolvedValueOnce({status: 200});

            const res = await requestWithRetryImpl(attempt, {
                enabled: true,
                maxAttempts: 2,
                initialDelayMs: 0,
                multiplier: 1.0,
                method: 'POST', // not idempotent by default
            });
            expect(res).toEqual({status: 503}); // first result returned, no retry
            expect(attempt).toHaveBeenCalledTimes(1);
        });

        it('honors custom retryStatuses and idempotentMethods', async () => {
            const attempt = jest.fn()
                .mockResolvedValueOnce({status: 500}) // not in default retry set
                .mockResolvedValueOnce({status: 200});

            const res = await requestWithRetryImpl(attempt, {
                enabled: true,
                maxAttempts: 2,
                initialDelayMs: 0,
                multiplier: 1.0,
                method: 'POST',
                retryStatuses: [500],
                idempotentMethods: ['POST'], // allow POST to retry
            });
            expect(res).toEqual({status: 200});
            expect(attempt).toHaveBeenCalledTimes(2);
        });

        it('returns immediately when result has no status field (no HTTP-based retry decision)', async () => {
            const attempt = jest.fn().mockResolvedValue({}); // no status
            const res = await requestWithRetryImpl(attempt, {
                enabled: true,
                maxAttempts: 3,
                initialDelayMs: 0,
                multiplier: 1.0,
                method: 'GET',
            });
            expect(res).toEqual({});
            expect(attempt).toHaveBeenCalledTimes(1);
        });

        it('returns last retryable response when maxAttempts threshold is reached (HTTP path)', async () => {
            const attempt = jest.fn()
                .mockResolvedValueOnce({ status: 503 })
                .mockResolvedValueOnce({ status: 503 }); // still retryable

            const res = await requestWithRetryImpl(attempt, {
                enabled: true,
                maxAttempts: 2, // allow one retry only
                initialDelayMs: 0,
                multiplier: 1.0,
                method: 'GET',
            });
            // After one retry, we hit maxAttempts and should return the last response
            expect(res).toEqual({ status: 503 });
            expect(attempt).toHaveBeenCalledTimes(2);
        });

        it('throws immediately for non-network errors even when enabled', async () => {
            const err = { response: {} }; // simulate axios error with response (not network)
            const attempt = jest.fn().mockRejectedValue(err);
            await expect(requestWithRetryImpl(attempt, {
                enabled: true,
                maxAttempts: 3,
                initialDelayMs: 0,
                multiplier: 1.0,
                method: 'GET',
            })).rejects.toBe(err);
            expect(attempt).toHaveBeenCalledTimes(1);
        });

        it('throws immediately for network errors on non-idempotent methods', async () => {
            const err = { response: undefined }; // network error
            const attempt = jest.fn().mockRejectedValue(err);
            await expect(requestWithRetryImpl(attempt, {
                enabled: true,
                maxAttempts: 3,
                initialDelayMs: 0,
                multiplier: 1.0,
                method: 'POST', // non-idempotent
            })).rejects.toBe(err);
            expect(attempt).toHaveBeenCalledTimes(1);
        });

        it('retries when attempt throws an HTTP error with a retryable status (e.response.status=503)', async () => {
            const httpErr503 = { response: { status: 503 } };
            const attempt = jest.fn()
                .mockRejectedValueOnce(httpErr503) // first try fails with HTTP 503
                .mockResolvedValueOnce({ status: 200 }); // then succeeds

            const res = await requestWithRetryImpl(attempt, {
                enabled: true,
                maxAttempts: 2,
                initialDelayMs: 0,
                multiplier: 1.0,
                method: 'GET',
            });

            expect(res).toEqual({ status: 200 });
            expect(attempt).toHaveBeenCalledTimes(2);
        });

        it('throws after exhausting attempts when HTTP errors with retryable status persist', async () => {
            const httpErr503 = { response: { status: 503 } };
            const attempt = jest.fn().mockRejectedValue(httpErr503); // always fails with 503

            await expect(requestWithRetryImpl(attempt, {
                enabled: true,
                maxAttempts: 2,
                initialDelayMs: 0,
                multiplier: 1.0,
                method: 'GET',
            })).rejects.toBe(httpErr503);

            expect(attempt).toHaveBeenCalledTimes(2);
        });

        it('treats lowercase non-idempotent methods as no-retry (case-insensitive check)', async () => {
            const attempt = jest.fn()
                .mockResolvedValueOnce({ status: 503 });
            const res = await requestWithRetryImpl(attempt, {
                enabled: true,
                maxAttempts: 3,
                initialDelayMs: 0,
                multiplier: 1.0,
                method: 'post', // lowercase to exercise toUpperCase() path
            });
            expect(res).toEqual({ status: 503 });
            expect(attempt).toHaveBeenCalledTimes(1);
        });
    });

    describe('buildEndpointRetryWrapperExport', () => {
        it('emits a typed wrapper export that delegates to requestWithRetryImpl', () => {
            const src = buildEndpointRetryWrapperExport('GET_person', 'Person');
            expect(src).toContain('export function requestWithRetry_GET_person(');
            expect(src).toContain('Promise<AxiosResponse<Person>>');
            expect(src).toContain('return requestWithRetryImpl<AxiosResponse<Person>>(attempt, opts);');
        });
    });

    describe('buildRetryHelperImplSource', () => {
        it('includes an exported requestWithRetryImpl and default constants', () => {
            const src = buildRetryHelperImplSource();
            expect(src).toContain('export async function requestWithRetryImpl');
            expect(src).toContain('const defaultRetryStatuses');
            expect(src).toContain('const defaultIdempotentMethods');
        });
    });

    describe('addRetryHelperImportsToSourceFile', () => {
        it('adds type-only imports for axios, RetryOptions, and grouped response types', () => {
            const project = new Project();
            const sf = project.createSourceFile('tmp.requestWithRetry.ts', '', {overwrite: true});

            addRetryHelperImportsToSourceFile(
                sf,
                [
                    {typeName: 'Person', moduleSpecifier: '../interfaces/Person'},
                    {typeName: 'PersonList', moduleSpecifier: '../interfaces/PersonList'},
                    {typeName: 'Person', moduleSpecifier: '../interfaces/Person'}, // duplicate
                ],
                'typescript-scaffolder'
            );

            const imports = sf.getImportDeclarations().map(d => ({
                mod: d.getModuleSpecifierValue(),
                typeOnly: d.isTypeOnly(),
                names: d.getNamedImports().map(n => n.getName()).sort(),
                ns: d.getNamespaceImport()?.getText() ?? null,
            }));

            // axios type-only import
            expect(imports).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        mod: 'axios',
                        typeOnly: true,
                        names: expect.arrayContaining(['AxiosResponse'])
                    }),
                ])
            );

            // RetryOptions from package root
            expect(imports).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        mod: 'typescript-scaffolder',
                        typeOnly: true,
                        names: expect.arrayContaining(['RetryOptions'])
                    }),
                ])
            );

            // Grouped response type imports (deduped)
            expect(imports).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        mod: '../interfaces/Person',
                        typeOnly: true,
                        names: expect.arrayContaining(['Person'])
                    }),
                    expect.objectContaining({
                        mod: '../interfaces/PersonList',
                        typeOnly: true,
                        names: expect.arrayContaining(['PersonList'])
                    }),
                ])
            );
        });

        it('appends missing names to existing type-only imports, else adds a separate type-only import', () => {
            const project = new Project();
            const sf = project.createSourceFile('tmp2.requestWithRetry.ts', '', {overwrite: true});

            // Seed an existing type-only import
            sf.addImportDeclaration({
                isTypeOnly: true,
                namedImports: [{name: 'Person'}],
                moduleSpecifier: '../interfaces/Person',
            });

            addRetryHelperImportsToSourceFile(
                sf,
                [
                    {typeName: 'Person', moduleSpecifier: '../interfaces/Person'}, // already present
                    {typeName: 'PersonList', moduleSpecifier: '../interfaces/PersonList'}, // new module
                ],
                'typescript-scaffolder'
            );

            const personImport = sf.getImportDeclarations().find(d => d.getModuleSpecifierValue() === '../interfaces/Person');
            expect(personImport?.getNamedImports().map(n => n.getName()).sort()).toEqual(['Person']);

            const personListImport = sf.getImportDeclarations().find(d => d.getModuleSpecifierValue() === '../interfaces/PersonList');
            expect(personListImport?.isTypeOnly()).toBe(true);
            expect(personListImport?.getNamedImports().map(n => n.getName())).toEqual(['PersonList']);
        });

        it('adds a separate type-only import when a non type-only import already exists for the same module', () => {
            const project = new Project();
            const sf = project.createSourceFile('tmp3.requestWithRetry.ts', '', { overwrite: true });

            // Existing non type-only import from the same module
            sf.addImportDeclaration({
                isTypeOnly: false,
                namedImports: [{ name: 'SomethingElse' }],
                moduleSpecifier: '../interfaces/Person',
            });

            addRetryHelperImportsToSourceFile(
                sf,
                [{ typeName: 'Person', moduleSpecifier: '../interfaces/Person' }],
                'typescript-scaffolder'
            );

            const imports = sf.getImportDeclarations().filter(d => d.getModuleSpecifierValue() === '../interfaces/Person');
            // Expect two imports for the same module: one non-type-only existing, one new type-only with Person
            expect(imports.length).toBeGreaterThanOrEqual(2);

            const typeOnlyImport = imports.find(d => d.isTypeOnly());
            expect(typeOnlyImport).toBeDefined();
            expect(typeOnlyImport?.getNamedImports().map(n => n.getName())).toEqual(['Person']);

            const nonTypeOnlyImport = imports.find(d => !d.isTypeOnly());
            expect(nonTypeOnlyImport).toBeDefined();
            expect(nonTypeOnlyImport?.getNamedImports().map(n => n.getName())).toEqual(['SomethingElse']);
        });

        it('adds a separate type-only import when an existing type-only import has no named imports', () => {
            const project = new Project();
            const sf = project.createSourceFile('tmp4.requestWithRetry.ts', '', { overwrite: true });

            // Existing type-only import with NO named imports (use a namespace type-only import, which is valid TS)
            sf.addImportDeclaration({
                isTypeOnly: true,
                namespaceImport: 'PersonNS',
                moduleSpecifier: '../interfaces/Person',
            });

            addRetryHelperImportsToSourceFile(
                sf,
                [{ typeName: 'Person', moduleSpecifier: '../interfaces/Person' }],
                'typescript-scaffolder'
            );

            const imports = sf.getImportDeclarations().filter(d => d.getModuleSpecifierValue() === '../interfaces/Person');
            // We should now have two imports for the same module:
            // - the original type-only namespace import
            // - a new type-only named import with 'Person'
            expect(imports.length).toBeGreaterThanOrEqual(2);

            const nsTypeOnly = imports.find(d => d.isTypeOnly() && !!d.getNamespaceImport());
            const typeOnlyWithName = imports.find(d => d.isTypeOnly() && d.getNamedImports().some(n => n.getName() === 'Person'));

            expect(nsTypeOnly).toBeDefined();
            expect(typeOnlyWithName).toBeDefined();
        });

        it('skips invalid typeImports entries (missing name/module) and still processes valid ones', () => {
            const project = new Project();
            const sf = project.createSourceFile('tmp5.requestWithRetry.ts', '', { overwrite: true });

            const typeImports: any[] = [
                { typeName: '', moduleSpecifier: '../interfaces/Person' },  // invalid: empty typeName
                { typeName: 'PersonList', moduleSpecifier: '' },            // invalid: empty module
                { typeName: 'Person', moduleSpecifier: '../interfaces/Person' }, // valid
            ];

            addRetryHelperImportsToSourceFile(
                sf,
                typeImports,
                'typescript-scaffolder'
            );

            const personImport = sf.getImportDeclarations().find(d => d.getModuleSpecifierValue() === '../interfaces/Person');
            expect(personImport?.isTypeOnly()).toBe(true);
            expect(personImport?.getNamedImports().map(n => n.getName())).toEqual(['Person']);
        });
    });
});