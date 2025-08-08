"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const fileSystemUtils = __importStar(require("../../src/utils/file-system"));
const file_system_1 = require("../../src/utils/file-system");
const generate_enums_1 = require("../../src/features/generate-enums");
const tempFilePath = path_1.default.resolve(__dirname, 'temp-interface.ts');
const samplePath = path_1.default.resolve(__dirname, 'sample.ts');
describe('generate-enums module', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    afterEach(() => {
        if (fs_1.default.existsSync(tempFilePath))
            fs_1.default.unlinkSync(tempFilePath);
        if (fs_1.default.existsSync(samplePath))
            fs_1.default.unlinkSync(samplePath);
    });
    describe('extractInterfaceKeysFromFile', () => {
        it('should extract interface name and keys', () => {
            const source = `
                export interface User {
                    id: string;
                    name: string;
                }
            `;
            fs_1.default.writeFileSync(tempFilePath, source, 'utf-8');
            const result = (0, generate_enums_1.extractInterfaceKeysFromFile)(tempFilePath);
            expect(result).toEqual([{ name: 'User', keys: ['id', 'name'] }]);
        });
    });
    describe('generateEnum', () => {
        it('should generate a valid enum', () => {
            const result = (0, generate_enums_1.generateEnum)('User', ['id', 'name']);
            expect(result).toContain('export enum UserKeys');
            expect(result).toContain('id = "id"');
            expect(result).toContain('name = "name"');
        });
        it('should quote keys if invalid identifier', () => {
            const result = (0, generate_enums_1.generateEnum)('Thing', ['valid', 'not-valid']);
            expect(result).toContain('"not-valid" = "not-valid"');
        });
    });
    describe('isValidIdentifier', () => {
        it('should validate correct identifiers', () => {
            expect((0, generate_enums_1.isValidIdentifier)('foo')).toBe(true);
            expect((0, generate_enums_1.isValidIdentifier)('_bar123')).toBe(true);
            expect((0, generate_enums_1.isValidIdentifier)('$baz')).toBe(true);
        });
        it('should invalidate incorrect identifiers', () => {
            expect((0, generate_enums_1.isValidIdentifier)('123abc')).toBe(false);
            expect((0, generate_enums_1.isValidIdentifier)('invalid-key')).toBe(false);
        });
    });
    describe('generateEnums', () => {
        it('should write file when interfaces are found', async () => {
            const interfaceContent = `export interface Product { sku: string; }`;
            fs_1.default.writeFileSync(samplePath, interfaceContent, 'utf-8');
            // Ensure the file is really flushed
            expect(fs_1.default.existsSync(samplePath)).toBe(true);
            // TODO: This is erroring in the IDE even though the function call is correct based on the signature
            // @ts-ignore
            const spy = jest.spyOn(fs_1.default, 'writeFileSync').mockImplementation(() => {
            });
            // TODO: This is erroring in the IDE even though the function call is correct based on the signature
            // @ts-ignore
            jest.spyOn(fileSystemUtils, 'ensureDir').mockImplementation(() => {
            });
            await (0, generate_enums_1.generateEnums)(samplePath, 'sample.ts', '/fake/output');
            expect(spy).toHaveBeenCalled();
            expect(spy.mock.calls[0][0]).toContain('sample.enums.ts');
        });
    });
    describe('generateEnumsFromPath', () => {
        let generateEnums;
        beforeEach(async () => {
            jest.resetModules();
            jest.clearAllMocks();
            jest.doMock('../../src/features/generate-enums', () => {
                const actual = jest.requireActual('../../src/features/generate-enums');
                return {
                    ...actual,
                    generateEnums: jest.fn(() => Promise.resolve()),
                };
            });
            // TODO: This is erroring in the IDE even though the function call is correct based on the signature
            // @ts-ignore
            jest.spyOn(fileSystemUtils, 'ensureDir').mockImplementation(() => {
            });
            const mod = await Promise.resolve().then(() => __importStar(require('../../src/features/generate-enums')));
            generateEnums = mod.generateEnums;
        });
        it('should trigger enum generation per file', async () => {
            const filename = 'Product.ts';
            const fakeInputDir = path_1.default.resolve(__dirname, 'temp');
            const fakeFilePath = path_1.default.join(fakeInputDir, filename);
            const fakeOutputDir = '/fake/output';
            fs_1.default.mkdirSync(fakeInputDir, { recursive: true });
            fs_1.default.writeFileSync(fakeFilePath, `export interface Product { sku: string; }`, 'utf-8');
            await (0, generate_enums_1.generateEnumsFromPath)(fakeInputDir, fakeOutputDir);
            expect(file_system_1.ensureDir).toHaveBeenCalledWith(fakeOutputDir);
            fs_1.default.rmdirSync(fakeInputDir);
        });
    });
});
