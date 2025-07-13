/**
 * Models for representing parsed TypeScript interfaces and their properties,
 * used by the codegen to produce a typed JSON schema from an interface file.
 */

/**
 * Represents a single property extracted from a TypeScript interface.
 */
export interface ParsedProperty {
    /** The property name as declared in the interface. */
    name: string;
    /** The TypeScript type of the property (e.g., 'string', 'number'). */
    type: string;
    /** Whether the property is marked optional ('?') in the interface. */
    optional: boolean;
    /** Any JSDoc comment associated with the property. */
    jsDoc?: string;
    /** Literal values if the property is a union of literals. */
    unionTypes?: (string | number)[];
    /** The element type if the property is an array (e.g., 'string' for string[]). */
    elementType?: string;
    /** Enum values if the property references an enum type. */
    enumValues?: (string | number)[];
}

/**
 * Represents a parsed TypeScript interface, including its name and properties.
 */
export interface ParsedInterface {
    /** The name of the interface. */
    name: string;
    /** Array of properties defined on the interface. */
    properties: ParsedProperty[];
    /** Generic type parameters declared on the interface, if any. */
    typeParameters?: string[];
}