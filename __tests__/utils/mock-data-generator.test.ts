import {
    generateMockData,
    generatePrimitiveMock,
    getFakerValueForKey,
    handleDefaultCase
} from "../../src/utils/mock-data-generator";

const sampleUserSchema = JSON.stringify({
    id: 'string',
    name: 'string',
    email: 'string',
    age: 'number',
    isActive: 'boolean',
    roles: 'string[]',
    preferences: 'object' // explicitly flat here for mock; will be string placeholder
});

const sampleComplexUserSchema = JSON.stringify({
    ids: 'number[]',
    flags: 'boolean[]',
    nested: [{key: 'string'}],
    meta: {
        createdBy: 'string',
        timestamps: {
            createdAt: 'string',
            updatedAt: 'string'
        }
    }
});

describe('generateMockData', () => {
    it('should generate mock data of the correct length', () => {
        const result = generateMockData(5, sampleUserSchema);
        expect(result).toHaveLength(5);
    });

    it('should fill string fields with faker-generated values', () => {
        const result = generateMockData(1, sampleUserSchema);
        expect(typeof result[0].name).toBe('string');
        expect(result[0].name).not.toBe('');
    });

    it('should fill number and boolean fields correctly', () => {
        const result = generateMockData(1, sampleUserSchema);
        expect(typeof result[0].age).toBe('number');
        expect(typeof result[0].isActive).toBe('boolean');
    });

    it('should fill array fields with faker-generated values', () => {
        const result = generateMockData(1, sampleUserSchema);
        expect(Array.isArray(result[0].roles)).toBe(true);
        expect(typeof result[0].roles[0]).toBe('string');
    });

    it('should treat preferences as a flat type (string)', () => {
        const result = generateMockData(1, sampleUserSchema);
        expect(typeof result[0].preferences).toBe('string');
    });

    it('should fill number array fields with numeric values', () => {
        const result = generateMockData(1, sampleComplexUserSchema);
        expect(Array.isArray(result[0].ids)).toBe(true);
        expect(typeof result[0].ids[0]).toBe('number');
    });

    it('should fill boolean array fields with boolean values', () => {
        const result = generateMockData(1, sampleComplexUserSchema);
        expect(typeof result[0].flags[0]).toBe('boolean');
    });

    it('should preserve nested object arrays', () => {
        const result = generateMockData(1, sampleComplexUserSchema);
        expect(typeof result[0].nested[0]).toBe('object');
        expect(result[0].nested[0]).toHaveProperty('key');
    });

    it('should handle deeply nested objects in meta field', () => {
        const result = generateMockData(1, sampleComplexUserSchema);
        expect(typeof result[0].meta).toBe('object');
        expect(typeof result[0].meta.createdBy).toBe('string');
        expect(typeof result[0].meta.timestamps.createdAt).toBe('string');
        expect(typeof result[0].meta.timestamps.updatedAt).toBe('string');
    });

    it('should gracefully return item on unknown array item type', () => {
        const result = generateMockData(1, sampleComplexUserSchema);
        expect(result[0].nested.length).toBeGreaterThan(0);
    });

    it('should hit the default case for unusual array item types', () => {
        const result = generateMockData(1, JSON.stringify({
            weird: ['string', 'number', 'boolean']
        }));
        expect(result[0].weird.length).toBe(3);
    });
});

describe('mock-data-generator helper functions', () => {
    describe('generatePrimitiveMock', () => {
        it('should generate a string', () => {
            const value = generatePrimitiveMock('string');
            expect(typeof value).toBe('string');
        });

        it('should generate a number', () => {
            const value = generatePrimitiveMock('number');
            expect(typeof value).toBe('number');
        });

        it('should generate a boolean', () => {
            const value = generatePrimitiveMock('boolean');
            expect(typeof value).toBe('boolean');
        });

        it('should return an "UnhandledType" string for unknown types', () => {
            expect(generatePrimitiveMock('unknown')).toBe('UnhandledType<unknown>');
        });
    });

    describe('getFakerValueForKey', () => {
        it('should generate a fake email', () => {
            expect(getFakerValueForKey('userEmail')).toMatch(/@/);
        });

        it('should generate a fake name', () => {
            expect(typeof getFakerValueForKey('customerName')).toBe('string');
        });

        it('should generate a fake url', () => {
            expect(getFakerValueForKey('profileUrl')).toMatch(/^http/);
        });

        it('should return null if no match found', () => {
            expect(getFakerValueForKey('somethingElse')).toBeNull();
        });
    });

    describe('handleDefaultCase', () => {
        const sampleObj = { key: 'string' };

        it('should handle nested object arrays', () => {
            const result = handleDefaultCase([sampleObj], 'nestedArray', 2);
            expect(Array.isArray(result)).toBe(true);
            expect(typeof result[0]).toBe('object');
            expect(result[0]).toHaveProperty('key');
        });

        it('should handle arrays of primitive types', () => {
            const result = handleDefaultCase(['string', 'number', 'boolean'], 'mixed', 3);
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(3);
        });

        it('should handle a single nested object', () => {
            const result = handleDefaultCase(sampleObj, 'nestedObject', 1);
            expect(typeof result).toBe('object');
            expect(result).toHaveProperty('key');
        });

        it('should return an "UnhandledType" string for unknown structure', () => {
            const result = handleDefaultCase(null, 'unknown', 1);
            expect(result).toBe('UnhandledType<null>');
        });
    });
});