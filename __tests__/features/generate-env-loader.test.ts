import fs from 'fs';
import path from 'path';
import {generateEnvLoader} from "../../src";

jest.mock('fs');
jest.mock('../../src/utils/file-system', () => ({
    ensureDir: jest.fn()
}));
jest.mock('../../src/utils/logger', () => ({
    Logger: {
        debug: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn()
    }
}));

// --- ts-morph mock ---
const mockAddClass = jest.fn();
const mockAddEnum = jest.fn();
const mockSaveSync = jest.fn();

const mockSourceFile = {
    addClass: mockAddClass,
    addEnum: mockAddEnum,
    saveSync: mockSaveSync,
};

const mockCreateSourceFile = jest.fn(() => mockSourceFile);

jest.mock('ts-morph', () => ({
    Project: jest.fn().mockImplementation(() => ({
        createSourceFile: mockCreateSourceFile,
    })),
}));

const mockReadFileSync = fs.readFileSync as jest.Mock;
const mockExistsSync = fs.existsSync as jest.Mock;

describe('generateEnvLoader', () => {
    const envPath = path.resolve(__dirname, '../__mocks__/.env');
    const OUTPUT_PATH = './generated';
    const OUTPUT_FILE = 'env.ts';

    beforeEach(() => {
        jest.clearAllMocks();
        mockExistsSync.mockReturnValue(true);
    });

    it('should generate class and enum from env file', () => {
        mockReadFileSync.mockReturnValue(`APP_PORT=3000\nDEBUG=true\nAPP_NAME=MyApp`);

        expect(() => {
            generateEnvLoader(envPath, OUTPUT_PATH, OUTPUT_FILE);
        }).not.toThrow();

        expect(mockCreateSourceFile).toHaveBeenCalledWith(expect.stringContaining(OUTPUT_FILE), '', { overwrite: true });
        expect(mockAddClass).toHaveBeenCalled();
        expect(mockAddEnum).toHaveBeenCalled();
        expect(mockSaveSync).toHaveBeenCalled();
    });

    it('throws if env file does not exist', () => {
        mockExistsSync.mockReturnValue(false);
        expect(() => {
            generateEnvLoader(envPath, OUTPUT_PATH, OUTPUT_FILE);
        }).toThrow();
    });

    it('warns on empty value', () => {
        mockReadFileSync.mockReturnValue(`DEBUG=\nAPP_PORT=3000`);
        expect(() => {
            generateEnvLoader(envPath, OUTPUT_PATH, OUTPUT_FILE);
        }).not.toThrow();
    });

    it('throws on bad key format', () => {
        mockReadFileSync.mockReturnValue(`badKey=123`);
        expect(() => {
            generateEnvLoader(envPath, OUTPUT_PATH, OUTPUT_FILE);
        }).toThrow();
    });

    it('throws on duplicate keys', () => {
        mockReadFileSync.mockReturnValue(`APP_PORT=3000\nAPP_PORT=4000`);
        expect(() => {
            generateEnvLoader(envPath, OUTPUT_PATH, OUTPUT_FILE);
        }).toThrow();
    });

    it('warns if fewer than 2 variables', () => {
        mockReadFileSync.mockReturnValue(`APP_PORT=3000`);
        expect(() => {
            generateEnvLoader(envPath, OUTPUT_PATH, OUTPUT_FILE);
        }).not.toThrow();
    });

    it('throws if invalid filename is used', () => {
        mockReadFileSync.mockReturnValue(`APP_PORT=3000`);
        expect(() => {
            generateEnvLoader('config.json', OUTPUT_PATH, OUTPUT_FILE);
        }).toThrow();
    });
});