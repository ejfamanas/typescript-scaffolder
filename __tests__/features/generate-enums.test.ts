import fs from 'fs';
import path from 'path';
import * as fileSystemUtils from '../../src/utils/file-system';
import {
    extractInterfaceKeysFromFile,
    generateEnum,
    generateEnums,
    generateEnumsFromPath,
    isValidIdentifier
} from '../../src/features/generate-enums';
import {ensureDir} from "../../src/utils/file-system";

const tempFilePath = path.resolve(__dirname, 'temp-interface.ts');
const samplePath = path.resolve(__dirname, 'sample.ts');

describe('generate-enums module', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        if (fs.existsSync(samplePath)) fs.unlinkSync(samplePath);
    });

    describe('extractInterfaceKeysFromFile', () => {
        it('should extract interface name and keys', () => {
            const source = `
                export interface User {
                    id: string;
                    name: string;
                }
            `;
            fs.writeFileSync(tempFilePath, source, 'utf-8');

            const result = extractInterfaceKeysFromFile(tempFilePath);

            expect(result).toEqual([{name: 'User', keys: ['id', 'name']}]);
        });
    });

    describe('generateEnum', () => {
        it('should generate a valid enum', () => {
            const result = generateEnum('User', ['id', 'name']);
            expect(result).toContain('export enum UserKeys');
            expect(result).toContain('id = "id"');
            expect(result).toContain('name = "name"');
        });

        it('should quote keys if invalid identifier', () => {
            const result = generateEnum('Thing', ['valid', 'not-valid']);
            expect(result).toContain('"not-valid" = "not-valid"');
        });
    });

    describe('isValidIdentifier', () => {
        it('should validate correct identifiers', () => {
            expect(isValidIdentifier('foo')).toBe(true);
            expect(isValidIdentifier('_bar123')).toBe(true);
            expect(isValidIdentifier('$baz')).toBe(true);
        });

        it('should invalidate incorrect identifiers', () => {
            expect(isValidIdentifier('123abc')).toBe(false);
            expect(isValidIdentifier('invalid-key')).toBe(false);
        });
    });

    describe('generateEnums', () => {
        it('should write file when interfaces are found', async () => {
            const interfaceContent = `export interface Product { sku: string; }`;
            fs.writeFileSync(samplePath, interfaceContent, 'utf-8');

            // Ensure the file is really flushed
            expect(fs.existsSync(samplePath)).toBe(true);

            const spy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {
            });
            jest.spyOn(fileSystemUtils, 'ensureDir').mockImplementation(() => {
            });

            await generateEnums(samplePath, 'sample.ts', '/fake/output');

            expect(spy).toHaveBeenCalled();
            expect(spy.mock.calls[0][0]).toContain('sample.enums.ts');
        });
    });

    describe('generateEnumsFromPath', () => {
        let generateEnums: jest.Mock;

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

            jest.spyOn(fileSystemUtils, 'ensureDir').mockImplementation(() => {});

            const mod = await import('../../src/features/generate-enums');
            generateEnums = mod.generateEnums as jest.Mock;
        });

        it('should trigger enum generation per file', async () => {
            const filename = 'Product.ts'
            const fakeInputDir = path.resolve(__dirname, 'temp');
            const fakeFilePath = path.join(fakeInputDir, filename);
            const fakeOutputDir = '/fake/output';

            fs.mkdirSync(fakeInputDir, { recursive: true });
            fs.writeFileSync(fakeFilePath, `export interface Product { sku: string; }`, 'utf-8');

            await generateEnumsFromPath(fakeInputDir, fakeOutputDir);

            expect(ensureDir).toHaveBeenCalledWith(fakeOutputDir);

            fs.rmdirSync(fakeInputDir);
        });
    });
});