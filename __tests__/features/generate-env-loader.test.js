"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const src_1 = require("../../src");
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
const mockReadFileSync = fs_1.default.readFileSync;
const mockExistsSync = fs_1.default.existsSync;
describe('generateEnvLoader', () => {
    const envPath = path_1.default.resolve(__dirname, '../__mocks__/.env');
    const OUTPUT_PATH = './generated';
    const OUTPUT_FILE = 'env.ts';
    beforeEach(() => {
        jest.clearAllMocks();
        mockExistsSync.mockReturnValue(true);
    });
    it('should generate class and enum from env file', () => {
        mockReadFileSync.mockReturnValue(`APP_PORT=3000\nDEBUG=true\nAPP_NAME=MyApp`);
        expect(() => {
            (0, src_1.generateEnvLoader)(envPath, OUTPUT_PATH, OUTPUT_FILE);
        }).not.toThrow();
        expect(mockCreateSourceFile).toHaveBeenCalledWith(expect.stringContaining(OUTPUT_FILE), '', { overwrite: true });
        expect(mockAddClass).toHaveBeenCalled();
        expect(mockAddEnum).toHaveBeenCalled();
        expect(mockSaveSync).toHaveBeenCalled();
    });
    it('throws if env file does not exist', () => {
        mockExistsSync.mockReturnValue(false);
        expect(() => {
            (0, src_1.generateEnvLoader)(envPath, OUTPUT_PATH, OUTPUT_FILE);
        }).toThrow();
    });
    it('warns on empty value', () => {
        mockReadFileSync.mockReturnValue(`DEBUG=\nAPP_PORT=3000`);
        expect(() => {
            (0, src_1.generateEnvLoader)(envPath, OUTPUT_PATH, OUTPUT_FILE);
        }).not.toThrow();
    });
    it('throws on bad key format', () => {
        mockReadFileSync.mockReturnValue(`badKey=123`);
        expect(() => {
            (0, src_1.generateEnvLoader)(envPath, OUTPUT_PATH, OUTPUT_FILE);
        }).toThrow();
    });
    it('throws on duplicate keys', () => {
        mockReadFileSync.mockReturnValue(`APP_PORT=3000\nAPP_PORT=4000`);
        expect(() => {
            (0, src_1.generateEnvLoader)(envPath, OUTPUT_PATH, OUTPUT_FILE);
        }).toThrow();
    });
    it('warns if fewer than 2 variables', () => {
        mockReadFileSync.mockReturnValue(`APP_PORT=3000`);
        expect(() => {
            (0, src_1.generateEnvLoader)(envPath, OUTPUT_PATH, OUTPUT_FILE);
        }).not.toThrow();
    });
    it('throws if invalid filename is used', () => {
        mockReadFileSync.mockReturnValue(`APP_PORT=3000`);
        expect(() => {
            (0, src_1.generateEnvLoader)('config.json', OUTPUT_PATH, OUTPUT_FILE);
        }).toThrow();
    });
});
