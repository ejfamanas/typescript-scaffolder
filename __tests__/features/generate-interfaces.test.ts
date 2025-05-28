import fs from 'fs';
import path from 'path';
import {ensureDir, walkDirectory} from "../../src/utils/file-system";
import {Logger} from "../../src/utils/logger";
import {generateInterfaces, generateInterfacesFromPath, inferJsonSchemaFromPath} from "../../src";


jest.mock('fs');
jest.mock('path');
jest.mock('../../src/utils/schema-inferer');
jest.mock('../../src/utils/file-system');
jest.mock('../../src/utils/logger');

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedInferSchema = inferJsonSchemaFromPath as jest.MockedFunction<typeof inferJsonSchemaFromPath>;
const mockedInferSchemaFromPath = inferJsonSchemaFromPath as jest.MockedFunction<typeof inferJsonSchemaFromPath>;
const mockedEnsureDir = ensureDir as jest.MockedFunction<typeof ensureDir>;
const mockedWalkDirectory = walkDirectory as jest.MockedFunction<typeof walkDirectory>;
const mockLogger = Logger as jest.Mocked<typeof Logger>;

describe('generateTypedInterfaces', () => {
    const fakeFilePath = '/some/input/file.json';
    const fakeRelativePath = 'file.json';
    const fakeOutputDir = '/some/output';
    const fakeOutputFile = '/some/output/file.ts';

    beforeEach(() => {
        jest.clearAllMocks();
        mockedInferSchema.mockResolvedValue('export interface Example { id: string; }');
    });

    it('should write a file when interface is successfully generated', async () => {
        await generateInterfaces(fakeFilePath, fakeRelativePath, fakeOutputDir);

        expect(mockedEnsureDir).toHaveBeenCalledWith(fakeOutputDir);
        expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
            fakeOutputFile,
            'export interface Example { id: string; }',
            'utf-8'
        );
        expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should log a warning if interface generation fails', async () => {
        mockedInferSchema.mockResolvedValue(null);
        await generateInterfaces(fakeFilePath, fakeRelativePath, fakeOutputDir);

        expect(mockLogger.warn).toHaveBeenCalledWith(
            'generateTypedInterfaces',
            expect.stringContaining('Failed to generate interface')
        );
    });

    it('should log and throw on schema inference error', async () => {
        const error = new Error('schema failure');
        mockedInferSchema.mockRejectedValue(error);

        // ✅ This line must be returned so the test runner waits on it
        return expect(
            generateInterfaces(fakeFilePath, fakeRelativePath, fakeOutputDir)
        ).rejects.toThrow('Critical error when trying to process');
    });
});

describe('generateFoldersAndTypedInterfaces', () => {
    it('should call walkDirectory with a callback', () => {
        const fakeSchemaDir = '/schemas';
        const fakeOutputDir = '/output';

        generateInterfacesFromPath(fakeSchemaDir, fakeOutputDir);

        expect(mockedWalkDirectory).toHaveBeenCalledWith(
            fakeSchemaDir,
            expect.any(Function)
        );
    });
    it('should throw and log on critical inference error', async () => {
        const fakeError = new Error('schema failure');
        mockedInferSchemaFromPath.mockRejectedValue(fakeError);

        await expect(
            generateInterfaces('/fake/input.json', 'input.json', '/fake/output')
        ).rejects.toThrow('Critical error when trying to process');
    });
});