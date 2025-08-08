"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const object_helpers_1 = require("../../src/utils/object-helpers");
describe('deriveObjectName', () => {
    it('should not convert kebab-case to PascalCase', () => {
        expect((0, object_helpers_1.deriveObjectName)('user-profile.json')).toBe('userprofile');
    });
    it('should not convert snake_case to PascalCase preserving underscores', () => {
        expect((0, object_helpers_1.deriveObjectName)('order_log.json')).toBe('order_log');
    });
    it('should handle mixed case filenames', () => {
        expect((0, object_helpers_1.deriveObjectName)('Custom_File_Name.json')).toBe('Custom_File_Name');
    });
    it('should not camelCase lowercase filenames', () => {
        expect((0, object_helpers_1.deriveObjectName)('user_data.json')).toBe('user_data');
    });
    it('should remove dashes but preserve underscores', () => {
        expect((0, object_helpers_1.deriveObjectName)('data-fetch_log.json')).toBe('datafetch_log');
    });
    it('should handle single word filenames', () => {
        expect((0, object_helpers_1.deriveObjectName)('Invoice.json')).toBe('Invoice');
    });
});
describe('inferPrimitiveType', () => {
    it('infers boolean true', () => {
        expect((0, object_helpers_1.inferPrimitiveType)('true')).toBe('boolean');
    });
    it('infers boolean false', () => {
        expect((0, object_helpers_1.inferPrimitiveType)('false')).toBe('boolean');
    });
    it('infers number from numeric string', () => {
        expect((0, object_helpers_1.inferPrimitiveType)('42')).toBe('number');
        expect((0, object_helpers_1.inferPrimitiveType)('3.14')).toBe('number');
    });
    it('infers string from non-numeric, non-boolean string', () => {
        expect((0, object_helpers_1.inferPrimitiveType)('hello')).toBe('string');
        expect((0, object_helpers_1.inferPrimitiveType)('123abc')).toBe('string');
    });
});
describe('findGloballyDuplicatedKeys', () => {
    it('should return duplicated keys across sibling objects', () => {
        const input = {
            user: { id: 1, name: 'Alice' },
            admin: { id: 999, role: 'admin' }
        };
        const result = (0, object_helpers_1.findGloballyDuplicatedKeys)(input);
        expect(result).toEqual(new Set(['id']));
    });
    it('should return duplicated keys across nested objects', () => {
        const input = {
            user: {
                id: 1,
                profile: { id: 'profile-123', status: 'active' }
            },
            metadata: {
                status: 'ok',
                timestamp: '2024-01-01'
            }
        };
        const result = (0, object_helpers_1.findGloballyDuplicatedKeys)(input);
        expect(result).toEqual(new Set(['id', 'status']));
    });
    it('should detect duplicates inside arrays of objects', () => {
        const input = {
            logs: [
                { event: 'login', timestamp: '2024-01-01' },
                { event: 'logout', timestamp: '2024-01-01' }
            ],
            session: {
                id: 'abc',
                timestamp: '2024-01-01T12:00:00Z'
            }
        };
        const result = (0, object_helpers_1.findGloballyDuplicatedKeys)(input);
        expect(result).toEqual(new Set(['event', 'timestamp']));
    });
    it('should return an empty set when no keys are duplicated', () => {
        const input = {
            a: { x: 1 },
            b: { y: 2 },
            c: { z: 3 }
        };
        const result = (0, object_helpers_1.findGloballyDuplicatedKeys)(input);
        expect(result).toEqual(new Set());
    });
    it('should handle empty objects and arrays safely', () => {
        const input = {
            list: [],
            detail: {},
            user: { id: 1 }
        };
        const result = (0, object_helpers_1.findGloballyDuplicatedKeys)(input);
        expect(result).toEqual(new Set());
    });
});
describe('prefixDuplicateKeys', () => {
    const dedupeJsonKeys = (input) => {
        return JSON.stringify((0, object_helpers_1.prefixDuplicateKeys)(input, (0, object_helpers_1.findGloballyDuplicatedKeys)(input)));
    };
    it('should prefix keys that are globally duplicated', () => {
        const input = {
            parent: {
                id: 1,
                name: 'Parent'
            },
            child: {
                id: 2,
                name: 'Child'
            }
        };
        const duplicateKeys = new Set(['id', 'name']);
        const result = (0, object_helpers_1.prefixDuplicateKeys)(input, duplicateKeys);
        expect(result).toEqual({
            parent: {
                "parent__PREFIX__id": 1,
                "parent__PREFIX__name": 'Parent'
            },
            child: {
                "child__PREFIX__id": 2,
                "child__PREFIX__name": 'Child'
            }
        });
    });
    it('should not throw an error if an array contains more than one item', () => {
        const input = {
            users: [
                { id: 1 },
                { id: 2 }
            ]
        };
        const duplicateKeys = new Set(['id']);
        expect(() => {
            (0, object_helpers_1.prefixDuplicateKeys)(input, duplicateKeys);
        }).not.toThrow();
    });
    it('should deduplicate and prefix nested keys from a JSON object that was converted from SOAP', () => {
        const input = {
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
                },
            ],
            errorCode: "S",
            errorNumber: 0,
            errorDesc: "Success",
            uniqID: 3235
        };
        const result = dedupeJsonKeys(input);
        expect(JSON.parse(result)).toEqual({
            "badges": [
                {
                    "fgB_EmployeeID": 15579,
                    "externalEmployeeID": "1008888998",
                    "passes": [
                        {
                            "passID": 17277,
                            "passes__PREFIX__errorCode": "S",
                            "passes__PREFIX__errorNumber": 0,
                            "passes__PREFIX__errorDesc": "Success",
                            "passes__PREFIX__uniqID": 0
                        }
                    ],
                    "badges__PREFIX__errorCode": "S",
                    "badges__PREFIX__errorNumber": 0,
                    "badges__PREFIX__errorDesc": "Success",
                    "badges__PREFIX__uniqID": 3235,
                }
            ],
            "errorCode": "S",
            "errorNumber": 0,
            "errorDesc": "Success",
            "uniqID": 3235
        });
    });
    it('should prefix nested duplicated keys without mutating original object', () => {
        const input = {
            reports: [
                {
                    reportID: 101,
                    status: "ok",
                    metadata: [
                        {
                            version: "1.0",
                            status: "valid",
                            timestamp: "2024-01-01T00:00:00Z"
                        }
                    ],
                    statusCode: 200,
                    timestamp: "2024-01-01T12:00:00Z"
                }
            ],
            status: "complete",
            timestamp: "2024-01-01T12:00:00Z"
        };
        const result = dedupeJsonKeys(input);
        expect(JSON.parse(result)).toEqual({
            reports: [
                {
                    reportID: 101,
                    "reports__PREFIX__status": "ok",
                    metadata: [
                        {
                            version: "1.0",
                            "metadata__PREFIX__status": "valid",
                            "metadata__PREFIX__timestamp": "2024-01-01T00:00:00Z"
                        }
                    ],
                    statusCode: 200,
                    "reports__PREFIX__timestamp": "2024-01-01T12:00:00Z"
                }
            ],
            status: "complete",
            timestamp: "2024-01-01T12:00:00Z"
        });
    });
});
describe('toPascalCase', () => {
    const fn = (str) => str
        .replace(/([-_]\w)/g, g => g[1].toUpperCase())
        .replace(/^\w/, c => c.toUpperCase());
    it('converts kebab-case to PascalCase', () => {
        expect(fn('user-profile')).toBe('UserProfile');
    });
    it('converts snake_case to PascalCase', () => {
        expect(fn('order_log')).toBe('OrderLog');
    });
    it('preserves PascalCase as is', () => {
        expect(fn('Invoice')).toBe('Invoice');
    });
    it('converts lowercase to PascalCase', () => {
        expect(fn('profile')).toBe('Profile');
    });
    it('handles mixed separators', () => {
        expect(fn('some_data-id')).toBe('SomeDataId');
    });
});
