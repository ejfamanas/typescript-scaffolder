type JSONValue = string | number | boolean | null | JSONObject | JSONArray;
interface JSONObject { [key: string]: JSONValue; }
interface JSONArray extends Array<JSONValue> {}

/**
 * Coerces values like "true" => true, "42" => 42, "null" => null
 */
export function coerceJsonValue(value: JSONValue): JSONValue {
    if (typeof value !== 'string') return value;

    const trimmed = value.trim().toLowerCase();

    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (trimmed === 'null') return null;

    const num = Number(value);
    if (!isNaN(num) && value !== '') return num;

    return value;
}

export function coerceJson(input: JSONValue): JSONValue {
    if (Array.isArray(input)) {
        return input.map(coerceJson) as JSONArray;
    }

    if (input && typeof input === 'object') {
        const result: JSONObject = {};
        for (const [key, value] of Object.entries(input)) {
            result[key] = coerceJson(value);
        }
        return result;
    }

    return coerceJsonValue(input);
}

/**
 * Accepts either a stringified JSON or a parsed object, then coerces types.
 */
export function safeCoerceJson(input: string | JSONValue): JSONValue {
    const parsed = typeof input === 'string' ? JSON.parse(input) : input;
    return coerceJson(parsed);
}