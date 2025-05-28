import {deriveInterfaceName} from "../../src/utils/object-helpers";

describe('deriveInterfaceName', () => {
    it.each([
        ['user.json', 'User'],
        ['user-profile.json', 'UserProfile'],
        ['audit_log.json', 'AuditLog'],
        ['file-with-mix_case.json', 'FileWithMixCase'],
        ['file.name-with.dots.json', 'File.nameWith.dots'] // expected: dots remain
    ])('converts %s → %s', (input, expected) => {
        expect(deriveInterfaceName(input)).toBe(expected);
    });

    it('returns an empty string if input is empty', () => {
        expect(deriveInterfaceName('')).toBe('');
    });

    it('handles filenames with no extension', () => {
        expect(deriveInterfaceName('some_file')).toBe('SomeFile');
    });

    it('handles strings with only extension', () => {
        expect(deriveInterfaceName('.json')).toBe('');
    });

    it('handles non-standard characters safely', () => {
        expect(deriveInterfaceName('weird-__-file_name!!.json')).toBe('WeirdFileName!!');
    });
});