import fs from 'fs';
import path from 'path';
import * as fileSystemUtils from '../../src/utils/file-system';
import { ensureDir } from '../../src/utils/file-system';
import {
    extractInterfaceKeysFromFile,
    generateEnum,
    generateEnums,
    generateEnumsFromPath,
    isValidIdentifier
} from '../../src/features/generate-enums';

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

        it('should strip surrounding quotes and return raw keys', () => {
            const source = `
                export interface AdditionalInfo {
                    "Card Number": string;
                    "User-ID": string;
                }
            `;
            fs.writeFileSync(tempFilePath, source, 'utf-8');

            const result = extractInterfaceKeysFromFile(tempFilePath);

            // Keys should be returned without surrounding quotes, ready for enum generation
            expect(result).toEqual([{ name: 'AdditionalInfo', keys: ['Card Number', 'User-ID'] }]);
        });

        it('should dedupe duplicate properties within an interface', () => {
            const source = `
                export interface CustomAttribute {
                    uuid: string;
                    name: string;
                    uuid: string; // duplicate
                    name: string; // duplicate
                }
            `;
            fs.writeFileSync(tempFilePath, source, 'utf-8');

            const result = extractInterfaceKeysFromFile(tempFilePath);

            expect(result).toEqual([{ name: 'CustomAttribute', keys: ['uuid', 'name'] }]);
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

        it('should not double-quote keys that already include quotes in input', () => {
            // Simulate upstream passing a string that already contains quotes (e.g., ts-morph literal name)
            const result = generateEnum('Info', ['"Card Number"']);
            expect(result).toContain('"Card Number" = "Card Number"');
            expect(result).not.toContain('""Card Number""');
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
            // TODO: This is erroring in the IDE even though the function call is correct based on the signature
            // @ts-ignore
            const spy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {
            });
            // TODO: This is erroring in the IDE even though the function call is correct based on the signature
            // @ts-ignore
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
            // TODO: This is erroring in the IDE even though the function call is correct based on the signature
            // @ts-ignore
            jest.spyOn(fileSystemUtils, 'ensureDir').mockImplementation(() => {
            });

            const mod = await import('../../src/features/generate-enums');
            generateEnums = mod.generateEnums as jest.Mock;
        });

        it('should trigger enum generation per file', async () => {
            const filename = 'Product.ts'
            const fakeInputDir = path.resolve(__dirname, 'temp');
            const fakeFilePath = path.join(fakeInputDir, filename);
            const fakeOutputDir = '/fake/output';

            fs.mkdirSync(fakeInputDir, {recursive: true});
            fs.writeFileSync(fakeFilePath, `export interface Product { sku: string; }`, 'utf-8');

            await generateEnumsFromPath(fakeInputDir, fakeOutputDir);

            expect(ensureDir).toHaveBeenCalledWith(fakeOutputDir);

            fs.rmdirSync(fakeInputDir);
        });
    });
});