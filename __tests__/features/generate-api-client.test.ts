import path from 'path';
import os from 'os';
import {
    generateApiClientFunction,
    generateApiClientFromFile,
    generateApiClientsFromPath,
    determineHasBody,
    constructUrlPath,
    addRequiredImports,
    collectRequiredSchemas,
    findDirectoryContainingAllSchemas
} from '../../src/features/generate-api-client';
import {Endpoint, EndpointClientConfigFile} from '../../src/models/api-definitions';
import fs from "fs";
import { SourceFile } from 'ts-morph';

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
            const spy = jest.spyOn(fs, 'writeFileSync');

            fs.writeFileSync(tempFilePath, JSON.stringify(endpointConfig), 'utf8');

            await generateApiClientFromFile(tempFilePath, './interfaces', './output');

            expect(spy).toHaveBeenCalled();

            fs.unlinkSync(tempFilePath);
            spy.mockRestore();
        });
    });

    describe('generateApiClientsFromPath', () => {
        it('generates multiple API client files from config path', async () => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'api-client-test-'));
            const configDir = path.join(tmpDir, 'configs');
            const interfaceDir = path.join(tmpDir, 'interfaces/source');
            const outputDir = path.join(tmpDir, 'output');

            fs.mkdirSync(configDir, { recursive: true });
            fs.mkdirSync(interfaceDir, { recursive: true });
            fs.mkdirSync(outputDir, { recursive: true });

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

            fs.rmSync(tmpDir, { recursive: true, force: true });
        });
    });

    describe('helper functions', () => {
        describe('determineHasBody', () => {
            it('returns true for methods that usually have a body', () => {
                expect(determineHasBody('POST')).toBe(true);
                expect(determineHasBody('PUT')).toBe(true);
            });

            it('returns false for methods that usually do not have a body', () => {
                expect(determineHasBody('GET')).toBe(false);
                expect(determineHasBody('DELETE')).toBe(false);
            });
        });

        describe('constructUrlPath', () => {
            it('replaces path parameters correctly', () => {
                const result = constructUrlPath({
                    path: '/users/:userId/posts/:postId',
                    pathParams: ['userId', 'postId'],
                    method: 'GET',
                    objectName: '',
                    responseSchema: '',
                });
                expect(result).toBe('/users/${userId}/posts/${postId}');
            });

            it('returns original path if no params', () => {
                const result = constructUrlPath({
                    path: '/status',
                    pathParams: [],
                    method: 'GET',
                    objectName: '',
                    responseSchema: '',
                });
                expect(result).toBe('/status');
            });
        });

        describe('addRequiredImports', () => {
            it('adds imports to source file for given schemas', () => {
                const mockSourceFile = {
                    getImportDeclarations: jest.fn(() => []),
                    addImportDeclaration: jest.fn()
                } as unknown as SourceFile;

                // const schemas = ['User', 'Post'];

                addRequiredImports(
                  mockSourceFile,
                  './output/User_api.ts',
                  './interfaces',
                  'CreateUserRequest',
                  'User',
                  true
                );

                expect(mockSourceFile.addImportDeclaration).toHaveBeenCalledTimes(4);
                expect(mockSourceFile.addImportDeclaration).toHaveBeenCalledWith({
                    namedImports: ['CreateUserRequest'],
                    moduleSpecifier: '../interfaces/CreateUserRequest'
                });
            });

            it('only supplies basic imports nothing if schemas array is empty', () => {
                const mockSourceFile = {
                    getImportDeclarations: jest.fn(() => []),
                    addImportDeclaration: jest.fn()
                } as unknown as SourceFile;

                addRequiredImports(
                  mockSourceFile,
                  './output/User_api.ts',
                  './interfaces',
                  undefined,
                  '',
                  false
                );

                expect(mockSourceFile.addImportDeclaration).toHaveBeenCalledTimes(3);
            });
        });

        describe('collectRequiredSchemas', () => {
            it('collects unique schemas from endpoints', () => {
                const endpoints: Endpoint[] = [
                    {
                        method: 'GET',
                        path: '/users',
                        responseSchema: 'UserList',
                        requestSchema: undefined,
                        objectName: 'userList',
                        pathParams: [],
                        queryParams: [],
                        headers: {}
                    },
                    {
                        method: 'POST',
                        path: '/users',
                        responseSchema: 'User',
                        requestSchema: 'CreateUserRequest',
                        objectName: 'user',
                        pathParams: [],
                        queryParams: [],
                        headers: {}
                    },
                    {
                        method: 'GET',
                        path: '/users/:id',
                        responseSchema: 'User',
                        requestSchema: undefined,
                        objectName: 'user',
                        pathParams: ['id'],
                        queryParams: [],
                        headers: {}
                    }
                ];

                const schemas = collectRequiredSchemas(endpoints);
                expect(Array.from(schemas)).toEqual(expect.arrayContaining(['UserList', 'User', 'CreateUserRequest']));
                expect(schemas.size).toBe(3);
            });
        });

        describe('findDirectoryContainingAllSchemas', () => {
            it('returns the directory containing all schemas', () => {
                const existingFiles = new Set([
                  path.join('/path/to/dir1', 'User.ts'),
                  path.join('/path/to/dir2', 'User.ts'),
                  path.join('/path/to/dir2', 'Post.ts'),
                  path.join('/path/to/dir3', 'Post.ts'),
                ]);
                // TODO: This is erroring in the IDE even though the function call is correct based on the signature
                const fsExistsSpy = jest.spyOn(fs, 'existsSync').mockImplementation((filePath) => {
                  return existingFiles.has(filePath.toString());
                });

                const requiredSchemas = new Set(['User', 'Post']);
                const interfaceNameToDirs = new Map([
                    ['User', new Set(['/path/to/dir1', '/path/to/dir2'])],
                    ['Post', new Set(['/path/to/dir2', '/path/to/dir3'])]
                ]);
                const configPath = '/some/config.json';
                const funcName = 'test';

                const result = findDirectoryContainingAllSchemas(requiredSchemas, interfaceNameToDirs, configPath, funcName);
                expect(result).toBe('/path/to/dir2');

                fsExistsSpy.mockRestore();
            });

            it('returns undefined if no directory contains all schemas', () => {
                // TODO: This is erroring in the IDE even though the function call is correct based on the signature
                jest.spyOn(fs, 'existsSync').mockReturnValue(false);

                const requiredSchemas = new Set(['A', 'B']);
                const interfaceNameToDirs = new Map([
                    ['A', new Set(['/dir1'])],
                    ['B', new Set(['/dir2'])]
                ]);
                const configPath = '/some/config.json';
                const funcName = 'test';

                const result = findDirectoryContainingAllSchemas(requiredSchemas, interfaceNameToDirs, configPath, funcName);
                expect(result).toBeNull();
            });
        });
    });
});
