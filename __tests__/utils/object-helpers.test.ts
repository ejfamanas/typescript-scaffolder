import {
    deriveObjectName, findGloballyDuplicatedKeys,
    inferPrimitiveType,
    prefixDuplicateKeys
} from '../../src/utils/object-helpers';

describe('deriveObjectName', () => {
    it('should not convert kebab-case to PascalCase', () => {
        expect(deriveObjectName('user-profile.json')).toBe('userprofile');
    });

    it('should not convert snake_case to PascalCase preserving underscores', () => {
        expect(deriveObjectName('order_log.json')).toBe('order_log');
    });

    it('should handle mixed case filenames', () => {
        expect(deriveObjectName('Custom_File_Name.json')).toBe('Custom_File_Name');
    });

    it('should not camelCase lowercase filenames', () => {
        expect(deriveObjectName('user_data.json')).toBe('user_data');
    });

    it('should remove dashes but preserve underscores', () => {
        expect(deriveObjectName('data-fetch_log.json')).toBe('datafetch_log');
    });

    it('should handle single word filenames', () => {
        expect(deriveObjectName('Invoice.json')).toBe('Invoice');
    });
});

describe('inferPrimitiveType', () => {
    it('infers boolean true', () => {
        expect(inferPrimitiveType('true')).toBe('boolean');
    });

    it('infers boolean false', () => {
        expect(inferPrimitiveType('false')).toBe('boolean');
    });

    it('infers number from numeric string', () => {
        expect(inferPrimitiveType('42')).toBe('number');
        expect(inferPrimitiveType('3.14')).toBe('number');
    });

    it('infers string from non-numeric, non-boolean string', () => {
        expect(inferPrimitiveType('hello')).toBe('string');
        expect(inferPrimitiveType('123abc')).toBe('string');
    });
});

describe('findGloballyDuplicatedKeys', () => {
    it('should return duplicated keys across sibling objects', () => {
        const input = {
            user: { id: 1, name: 'Alice' },
            admin: { id: 999, role: 'admin' }
        };

        const result = findGloballyDuplicatedKeys(input);
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

        const result = findGloballyDuplicatedKeys(input);
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

        const result = findGloballyDuplicatedKeys(input);
        expect(result).toEqual(new Set(['event', 'timestamp']));
    });

    it('should return an empty set when no keys are duplicated', () => {
        const input = {
            a: { x: 1 },
            b: { y: 2 },
            c: { z: 3 }
        };

        const result = findGloballyDuplicatedKeys(input);
        expect(result).toEqual(new Set());
    });

    it('should handle empty objects and arrays safely', () => {
        const input = {
            list: [],
            detail: {},
            user: { id: 1 }
        };

        const result = findGloballyDuplicatedKeys(input);
        expect(result).toEqual(new Set());
    });
});

describe('prefixDuplicateKeys', () => {
    const dedupeJsonKeys = (input: any): string => {
        return JSON.stringify(prefixDuplicateKeys(input, findGloballyDuplicatedKeys(input)))
    }
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
        const result = prefixDuplicateKeys(input, duplicateKeys);
        expect(result).toEqual({
            parent: {
                parent_id: 1,
                parent_name: 'Parent'
            },
            child: {
                child_id: 2,
                child_name: 'Child'
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
            prefixDuplicateKeys(input, duplicateKeys);
        }).not.toThrow()
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
                            "passes_errorCode": "S",
                            "passes_errorNumber": 0,
                            "passes_errorDesc": "Success",
                            "passes_uniqID": 0
                        }
                    ],
                    "badges_errorCode": "S",
                    "badges_errorNumber": 0,
                    "badges_errorDesc": "Success",
                    "badges_uniqID": 3235,
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
                    reports_status: "ok",
                    metadata: [
                        {
                            version: "1.0",
                            metadata_status: "valid",
                            metadata_timestamp: "2024-01-01T00:00:00Z"
                        }
                    ],
                    statusCode: 200,
                    reports_timestamp: "2024-01-01T12:00:00Z"
                }
            ],
            status: "complete",
            timestamp: "2024-01-01T12:00:00Z"
        });
    });
});