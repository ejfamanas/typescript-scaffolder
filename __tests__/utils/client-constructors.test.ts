import {
    generateInlineAuthHeader,
    generateClientAction,
    determineHasBody,
    constructUrlPath,
    addClientRequiredImports,
    collectRequiredSchemas,
    findDirectoryContainingAllSchemas,
    buildImportMapAndRegistryEntries
} from '../../src/utils/client-constructors';
import {Endpoint} from "../../src";
import {SourceFile} from "ts-morph";
import path from "path";
import fs from "fs";

describe('generateInlineAuthHeader', () => {
    it('should generate basic auth header', () => {
        const result = generateInlineAuthHeader('basic', {
            username: 'testUser',
            password: 'testPass',
        });
        expect(result).toContain('Authorization');
        expect(result).toContain('Basic');
    });

    it('should generate API key header', () => {
        const result = generateInlineAuthHeader('apikey', {
            apiKeyName: 'x-api-key',
            apiKeyValue: 'secret',
        });
        expect(result).toBe('{ "x-api-key": "secret" }');
    });

    it('should return empty object for authType none', () => {
        const result = generateInlineAuthHeader('none');
        expect(result).toBe('{}');
    });

    it('should return empty object if credentials are missing', () => {
        const result = generateInlineAuthHeader('apikey');
        expect(result).toBe('{}');
    });
});

describe('generateClientAction', () => {
    it('should generate filename and functionName from GET endpoint', () => {
        const endpoint: Endpoint = {
            method: 'GET',
            path: '/users',
            objectName: 'User',
            responseSchema: 'GET_RES_users',
        };
        const result = generateClientAction(endpoint);
        expect(result.functionName).toBe('GET_ALL_User');
        expect(result.fileName).toBe('User_api');
    });

    it('should generate correct function and file name from POST endpoint', () => {
        const endpoint: Endpoint = {
            method: 'POST',
            path: '/users',
            objectName: 'User',
            responseSchema: 'GET_RES_user',
        };
        const result = generateClientAction(endpoint);
        expect(result.functionName).toBe('POST_User');
        expect(result.fileName).toBe('User_api');
    });
});

describe('client helper functions', () => {
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

            addClientRequiredImports(
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

            addClientRequiredImports(
                mockSourceFile,
                './output/User_api.ts',
                './interfaces',
                undefined,
                '',
                false
            );

            expect(mockSourceFile.addImportDeclaration).toHaveBeenCalledTimes(2);
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

    it('logs warning and returns null if a required schema is not found in any directory', () => {
        const requiredSchemas = new Set(['MissingSchema']);
        const interfaceNameToDirs = new Map([
            ['User', new Set(['/some/dir'])]
        ]);
        const configPath = '/configs/sample-client.json';
        const funcName = 'test';

        // TODO: This is erroring in the IDE even though the function call is correct based on the signature
        const loggerWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        const loggerDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});

        const result = findDirectoryContainingAllSchemas(requiredSchemas, interfaceNameToDirs, configPath, funcName);

        expect(result).toBeNull();

        loggerWarnSpy.mockRestore();
        loggerDebugSpy.mockRestore();
    });
});

describe('buildImportMapAndRegistryEntries', () => {
    it('generates correct import and registry for single file', () => {
        const importMap = new Map<string, string[]>([
            ['service-a', ['service-a/foo.ts']]
        ]);

        const { importStatements, registryEntries } = buildImportMapAndRegistryEntries(importMap);

        expect(importStatements[0]).toBe("import * as foo from './service-a/foo';");
        expect(registryEntries[0]).toContain("'service-a':");
        expect(registryEntries[0]).toContain('...foo');
    });

    it('handles multiple files in one subdir', () => {
        const importMap = new Map<string, string[]>([
            ['service-a', ['service-a/foo.ts', 'service-a/bar.ts']]
        ]);

        const { importStatements, registryEntries } = buildImportMapAndRegistryEntries(importMap);

        expect(importStatements.length).toBe(2);
        expect(registryEntries[0]).toContain('...foo');
        expect(registryEntries[0]).toContain('...bar');
    });

    it('handles multiple subdirectories', () => {
        const importMap = new Map<string, string[]>([
            ['service-a', ['service-a/foo.ts']],
            ['service-b', ['service-b/bar.ts']]
        ]);

        const { importStatements, registryEntries } = buildImportMapAndRegistryEntries(importMap);

        expect(importStatements.length).toBe(2);
        expect(registryEntries.length).toBe(2);
        expect(registryEntries[0]).toContain('service-a');
        expect(registryEntries[1]).toContain('service-b');
    });

    it('sanitizes invalid import variable names', () => {
        const importMap = new Map<string, string[]>([
            ['service-a', ['service-a/foo-bar.ts']]
        ]);

        const { importStatements, registryEntries } = buildImportMapAndRegistryEntries(importMap);

        expect(importStatements[0]).toContain('import * as foo_bar from');
        expect(registryEntries[0]).toContain('...foo_bar');
    });

    it('normalizes backslashes in paths', () => {
        const importMap = new Map<string, string[]>([
            ['service\\a', ['service\\a\\foo.ts']]
        ]);

        const { importStatements, registryEntries } = buildImportMapAndRegistryEntries(importMap);

        expect(importStatements[0]).toBe("import * as service_a_foo from './service/a/service/a/foo';");
        expect(registryEntries[0]).toContain("'service/a':");
    });
});
