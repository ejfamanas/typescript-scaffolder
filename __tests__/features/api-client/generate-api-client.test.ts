import * as path from 'path';
import * as os from 'os';
import fs from "fs";
import {
    Endpoint,
    EndpointClientConfigFile,
    generateApiClientFromFile,
    generateApiClientFunction,
    generateApiClientsFromPath,
} from '../../../src';

describe('generate-api-client', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });
    const sampleEndpoint: Endpoint = {
        method: 'GET',
        path: '/users/:id',
        responseSchema: 'GET_RES_user',
        requestSchema: undefined,
        objectName: 'user',
        pathParams: ['id'],
        queryParams: [],
        headers: {
            'x-api-key': 'test-key',
        },
    };

    describe('generateApiClientFunction', () => {
        it('generates function code and appends to source file', async () => {
            // TODO: This is erroring in the IDE even though the function call is correct based on the signature
            // @ts-ignore
            const spy = jest.spyOn(fs, 'writeFileSync');

            await generateApiClientFunction(
                'https://api.example.com',
                'user_api',
                'GET_user',
                sampleEndpoint,
                {
                    authType: 'apikey',
                    credentials: {
                        apiKeyName: 'x-api-key',
                        apiKeyValue: 'test-key',
                    }
                },
                '../interfaces',
                './output',
                'overwrite'
            );

            expect(spy).toHaveBeenCalled();
            const writtenContent = spy.mock.calls[0][1] as string;
            expect(writtenContent).toContain('export async function GET_user');
            expect(writtenContent).toContain('axios.get');
        });

        it('does not import or use the retry wrapper when retry is disabled', async () => {
            // @ts-ignore
            const spy = jest.spyOn(fs, 'writeFileSync');

            await generateApiClientFunction(
                'https://api.example.com',
                'user_api',
                'GET_user_no_retry',
                sampleEndpoint,
                {
                    authType: 'apikey',
                    credentials: {
                        apiKeyName: 'x-api-key',
                        apiKeyValue: 'test-key',
                    }
                    // no retry block
                } as any,
                '../interfaces',
                './output',
                'overwrite'
            );

            const writtenContent = spy.mock.calls[0][1] as string;
            expect(writtenContent).toContain('export async function GET_user_no_retry');
            // no helper import
            expect(writtenContent).not.toContain(`from "./user_api.requestWithRetry"`);
            // direct axios call is used
            expect(writtenContent).toContain('axios.get');
            // and no wrapper invocation
            expect(writtenContent).not.toContain('requestWithRetry_');
        });

        it('generates a retry-wrapped function and imports the typed wrapper when retry is enabled', async () => {
            // @ts-ignore
            const spy = jest.spyOn(fs, 'writeFileSync');

            const endpointWithRetry: Endpoint = {
                ...sampleEndpoint,
                method: 'GET',
                objectName: 'user',
            };

            await generateApiClientFunction(
                'https://api.example.com',
                'user_api',
                'GET_user',
                endpointWithRetry,
                {
                    authType: 'apikey',
                    credentials: {
                        apiKeyName: 'x-api-key',
                        apiKeyValue: 'test-key',
                    },
                    // enable retries to trigger wrapper import & call
                    retry: {enabled: true, maxAttempts: 3, initialDelayMs: 1, multiplier: 1.0},
                } as any,
                '../interfaces',
                './output',
                'overwrite'
            );

            const writtenContent = spy.mock.calls[0][1] as string;
            // imports the helper module with the wrapper name
            expect(writtenContent).toContain(`import { requestWithRetry_GET_user } from "./user_api.requestWithRetry";`);
            // wraps the axios call with the typed wrapper
            expect(writtenContent).toContain('const response = await requestWithRetry_GET_user(');
            // and still returns response.data
            expect(writtenContent).toContain('return response.data');
        });

        it('appends the wrapper symbol to an existing helper import when adding a second function in the same file', async () => {
            // @ts-ignore
            const spy = jest.spyOn(fs, 'writeFileSync');

            // First function to seed the file with the import
            await generateApiClientFunction(
                'https://api.example.com',
                'user_api',
                'GET_user',
                sampleEndpoint,
                {
                    authType: 'apikey',
                    credentials: {
                        apiKeyName: 'x-api-key',
                        apiKeyValue: 'test-key',
                    },
                    retry: {enabled: true},
                } as any,
                '../interfaces',
                './output',
                'overwrite'
            );

            // Second function (same fileName) should append to the existing import declaration
            const secondEndpoint: Endpoint = {
                ...sampleEndpoint,
                method: 'GET',
                path: '/users/by-email',
                objectName: 'userByEmail',
            };

            await generateApiClientFunction(
                'https://api.example.com',
                'user_api',
                'GET_userByEmail',
                secondEndpoint,
                {
                    authType: 'apikey',
                    credentials: {
                        apiKeyName: 'x-api-key',
                        apiKeyValue: 'test-key',
                    },
                    retry: {enabled: true},
                } as any,
                '../interfaces',
                './output',
                'append'
            );

            const writtenContent = spy.mock.calls[1][1] as string;
            // One import declaration containing BOTH wrapper symbols
            expect(writtenContent).toContain(
                `import { requestWithRetry_GET_user, requestWithRetry_GET_userByEmail } from "./user_api.requestWithRetry";`
            );
            // Both functions should wrap their axios calls
            expect(writtenContent).toContain('const response = await requestWithRetry_GET_user(');
            expect(writtenContent).toContain('const response = await requestWithRetry_GET_userByEmail(');
        });
    });

    describe('generateApiClientFromFile', () => {
        it('generates API client file from endpoint config file', async () => {
            const tempFilePath = path.join(__dirname, 'temp-endpoint.json');

            const endpointConfig: EndpointClientConfigFile = {
                baseUrl: 'https://api.example.com',
                authType: 'apikey',
                credentials: {
                    apiKeyName: 'x-api-key',
                    apiKeyValue: 'test-key',
                },
                endpoints: [sampleEndpoint],
            };
            // TODO: This is erroring in the IDE even though the function call is correct based on the signature
            // @ts-ignore
            const spy = jest.spyOn(fs, 'writeFileSync');

            fs.writeFileSync(tempFilePath, JSON.stringify(endpointConfig), 'utf8');

            await generateApiClientFromFile(tempFilePath, './interfaces', './output');

            expect(spy).toHaveBeenCalled();

            fs.unlinkSync(tempFilePath);
            spy.mockRestore();
        });

        it('warns and skips endpoints missing objectName', async () => {
            const tempFilePath = path.join(__dirname, 'temp-endpoint-missing-name.json');

            const badEndpoint: Endpoint = {...sampleEndpoint, objectName: undefined as any};
            const endpointConfig: EndpointClientConfigFile = {
                baseUrl: 'https://api.example.com',
                authType: 'apikey',
                credentials: {
                    apiKeyName: 'x-api-key',
                    apiKeyValue: 'test-key',
                },
                endpoints: [badEndpoint],
            };

            // @ts-ignore
            const spy = jest.spyOn(fs, 'writeFileSync');
            const warnSpy = jest.spyOn(require('../../../src/utils/logger').Logger, 'warn').mockImplementation(() => {
            });

            fs.writeFileSync(tempFilePath, JSON.stringify(endpointConfig), 'utf8');
            await generateApiClientFromFile(tempFilePath, './interfaces', './output');

            // no write should occur for the bad endpoint, but warn should be called
            expect(warnSpy).toHaveBeenCalled();

            fs.unlinkSync(tempFilePath);
            spy.mockRestore();
            warnSpy.mockRestore();
        });

        it('generates a retry helper file when retry is enabled', async () => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'api-client-retry-'));
            const interfacesRoot = path.join(tmpDir, 'interfaces');
            const relInterfaceDir = 'source-delta';
            const interfacesDir = path.join(interfacesRoot, relInterfaceDir);
            const outputDir = path.join(tmpDir, 'output', relInterfaceDir);

            fs.mkdirSync(interfacesDir, { recursive: true });
            fs.mkdirSync(outputDir, { recursive: true });

            // Interface file required by the endpoint
            fs.writeFileSync(path.join(interfacesDir, 'GET_RES_user.ts'), 'export interface GET_RES_user {}');

            const configPath = path.join(tmpDir, 'temp-endpoint-retry.json');
            const endpointConfig: EndpointClientConfigFile = {
                baseUrl: 'https://api.example.com',
                authType: 'apikey',
                credentials: {
                    apiKeyName: 'x-api-key',
                    apiKeyValue: 'test-key',
                },
                // enable retry at client-level
                retry: { enabled: true, maxAttempts: 2, initialDelayMs: 1, multiplier: 1.0 },
                endpoints: [{
                    ...sampleEndpoint,
                    // make sure relativeInterfaceDir is respected in output structure
                    objectName: 'user',
                }],
            };

            fs.writeFileSync(configPath, JSON.stringify(endpointConfig), 'utf8');

            await generateApiClientFromFile(configPath, interfacesDir, path.join(tmpDir, 'output', relInterfaceDir));

            // Expect helper file generated next to the API file
            const files = fs.readdirSync(path.join(tmpDir, 'output', relInterfaceDir));
            const hasHelper = files.some(f => f.endsWith('.requestWithRetry.ts'));
            expect(hasHelper).toBe(true);

            fs.rmSync(tmpDir, { recursive: true, force: true });
        });
    });

    describe('generateApiClientsFromPath', () => {
        it('generates multiple API client files from config path', async () => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'api-client-test-'));
            const configDir = path.join(tmpDir, 'configs');
            const interfaceDir = path.join(tmpDir, 'interfaces/source');
            const outputDir = path.join(tmpDir, 'output');

            fs.mkdirSync(configDir, {recursive: true});
            fs.mkdirSync(interfaceDir, {recursive: true});
            fs.mkdirSync(outputDir, {recursive: true});

            // Create a dummy interface file
            fs.writeFileSync(path.join(interfaceDir, 'GET_RES_user.ts'), 'export interface GET_RES_user {}');

            const configPath = path.join(configDir, 'test-config.json');
            const config: EndpointClientConfigFile = {
                baseUrl: 'https://api.example.com',
                authType: 'apikey',
                credentials: {
                    apiKeyName: 'x-api-key',
                    apiKeyValue: 'test-key',
                },
                endpoints: [sampleEndpoint],
            };

            fs.writeFileSync(configPath, JSON.stringify(config), 'utf-8');

            await generateApiClientsFromPath(configDir, tmpDir + '/interfaces', outputDir);

            // Confirm a file was generated in the expected location
            const generatedDirs = fs.readdirSync(outputDir);
            const hasGeneratedOutput = generatedDirs.some((dir) => {
                const dirPath = path.join(outputDir, dir);
                return fs.statSync(dirPath).isDirectory() &&
                    fs.readdirSync(dirPath).some(file => file.includes('user_api'));
            });

            expect(hasGeneratedOutput).toBe(true);

            fs.rmSync(tmpDir, {recursive: true, force: true});
        });

        it('ensures output directories and logs completion', async () => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'api-client-path-'));
            const configDir = path.join(tmpDir, 'configs');
            const interfacesRoot = path.join(tmpDir, 'interfaces');
            const relInterfaceDir = 'source';
            const interfaceDir = path.join(interfacesRoot, relInterfaceDir);
            const outputRoot = path.join(tmpDir, 'out');

            fs.mkdirSync(configDir, { recursive: true });
            fs.mkdirSync(interfaceDir, { recursive: true });
            fs.mkdirSync(outputRoot, { recursive: true });

            // minimal interface file
            fs.writeFileSync(path.join(interfaceDir, 'GET_RES_user.ts'), 'export interface GET_RES_user {}');

            const configPath = path.join(configDir, 'test-config.json');
            const config: EndpointClientConfigFile = {
                baseUrl: 'https://api.example.com',
                authType: 'apikey',
                credentials: { apiKeyName: 'x-api-key', apiKeyValue: 'test-key' },
                endpoints: [sampleEndpoint],
            };
            fs.writeFileSync(configPath, JSON.stringify(config), 'utf-8');

            const ensureDirSpy = jest.spyOn(require('../../../src/utils/file-system'), 'ensureDir');
            const infoSpy = jest.spyOn(require('../../../src/utils/logger').Logger, 'info').mockImplementation(() => {});

            await generateApiClientsFromPath(configDir, interfacesRoot, outputRoot);

            expect(ensureDirSpy).toHaveBeenCalled();
            expect(infoSpy).toHaveBeenCalledWith(expect.any(String), 'API client generation completed.');

            fs.rmSync(tmpDir, { recursive: true, force: true });
            ensureDirSpy.mockRestore();
            infoSpy.mockRestore();
        });

        it('throws when schemas directory is not found for a config', async () => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'api-client-path-warn-'));
            const configDir = path.join(tmpDir, 'configs');
            const interfacesRoot = path.join(tmpDir, 'interfaces'); // intentionally do NOT create subdirs
            const outputRoot = path.join(tmpDir, 'out');

            fs.mkdirSync(configDir, { recursive: true });
            fs.mkdirSync(interfacesRoot, { recursive: true });
            fs.mkdirSync(outputRoot, { recursive: true });

            const configPath = path.join(configDir, 'test-config.json');
            const config: EndpointClientConfigFile = {
                baseUrl: 'https://api.example.com',
                authType: 'apikey',
                credentials: { apiKeyName: 'x-api-key', apiKeyValue: 'test-key' },
                endpoints: [sampleEndpoint],
            };
            fs.writeFileSync(configPath, JSON.stringify(config), 'utf-8');

            await expect(generateApiClientsFromPath(configDir, interfacesRoot, outputRoot))
                .rejects.toThrow();

            fs.rmSync(tmpDir, { recursive: true, force: true });
        });
    });
});
