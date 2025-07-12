import { ParsedInterface, ParsedProperty } from "./interface-parser";

export function convertToJsonSchema(parsed: ParsedInterface, knownInterfaces: ParsedInterface[]): any {
  const schema: any = {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: parsed.name,
    type: "object",
    properties: {},
    required: [],
    definitions: {},
  };

  parsed.properties.forEach((prop: ParsedProperty) => {
    schema.properties[prop.name] = mapType(prop.type, knownInterfaces);
    if (!prop.optional) {
      schema.required.push(prop.name);
    }
  });

  if (schema.required.length === 0) {
    delete schema.required;
  }

  return schema;
}

export function mapType(tsType: string, knownInterfaces: ParsedInterface[]): any {
  if (tsType === "string") {
    return { type: "string" };
  }
  if (tsType === "number") {
    return { type: "number" };
  }
  if (tsType === "boolean") {
    return { type: "boolean" };
  }
  if (tsType.endsWith("[]")) {
    const itemType = tsType.slice(0, -2);
    return {
      type: "array",
      items: mapType(itemType, knownInterfaces),
    };
  }
  if (tsType.includes("|")) {
    const literals = tsType.split("|").map(v => v.trim());
    const isLiteralUnion = literals.every(v => /^"(.*)"$/.test(v));
    if (isLiteralUnion) {
      return { enum: literals.map(v => v.slice(1, -1)) };
    }
  }

  // If type matches a known interface, return a $ref
  const match = knownInterfaces.find(i => i.name === tsType);
  if (match) {
    return { $ref: `#/definitions/${tsType}` };
  }

  // fallback to generic object
  return { type: "object" };
}