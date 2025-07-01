import {
    assertEnumValue,
    assertInRange,
    assertNoDuplicateKeys,
    assertRequiredFields,
    assertStructure
} from "../../src/utils/structure-validators";
import {Logger} from "../../src/utils/logger";


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
            ).toThrow();
        });
    });

    describe('assertStructure', () => {
        it('should pass when structure matches', () => {
            expect(() =>
                assertStructure({ id: 'abc', age: 30 }, { id: 'string', age: 'number' })
            ).not.toThrow();
        });

        it('should warn when structure does not match', () => {
            expect(() =>
                assertStructure({ id: 'abc', age: '30' }, { id: 'string', age: 'number' })
            ).not.toThrow(/Field 'age' should be of type 'number'/);
        });
    });

    describe('assertNoDuplicateKeys', () => {
        it('should pass when there are no duplicate keys', () => {
            const json = '{"id": 1, "name": "Alice"}';
            expect(() => assertNoDuplicateKeys(json, "")).not.toThrow();
        });

        it('should warn when duplicate keys are present', () => {
            const json = '{"id": 1, "id": 2}';
            expect(() => assertNoDuplicateKeys(json, "")).not.toThrow();
        });
    });

    describe('assertEnumValue', () => {
        it('should pass when value is in enum', () => {
            expect(() => assertEnumValue('status', 'active', ['active', 'inactive'])).not.toThrow();
        });

        it('should warn when value is not in enum', () => {
            expect(() => assertEnumValue('status', 'archived', ['active', 'inactive']))
                .not.toThrow();
        });
    });

    describe('assertInRange', () => {
        it('should pass when value is within range', () => {
            expect(() => assertInRange('score', 80, 0, 100)).not.toThrow();
        });

        it('should not throw when value is out of range', () => {
            expect(() => assertInRange('score', 150, 0, 100)).not.toThrow();
        });

        it('should not throw when value is not a number', () => {
            expect(() => assertInRange('score', 'notANumber' as any, 0, 100)).not.toThrow();
        });
    });
});

describe('schema-validator warnings on garbage input', () => {
    it('should warn on duplicate keys and invalid structure', () => {
        // TODO: This keeps throwing a signature error when its not
        const spyWarn = jest.spyOn(Logger, 'warn').mockImplementation(() => {});
        const json = `
        {
            "id": 1,
            "id": 2,
            "errorCode": 123,
            "errorDesc": null
        }
        `;

        // Run duplicate key check
        assertNoDuplicateKeys(json, "");

        // Run structure check
        const parsed = JSON.parse(json);
        assertStructure(parsed, {
            errorCode: 'string',
            errorDesc: 'string',
        });

        expect(spyWarn).toHaveBeenCalledWith(
            'assertNoDuplicateKeys',
            expect.stringContaining('Duplicate key detected: id')
        );

        expect(spyWarn).toHaveBeenCalledWith(
            'assertStructure',
            expect.stringContaining("Field 'errorCode' should be of type 'string'")
        );

        expect(spyWarn).toHaveBeenCalledWith(
            'assertStructure',
            expect.stringContaining("Field 'errorDesc' should be of type 'string'")
        );

        spyWarn.mockRestore();
    });
});