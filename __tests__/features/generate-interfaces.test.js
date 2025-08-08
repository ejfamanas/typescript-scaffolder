"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const file_system_1 = require("../../src/utils/file-system");
const logger_1 = require("../../src/utils/logger");
const src_1 = require("../../src");
jest.mock('fs');
jest.mock('path');
jest.mock('../../src/utils/schema-inferer');
jest.mock('../../src/utils/file-system');
jest.mock('../../src/utils/logger');
const mockedFs = fs_1.default;
const mockedInferSchema = src_1.inferJsonSchemaFromPath;
const mockedInferSchemaFromPath = src_1.inferJsonSchemaFromPath;
const mockedEnsureDir = file_system_1.ensureDir;
const mockedWalkDirectory = file_system_1.walkDirectory;
const mockLogger = logger_1.Logger;
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
        await (0, src_1.generateInterfaces)(fakeFilePath, fakeRelativePath, fakeOutputDir);
        expect(mockedEnsureDir).toHaveBeenCalledWith(fakeOutputDir);
        expect(mockedFs.writeFileSync).toHaveBeenCalledWith(fakeOutputFile, 'export interface Example { id: string; }', 'utf-8');
        expect(mockLogger.debug).toHaveBeenCalled();
    });
    it('should log a warning if interface generation fails', async () => {
        mockedInferSchema.mockResolvedValue(null);
        await (0, src_1.generateInterfaces)(fakeFilePath, fakeRelativePath, fakeOutputDir);
        expect(mockLogger.warn).toHaveBeenCalledWith('generateTypedInterfaces', expect.stringContaining('Failed to generate interface'));
    });
    it('should log an error and throw on schema inference failure', async () => {
        const error = new Error('schema failure');
        mockedInferSchema.mockRejectedValue(error);
        await expect((0, src_1.generateInterfaces)(fakeFilePath, fakeRelativePath, fakeOutputDir)).rejects.toThrow();
    });
});
describe('generateFoldersAndTypedInterfaces', () => {
    it('should call walkDirectory with a callback', () => {
        const fakeSchemaDir = '/schemas';
        const fakeOutputDir = '/output';
        (0, src_1.generateInterfacesFromPath)(fakeSchemaDir, fakeOutputDir);
        expect(mockedWalkDirectory).toHaveBeenCalledWith(fakeSchemaDir, expect.any(Function), '.json');
    });
    it('should throw and log on critical inference error', async () => {
        const fakeError = new Error('schema failure');
        mockedInferSchemaFromPath.mockRejectedValue(fakeError);
        await expect((0, src_1.generateInterfaces)('/fake/input.json', 'input.json', '/fake/output')).rejects.toThrow();
    });
});
