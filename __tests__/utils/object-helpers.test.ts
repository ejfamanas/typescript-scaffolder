import { deriveObjectName, inferPrimitiveType } from '../../src/utils/object-helpers';

describe('deriveObjectName', () => {
    it('should convert kebab-case to PascalCase', () => {
        expect(deriveObjectName('user-profile.json')).toBe('UserProfile');
    });

    it('should convert snake_case to PascalCase preserving underscores', () => {
        expect(deriveObjectName('order_log.json')).toBe('Order_Log');
    });

    it('should handle mixed case filenames', () => {
        expect(deriveObjectName('Custom_File_Name.json')).toBe('Custom_File_Name');
    });

    it('should camelCase lowercase filenames', () => {
        expect(deriveObjectName('user_data.json')).toBe('User_Data');
    });

    it('should remove dashes but preserve underscores', () => {
        expect(deriveObjectName('data-fetch_log.json')).toBe('DataFetch_Log');
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