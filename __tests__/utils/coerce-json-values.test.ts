import {coerceJson, coerceJsonValue, safeCoerceJson} from "../../src/utils/coerce-json-values";

describe('coerceJsonValue', () => {
    it('should convert "true" to boolean true', () => {
        expect(coerceJsonValue("true")).toBe(true);
    });

    it('should convert "false" to boolean false', () => {
        expect(coerceJsonValue("false")).toBe(false);
    });

    it('should convert "42" to number 42', () => {
        expect(coerceJsonValue("42")).toBe(42);
    });

    it('should convert "null" to null', () => {
        expect(coerceJsonValue("null")).toBeNull();
    });

    it('should return unmodified value for non-string input', () => {
        expect(coerceJsonValue(true)).toBe(true);
        expect(coerceJsonValue(123)).toBe(123);
    });

    it('should return uncoerced string if no match is found', () => {
        expect(coerceJsonValue("hello")).toBe("hello");
    });
});

describe('coerceJson', () => {
    it('should recursively coerce object values', () => {
        const input = {
            a: "true",
            b: "123",
            c: "null",
            d: {
                nested: "false"
            }
        };
        expect(coerceJson(input)).toEqual({ a: true, b: 123, c: null, d: { nested: false } });
    });

    it('should coerce array of stringified values', () => {
        const input = ["true", "42", "null"];
        expect(coerceJson(input)).toEqual([true, 42, null]);
    });
});

describe('safeCoerceJson', () => {
    it('should parse and coerce stringified JSON input', () => {
        const input = '{"active":"true","count":"10"}';
        expect(safeCoerceJson(input)).toEqual({ active: true, count: 10 });
    });

    it('should handle already-parsed JSON object', () => {
        const input = { active: "false", score: "99" };
        expect(safeCoerceJson(input)).toEqual({ active: false, score: 99 });
    });
});