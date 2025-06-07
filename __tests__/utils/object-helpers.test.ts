import { deriveInterfaceName, inferPrimitiveType } from '../../src/utils/object-helpers';

describe('deriveInterfaceName', () => {
    it('converts kebab-case to PascalCase', () => {
        const result = deriveInterfaceName('/some/path/user-profile.json');
        expect(result).toBe('UserProfile');
    });

    it('converts snake_case to PascalCase', () => {
        const result = deriveInterfaceName('/some/path/order_log.json');
        expect(result).toBe('OrderLog');
    });

    it('handles filenames without dashes or underscores', () => {
        const result = deriveInterfaceName('/some/path/customer.json');
        expect(result).toBe('Customer');
    });

    it('handles complex filenames', () => {
        const result = deriveInterfaceName('/some/path/admin-user_log-entry.json');
        expect(result).toBe('AdminUserLogEntry');
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