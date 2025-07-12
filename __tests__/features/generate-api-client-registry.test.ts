import fs from 'fs';
import path from 'path';
import {generateApiRegistry, getApiFunction} from '../../src';
import { Logger } from '../../src/utils/logger';
import { walkDirectory } from '../../src/utils/file-system';

jest.mock('fs');
jest.mock('../../src/utils/file-system', () => ({
    walkDirectory: jest.fn()
}));

describe('generateApiRegistry', () => {
    const apiRootDir = '/fake/apis';
    const registryFilePath = path.join(apiRootDir, 'registry.ts');

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should log a warning and not write a file if no .ts files are found', async () => {
        (walkDirectory as jest.Mock).mockImplementation((_dir, cb) => {});

        // TODO: This is erroring in the IDE even though the function call is correct based on the signature
        // @ts-ignore
        const loggerSpy = jest.spyOn(Logger, 'warn').mockImplementation(() => {});

        await generateApiRegistry(apiRootDir);

        expect(loggerSpy).toHaveBeenCalledWith(
            'generateApiRegistry',
            'No API files found. Registry will not be generated.'
        );
    });

    it('should write registry file when API files are found', async () => {
        const files = [
            '/fake/apis/source-alpha/User_api.ts',
            '/fake/apis/source-beta/Token_api.ts'
        ];

        (walkDirectory as jest.Mock).mockImplementation((_dir, cb) => {
            files.forEach(f => cb(f));
        });
        // TODO: This is erroring in the IDE even though the function call is correct based on the signature
        // @ts-ignore
        const writeFileSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

        await generateApiRegistry(apiRootDir);

        expect(writeFileSpy).toHaveBeenCalledWith(
            registryFilePath,
            expect.stringContaining('export const apiRegistry ='),
            'utf8'
        );

        const content = writeFileSpy.mock.calls[0][1];
        expect(content).toContain("import * as User_api from './source-alpha/User_api'");
        expect(content).toContain("import * as Token_api from './source-beta/Token_api'");
        expect(content).toContain("'source-alpha': {\n    ...User_api");
        expect(content).toContain("'source-beta': {\n    ...Token_api");
    });
});

describe('getApiFunction', () => {
    const mockApiFn = jest.fn();
    const apiRegistry = {
        alpha: {
            GET_User: mockApiFn
        }
    };

    it('should return the correct function from the registry', () => {
        const fn = getApiFunction(apiRegistry, 'alpha', 'GET_User');
        expect(fn).toBe(mockApiFn);
    });

    it('should throw if service does not exist', () => {
        expect(() =>
            getApiFunction(apiRegistry, 'unknown', 'GET_User')
        ).toThrowError('Function "GET_User" not found in service "unknown".');
    });

    it('should throw if function does not exist in valid service', () => {
        expect(() =>
            getApiFunction(apiRegistry, 'alpha', 'MissingFn')
        ).toThrowError('Function "MissingFn" not found in service "alpha".');
    });
});