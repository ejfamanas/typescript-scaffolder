import fs from 'fs';
import path from 'path';
import { inferJsonSchema, inferJsonSchemaFromPath } from "../../src";

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

describe('inferSchemaFromJson', () => {
    it('should convert union null types to optional any', async () => {
        const input = JSON.stringify({
            nickname: "Ally",
            notes: null
        });

        const result = await inferJsonSchema(input, "NullableUnion");
        expect(result).toMatch(/nickname:\s*string/);
        expect(result).toMatch(/notes\?:\s*any/);
    });
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
        expect(result).toContain('export interface tempuser');
        expect(result).toContain('preferences: Preferences');

        fs.unlinkSync(tempPath); // Cleanup
    });

    it('should throw on invalid JSON input', async () => {
        await expect(
          inferJsonSchema('{"id": "1", "name": "test"', "test")
        ).rejects.toThrow(/Invalid JSON input/);
    });

    it('should handle empty object input', async () => {
        const result = await inferJsonSchema('{}', "User");
        expect(result).toMatch(/export interface User\s*{[^}]*}/);
        expect(result).not.toMatch(/:/);
    });

    it('should transform quoted key with null to optional any (root level)', async () => {
        const input = JSON.stringify({
            "Card Number": null,
            name: "Alice"
        });

        const result = await inferJsonSchema(input, "PaymentRoot");
        expect(result).toMatch(/"Card Number"\?:\s*any/);
        expect(result).toMatch(/name:\s*string/);
    });

    it('should transform quoted key with null to optional any (nested object)', async () => {
        const input = JSON.stringify({
            payment: {
                "Card Number": null,
                method: "visa"
            }
        });

        const result = await inferJsonSchema(input, "PaymentNested");
        expect(result).toMatch(/payment:\s*Payment/);
        // Regardless of nested interface naming, ensure the quoted key is optional any somewhere in the output
        expect(result).toMatch(/"Card Number"\?:\s*any/);
        expect(result).toMatch(/method:\s*string/);
    });
    it('should infer interfaces from nested duplicate-key JSON correctly', async () => {
        const json = JSON.stringify({
            badges: [
                {
                    fgB_EmployeeID: 15579,
                    externalEmployeeID: "1008888998",
                    passes: [
                        {
                            passID: 17277,
                            errorCode: "S",
                            errorNumber: 0,
                            errorDesc: "Success",
                            uniqID: 0
                        }
                    ],
                    errorCode: "S",
                    errorNumber: 0,
                    errorDesc: "Success",
                    uniqID: 3235
                }
            ],
            errorCode: "S",
            errorNumber: 0,
            errorDesc: "Success",
            uniqID: 3235
        });

        const result = await inferJsonSchema(json, "POST_RES_Create_Badge");

        // Top-level interface
        expect(result).toMatch(/export interface POST_RES_Create_Badge/);
        expect(result).toMatch(/badges:\s*Badge\[\]/);
        expect(result).toMatch(/errorCode:\s*string/);
        expect(result).toMatch(/errorNumber:\s*number/);
        expect(result).toMatch(/errorDesc:\s*string/);
        expect(result).toMatch(/uniqID:\s*number/);
        // Badge interface
        expect(result).toMatch(/export interface Badge/);
        expect(result).toMatch(/fgB_EmployeeID:\s*number/);
        expect(result).toMatch(/externalEmployeeID:\s*string/);
        expect(result).toMatch(/passes:\s*Pass\[\]/);
        expect(result).toMatch(/errorCode:\s*string/);
        expect(result).toMatch(/errorNumber:\s*number/);
        expect(result).toMatch(/errorDesc:\s*string/);
        expect(result).toMatch(/uniqID:\s*number/);
        // Pass interface
        expect(result).toMatch(/export interface Pass/);
        expect(result).toMatch(/passID:\s*number/);
        expect(result).toMatch(/errorCode:\s*string/);
        expect(result).toMatch(/errorNumber:\s*number/);
        expect(result).toMatch(/errorDesc:\s*string/);
        expect(result).toMatch(/uniqID:\s*number/);
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
        expect(result).toMatch(/id\?:\s*any/);
        expect(result).toMatch(/metadata\?:\s*any/);
        expect(result).toMatch(/name:\s*string/);
    });
});

it('should unprefix keys back to original names in final interface output', async () => {
    const input = JSON.stringify({
        system: {
            uuid: "abc-123",
            status: "ok",
            card_uuid: "dfijosijfdlskjf"
        },
        module: {
            uuid: "xyz-789",
            status: "fail",
            module_card_uuid: "dfijosijfdlskjf"
        },
        status: "pending"
    });

    const result = await inferJsonSchema(input, "SystemStatus");

    // Confirm unprefixing: keys like 'status' and 'uuid' should exist as expected
    expect(result).toMatch(/system:\s*System/);
    expect(result).toMatch(/module:\s*Module/);
    expect(result).toMatch(/status:\s*string/); // root-level key remains
    expect(result).toMatch(/uuid:\s*string/);   // unprefixed uuid exists with quotes
    expect(result).toMatch(/card_uuid:\s*string/);
    expect(result).toMatch(/module_card_uuid:\s*string/);
    expect(result).not.toMatch(/__PREFIX__uuid/);       // prefixed key should not appear
});