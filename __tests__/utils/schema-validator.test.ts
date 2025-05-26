import {
    assertEnumValue,
    assertInRange,
    assertNoDuplicateKeys,
    assertRequiredFields,
    assertStructure
} from "../../src/utils/schema-validator";


describe('validate-schema utils', () => {
    describe('assertRequiredFields', () => {
        it('should pass when all required fields are present', () => {
            expect(() =>
                assertRequiredFields({ id: 1, name: 'Alice' }, ['id', 'name'])
            ).not.toThrow();
        });

        it('should throw when required fields are missing', () => {
            expect(() =>
                assertRequiredFields({ id: 1 }, ['id', 'name'])
            ).toThrow(/Missing required fields: name/);
        });
    });

    describe('assertStructure', () => {
        it('should pass when structure matches', () => {
            expect(() =>
                assertStructure({ id: 'abc', age: 30 }, { id: 'string', age: 'number' })
            ).not.toThrow();
        });

        it('should throw when structure does not match', () => {
            expect(() =>
                assertStructure({ id: 'abc', age: '30' }, { id: 'string', age: 'number' })
            ).toThrow(/Field 'age' should be of type 'number'/);
        });
    });

    describe('assertNoDuplicateKeys', () => {
        it('should pass when there are no duplicate keys', () => {
            const json = '{"id": 1, "name": "Alice"}';
            expect(() => assertNoDuplicateKeys(json)).not.toThrow();
        });

        it('should throw when duplicate keys are present', () => {
            const json = '{"id": 1, "id": 2}';
            expect(() => assertNoDuplicateKeys(json)).toThrow(/Duplicate key detected: id/);
        });
    });

    describe('assertEnumValue', () => {
        it('should pass when value is in enum', () => {
            expect(() => assertEnumValue('status', 'active', ['active', 'inactive'])).not.toThrow();
        });

        it('should throw when value is not in enum', () => {
            expect(() => assertEnumValue('status', 'archived', ['active', 'inactive']))
                .toThrow(/Field 'status' must be one of/);
        });
    });

    describe('assertInRange', () => {
        it('should pass when value is within range', () => {
            expect(() => assertInRange('score', 80, 0, 100)).not.toThrow();
        });

        it('should throw when value is out of range', () => {
            expect(() => assertInRange('score', 150, 0, 100)).toThrow(/must be between/);
        });

        it('should throw when value is not a number', () => {
            expect(() => assertInRange('score', 'notANumber' as any, 0, 100)).toThrow(/must be a number/);
        });
    });
});