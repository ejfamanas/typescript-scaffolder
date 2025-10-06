import {
    extractBaseType,
    generatePrimitiveMock,
    getFakerValueForKey,
    handleDefaultCase, isArrayType, isDateType
} from "../../../src/utils/mocking/mock-value-core";

describe('mock-value-core helper functions', () => {
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

describe('type detection helpers', () => {
    describe('isArrayType', () => {
        it('should detect types ending with []', () => {
            expect(isArrayType('string[]')).toBe(true);
        });
        it('should detect Array<T> types', () => {
            expect(isArrayType('Array<number>')).toBe(true);
        });
        it('should return false for non-array types', () => {
            expect(isArrayType('string')).toBe(false);
        });
    });

    describe('isDateType', () => {
        it('should detect exact Date type', () => {
            expect(isDateType('Date')).toBe(true);
        });
        it('should detect when Date appears in complex type', () => {
            expect(isDateType('Array<Date>')).toBe(true);
        });
        it('should return false for non-Date types', () => {
            expect(isDateType('string')).toBe(false);
        });
    });

    describe('extractBaseType', () => {
        it('should return base type from [] notation', () => {
            expect(extractBaseType('User[]')).toBe('User');
        });
        it('should return base type from Array<> notation', () => {
            expect(extractBaseType('Array<number>')).toBe('number');
        });
        it('should return unmodified type for non-array', () => {
            expect(extractBaseType('boolean')).toBe('boolean');
        });
    });
});