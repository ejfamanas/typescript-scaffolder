import {generateMockData} from "../../src/utils/mock-data-generator";

jest.mock('typia', () => ({
    random: <T>() => {
        return {
            // For User
            id: 'mock-id',
            name: 'Mock Name',
            email: 'mock@example.com',
            age: 42,
            isActive: true,
            roles: ['admin', 'editor'],
            preferences: {
                newsletter: true,
                theme: 'dark'
            },
            // For ComplexUser
            ids: [1, 2],
            flags: [true, false],
            nested: [{ key: 'value' }],
            mixed: [1, true, { foo: 'bar' }]
        } as T;
    }
}));
interface User {
    id: string;
    name: string;
    email: string;
    age: number;
    isActive: boolean;
    roles: string[];
    preferences: {
        newsletter: boolean;
        theme: string;
    };
}

interface ComplexUser {
    ids: number[];
    flags: boolean[];
    nested: { key: string }[];
    mixed: (number | boolean | { foo: string })[];
}

describe('generateMockData', () => {
    it('should generate mock data of the correct length', () => {
        const result = generateMockData<User>(5);
        expect(result).toHaveLength(5);
    });

    it('should override fields with a static object', () => {
        const result = generateMockData<User>(1, { email: 'test@example.com' });
        expect(result[0].email).toBe('test@example.com');
    });

    it('should override fields using a function', () => {
        const result = generateMockData<User>(1, (_, index) => ({ id: `user_${index}` }));
        expect(result[0].id).toBe('user_0');
    });

    it('should fill string fields with faker-generated values', () => {
        const result = generateMockData<User>(1);
        expect(typeof result[0].name).toBe('string');
        expect(result[0].name).not.toBe('');
    });

    it('should fill number and boolean fields correctly', () => {
        const result = generateMockData<User>(1);
        expect(typeof result[0].age).toBe('number');
        expect(typeof result[0].isActive).toBe('boolean');
    });

    it('should fill array fields with faker-generated values', () => {
        const result = generateMockData<User>(1);
        expect(Array.isArray(result[0].roles)).toBe(true);
        expect(typeof result[0].roles[0]).toBe('string');
    });

    it('should preserve nested object structure', () => {
        const result = generateMockData<User>(1);
        expect(typeof result[0].preferences).toBe('object');
        expect(typeof result[0].preferences.newsletter).toBe('boolean');
        expect(typeof result[0].preferences.theme).toBe('string');
    });

    it('should fill number array fields with numeric values', () => {
        const result = generateMockData<ComplexUser>(1);
        expect(Array.isArray(result[0].ids)).toBe(true);
        expect(typeof result[0].ids[0]).toBe('number');
    });

    it('should fill boolean array fields with boolean values', () => {
        const result = generateMockData<ComplexUser>(1);
        expect(typeof result[0].flags[0]).toBe('boolean');
    });

    it('should preserve nested object arrays', () => {
        const result = generateMockData<ComplexUser>(1);
        expect(typeof result[0].nested[0]).toBe('object');
        expect(result[0].nested[0]).toHaveProperty('key');
    });

    it('should gracefully return item on unknown array item type', () => {
        const result = generateMockData<ComplexUser>(1);
        expect(result[0].mixed.length).toBeGreaterThan(0);
    });

    it('should hit the default case for unusual array item types', () => {
        const result = generateMockData<any>(1, {
            weird: [Symbol('x'), () => {}, undefined]
        });

        expect(result[0].weird.length).toBe(3);
    });
});