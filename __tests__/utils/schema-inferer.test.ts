import fs from 'fs';
import path from 'path';
import {inferJsonSchema, inferJsonSchemaFromPath} from "../../src";

const sampleObject = {
    id: 'u_123',
    email: 'alice@example.com',
    age: 29,
    isActive: true,
    roles: ['admin', 'editor'],
    preferences: {
        newsletter: true,
        theme: 'dark'
    },
    lastLogin: '2024-12-01T10:15:30Z'
};

const sampleJson = JSON.stringify(sampleObject, null, 2);

describe('infer-schema-from-json', () => {
    it('should infer correct TypeScript interface from JSON string', async () => {
        const result = await inferJsonSchema(sampleJson, "User");

        expect(result).toMatch(/export interface User/);
        expect(result).toMatch(/id:\s*string/);
        expect(result).toMatch(/email:\s*string/);
        expect(result).toMatch(/age:\s*number/);
        expect(result).toMatch(/isActive:\s*boolean/);
        expect(result).toMatch(/roles:\s*string\[\]/);
        expect(result).toMatch(/lastLogin:\s*(string|Date)/); // quicktype may use either
    });

    it('should infer schema from a JSON file', async () => {
        const tempPath = path.join(__dirname, 'temp-user.json');
        fs.writeFileSync(tempPath, sampleJson, 'utf-8');

        const result = await inferJsonSchemaFromPath(tempPath);
        expect(result).toContain('export interface TempUser');
        expect(result).toContain('preferences: Preferences');

        fs.unlinkSync(tempPath); // Cleanup
    });
    it('should return null on invalid JSON input', async () => {
        await expect(inferJsonSchema('{"id": "1", "name": "test"', "test")).resolves.toBeNull();
    });

    it('should handle empty object input', async () => {
        const result = await inferJsonSchema('{}', "User");
        expect(result).toMatch(/export interface User\s*{[^}]*}/);
        expect(result).not.toMatch(/:/);
    });

    it('should produce union codegen for inconsistent field codegen', async () => {
        const inconsistent = JSON.stringify([
            { id: 1, flag: "true" },
            { id: "2", flag: true }
        ]);
        const result = await inferJsonSchema(inconsistent, "test");
        expect(result).toMatch(/id:\s*(number\s*\|\s*string|string\s*\|\s*number)/);
        expect(result).toMatch(/flag:\s*(boolean\s*\|\s*string|string\s*\|\s*boolean)/);
    });

    it('should infer optional properties', async () => {
        const partial = JSON.stringify([
            { name: "Alice" },
            { name: "Bob", age: 30 }
        ]);
        const result = await inferJsonSchema(partial, "test");
        expect(result).toMatch(/age\?: number/);
    });
});

describe('inferSchemaFromPath - error handling', () => {
    const originalReadFileSync = fs.readFileSync;

    afterEach(() => {
        fs.readFileSync = originalReadFileSync;
    });

    it('returns null and logs a warning when file read fails', async () => {
        fs.readFileSync = jest.fn(() => {
            throw new Error('ENOENT: no such file or directory');
        }) as unknown as typeof fs.readFileSync;

        const result = await inferJsonSchemaFromPath('/nonexistent/file.json');
        expect(result).toBeNull();
    });

    it('should convert null values to any type', async () => {
        const input = JSON.stringify({
            id: null,
            name: "Alice",
            metadata: null
        });

        const result = await inferJsonSchema(input, "NullableExample");
        console.log(result);
        expect(result).toMatch(/id:\s*any/);
        expect(result).toMatch(/metadata:\s*any/);
        expect(result).toMatch(/name:\s*string/);
    });
});
