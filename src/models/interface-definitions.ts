
export interface ParsedProperty {
    name: string;
    type: string;
    optional: boolean;
    jsDoc?: string;
    unionTypes?: (string | number)[];
    elementType?: string;
    enumValues?: (string | number)[];
}

export interface ParsedInterface {
    name: string;
    properties: ParsedProperty[];
    typeParameters?: string[];
}