"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const structure_validators_1 = require("../../src/utils/structure-validators");
const logger_1 = require("../../src/utils/logger");
describe('validate-schema utils', () => {
    describe('assertRequiredFields', () => {
        it('should pass when all required fields are present', () => {
            expect(() => (0, structure_validators_1.assertRequiredFields)({ id: 1, name: 'Alice' }, ['id', 'name'])).not.toThrow();
        });
        it('should throw when required fields are missing', () => {
            expect(() => (0, structure_validators_1.assertRequiredFields)({ id: 1 }, ['id', 'name'])).toThrow();
        });
    });
    describe('assertStructure', () => {
        it('should pass when structure matches', () => {
            expect(() => (0, structure_validators_1.assertStructure)({ id: 'abc', age: 30 }, { id: 'string', age: 'number' })).not.toThrow();
        });
        it('should warn when structure does not match', () => {
            expect(() => (0, structure_validators_1.assertStructure)({ id: 'abc', age: '30' }, { id: 'string', age: 'number' })).not.toThrow(/Field 'age' should be of type 'number'/);
        });
    });
    describe('assertNoDuplicateKeys', () => {
        it('should pass when there are no duplicate keys', () => {
            const json = '{"id": 1, "name": "Alice"}';
            expect(() => (0, structure_validators_1.assertNoDuplicateKeys)(json, "")).not.toThrow();
        });
        it('should warn when duplicate keys are present', () => {
            const json = '{"id": 1, "id": 2}';
            expect(() => (0, structure_validators_1.assertNoDuplicateKeys)(json, "")).not.toThrow();
        });
    });
    describe('assertEnumValue', () => {
        it('should pass when value is in enum', () => {
            expect(() => (0, structure_validators_1.assertEnumValue)('status', 'active', ['active', 'inactive'])).not.toThrow();
        });
        it('should warn when value is not in enum', () => {
            expect(() => (0, structure_validators_1.assertEnumValue)('status', 'archived', ['active', 'inactive']))
                .not.toThrow();
        });
    });
    describe('assertInRange', () => {
        it('should pass when value is within range', () => {
            expect(() => (0, structure_validators_1.assertInRange)('score', 80, 0, 100)).not.toThrow();
        });
        it('should not throw when value is out of range', () => {
            expect(() => (0, structure_validators_1.assertInRange)('score', 150, 0, 100)).not.toThrow();
        });
        it('should not throw when value is not a number', () => {
            expect(() => (0, structure_validators_1.assertInRange)('score', 'notANumber', 0, 100)).not.toThrow();
        });
    });
});
describe('schema-validator warnings on garbage input', () => {
    it('should warn on duplicate keys and invalid structure', () => {
        // TODO: This is erroring in the IDE even though the function call is correct based on the signature
        // @ts-ignore
        const spyWarn = jest.spyOn(logger_1.Logger, 'warn').mockImplementation(() => { });
        const json = `
        {
            "id": 1,
            "id": 2,
            "errorCode": 123,
            "errorDesc": null
        }
        `;
        // Run duplicate key check
        (0, structure_validators_1.assertNoDuplicateKeys)(json, "");
        // Run structure check
        const parsed = JSON.parse(json);
        (0, structure_validators_1.assertStructure)(parsed, {
            errorCode: 'string',
            errorDesc: 'string',
        });
        expect(spyWarn).toHaveBeenCalledWith('assertNoDuplicateKeys', expect.stringContaining('Duplicate key detected: id'));
        expect(spyWarn).toHaveBeenCalledWith('assertStructure', expect.stringContaining("Field 'errorCode' should be of type 'string'"));
        expect(spyWarn).toHaveBeenCalledWith('assertStructure', expect.stringContaining("Field 'errorDesc' should be of type 'string'"));
        spyWarn.mockRestore();
    });
});
describe('assertSequences validator', () => {
    let spyError;
    let spyWarn;
    let spyDebug;
    beforeEach(() => {
        // TODO: This is erroring in the IDE even though the function call is correct based on the signature
        // @ts-ignore
        spyError = jest.spyOn(logger_1.Logger, 'error').mockImplementation(() => { });
        // TODO: This is erroring in the IDE even though the function call is correct based on the signature
        // @ts-ignore
        spyWarn = jest.spyOn(logger_1.Logger, 'warn').mockImplementation(() => { });
        // TODO: This is erroring in the IDE even though the function call is correct based on the signature
        // @ts-ignore
        spyDebug = jest.spyOn(logger_1.Logger, 'debug').mockImplementation(() => { });
    });
    afterEach(() => {
        spyError.mockRestore();
        spyWarn.mockRestore();
        spyDebug.mockRestore();
    });
    it('passes when no sequences field', () => {
        expect(() => (0, structure_validators_1.assertSequences)({})).not.toThrow();
        expect(spyDebug).toHaveBeenCalledWith('assertSequences', 'Validating sequences block');
    });
    it('errors when sequences is not an array', () => {
        expect(() => (0, structure_validators_1.assertSequences)({ sequences: 'not-an-array' })).not.toThrow();
        expect(spyError).toHaveBeenCalledWith('assertSequences', '`sequences` must be an array');
    });
    it('errors if a sequence is missing name or steps', () => {
        const cfg = { sequences: [{ name: 'Seq1' }] };
        expect(() => (0, structure_validators_1.assertSequences)(cfg)).not.toThrow();
        // Should catch missing 'steps' field
        expect(spyError).toHaveBeenCalledWith('assertSequence', expect.stringContaining("Missing required field 'steps'"));
    });
    it('errors if steps is not an array', () => {
        const cfg = { sequences: [{ name: 'Seq1', steps: 'oops' }] };
        expect(() => (0, structure_validators_1.assertSequences)(cfg)).not.toThrow();
        expect(spyError).toHaveBeenCalledWith('assertSequence', '`steps` must be an array in sequence Seq1');
    });
    it('errors on unknown step type', () => {
        const cfg = {
            sequences: [
                {
                    name: 'Seq1',
                    steps: [{ id: 'x', type: 'foobar', endpoint: 'GET /x' }]
                }
            ]
        };
        expect(() => (0, structure_validators_1.assertSequences)(cfg)).not.toThrow();
        expect(spyError).toHaveBeenCalledWith('assertSequenceStep', "Unknown step type 'foobar' in step x");
    });
    it('valid fetchList step with proper extract', () => {
        const cfg = {
            sequences: [
                {
                    name: 'Seq1',
                    steps: [
                        {
                            id: 'fetchUsers',
                            type: 'fetchList',
                            endpoint: 'GET /users',
                            extract: { as: 'userIds', field: 'id' }
                        }
                    ]
                }
            ]
        };
        expect(() => (0, structure_validators_1.assertSequences)(cfg)).not.toThrow();
    });
    it('errors when fetchList step missing extract', () => {
        const cfg = {
            sequences: [
                {
                    name: 'Seq1',
                    steps: [
                        { id: 'fetchUsers', type: 'fetchList', endpoint: 'GET /users' }
                    ]
                }
            ]
        };
        expect(() => (0, structure_validators_1.assertSequences)(cfg)).not.toThrow();
        expect(spyError).toHaveBeenCalledWith('assertRequiredFields', 'Missing required fields: extract');
    });
    it('valid loop with nested steps', () => {
        const cfg = {
            sequences: [
                {
                    name: 'Seq1',
                    steps: [
                        { id: 'fetchUsers', type: 'fetchList', endpoint: 'GET /users', extract: { as: 'ids', field: 'id' } },
                        {
                            id: 'loopUsers',
                            type: 'loop',
                            over: 'ids',
                            itemName: 'userId',
                            steps: [
                                { id: 'action1', type: 'action', endpoint: 'POST /users/{userId}/meta' }
                            ]
                        }
                    ]
                }
            ]
        };
        expect(() => (0, structure_validators_1.assertSequences)(cfg)).not.toThrow();
    });
    it('errors when loop step missing fields', () => {
        const cfg = {
            sequences: [
                {
                    name: 'Seq1',
                    steps: [
                        { id: 'loopUsers', type: 'loop', over: 'ids', itemName: 'userId', steps: 'nope' }
                    ]
                }
            ]
        };
        expect(() => (0, structure_validators_1.assertSequences)(cfg)).not.toThrow();
        expect(spyWarn).toHaveBeenCalledWith('assertStructure', expect.stringContaining("Field 'steps' should be of type 'object'"));
    });
});
