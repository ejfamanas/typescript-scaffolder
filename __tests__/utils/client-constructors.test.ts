import {
    generateInlineAuthHeader,
    generateClientAction,
    determineHasBody,
    constructUrlPath,
    addRequiredImports,
    collectRequiredSchemas,
    findDirectoryContainingAllSchemas
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
})