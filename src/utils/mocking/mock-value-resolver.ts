import { extractBaseType, isArrayType, isDateType } from "./mock-value-core";

/**
 * Attempts to map key names to more specific faker generators.
 */
function getFakerValueForKey(key: string): string | null {
    const lower = key.toLowerCase();
    if (lower.includes("email")) return "faker.internet.email()";
    if (lower.includes("name")) return "faker.person.fullName()";
    if (lower.includes("url")) return "faker.internet.url()";
    if (lower.includes("id")) return "faker.string.uuid()";
    if (lower.includes("phone")) return "faker.phone.number()";
    if (lower.includes("address")) return "faker.location.streetAddress()";
    if (lower.includes("city")) return "faker.location.city()";
    if (lower.includes("country")) return "faker.location.country()";
    if (lower.includes("amount") || lower.includes("price")) return "faker.commerce.price()";
    return null;
}

/**
 * Generates a faker-based mock value expression string for code generation.
 */
export function generateFakerMockValue(type: string, key?: string): string {
    if (isArrayType(type)) {
        const baseType = extractBaseType(type);
        return `[${generateFakerMockValue(baseType, key)}]`;
    }
    if (isDateType(type)) return "faker.date.recent()";
    if (type.includes("string")) return getFakerValueForKey(key ?? "") ?? "faker.lorem.word()";
    if (type.includes("number")) return "faker.number.int({ min: 1, max: 1000 })";
    if (type.includes("boolean")) return "faker.datatype.boolean()";
    return "{}";
}

/**
 * Generates a deterministic, simple mock value expression string for code generation.
 */
export function generateStaticMockValue(type: string, key?: string): string {
    if (isArrayType(type)) {
        const baseType = extractBaseType(type);
        return `[${generateStaticMockValue(baseType, key)}]`;
    }
    if (isDateType(type)) return "new Date()";
    if (type.includes("string")) return `"example_${key}"`;
    if (type.includes("number")) return "0";
    if (type.includes("boolean")) return "true";
    return "{}";
}

/**
 * High-level resolver — decides how to mock a property based on type,
 * whether it's a local interface, and if faker is enabled.
 * Used by the factory generator and future scaffolds. * @param name
 * @param name
 * @param type
 * @param localInterfaces
 * @param useFakerDefaults
 */
export function getMockValueForProperty(
    name: string,
    type: string,
    localInterfaces: Set<string>,
    useFakerDefaults: boolean
): string {
    if (isArrayType(type)) {
        const base = extractBaseType(type);
        if (localInterfaces.has(base)) {
            return `[${base}Factory.create()]`;
        }
        return useFakerDefaults
            ? generateFakerMockValue(type, name)
            : generateStaticMockValue(type, name);
    }

    if (localInterfaces.has(type)) {
        return `${type}Factory.create()`;
    }

    let mockValue = useFakerDefaults
        ? generateFakerMockValue(type, name)
        : generateStaticMockValue(type, name);

    const isPrimitive = ["string", "number", "boolean", "Date"].some((t) =>
        type.includes(t)
    );
    if (mockValue === "{}" && !isPrimitive) {
        mockValue = `{} as unknown as ${type}`;
    }

    return mockValue;
}