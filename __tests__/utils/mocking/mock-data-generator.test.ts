import { generateMockData } from "../../../src/utils/mocking/mock-data-generator";

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