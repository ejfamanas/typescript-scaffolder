import fs from 'fs';
import path from 'path';
import {inferSchema, inferSchemaFromPath} from "../../src/utils/infer-schema-from-json";

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
        const result = await inferSchema(sampleJson);

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

        const result = await inferSchemaFromPath(tempPath);
        expect(result).toContain('export interface User');
        expect(result).toContain('preferences: Preferences');

        fs.unlinkSync(tempPath); // Cleanup
    });
    it('should throw on invalid JSON input', async () => {
        await expect(inferSchema('{"id": "1", "name": "test"')).rejects.toThrow();
    });

    it('should handle empty object input', async () => {
        const result = await inferSchema('{}');
        expect(result).toMatch(/export interface User\s*{[^}]*}/);
        expect(result).not.toMatch(/:/);
    });

    it('should produce union types for inconsistent field types', async () => {
        const inconsistent = JSON.stringify([
            { id: 1, flag: "true" },
            { id: "2", flag: true }
        ]);
        const result = await inferSchema(inconsistent);
        expect(result).toMatch(/id:\s*(number\s*\|\s*string|string\s*\|\s*number)/);
        expect(result).toMatch(/flag:\s*(boolean\s*\|\s*string|string\s*\|\s*boolean)/);
    });

    it('should infer optional properties', async () => {
        const partial = JSON.stringify([
            { name: "Alice" },
            { name: "Bob", age: 30 }
        ]);
        const result = await inferSchema(partial);
        expect(result).toMatch(/age\?: number/);
    });
});