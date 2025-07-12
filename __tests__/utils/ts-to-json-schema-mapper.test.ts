import { convertToJsonSchema, mapType } from "../../src/utils/ts-to-json-schema-mapper";
import { ParsedInterface } from "../../src/utils/interface-parser";

describe("mapType", () => {
  it("maps primitive types", () => {
    expect(mapType("string", [])).toEqual({ type: "string" });
    expect(mapType("number", [])).toEqual({ type: "number" });
    expect(mapType("boolean", [])).toEqual({ type: "boolean" });
  });

  it("maps array types", () => {
    expect(mapType("string[]", [])).toEqual({
      type: "array",
      items: { type: "string" },
    });
  });

  it("maps nested arrays", () => {
    expect(mapType("string[][]", [])).toEqual({
      type: "array",
      items: {
        type: "array",
        items: { type: "string" },
      },
    });
  });

  it("ignores non-literal unions for now", () => {
    expect(mapType("string | number", [])).toEqual({ type: "object" });
  });

  it("handles boolean arrays", () => {
    expect(mapType("boolean[]", [])).toEqual({
      type: "array",
      items: { type: "boolean" },
    });
  });

  it("maps union of literals", () => {
    expect(mapType('"a" | "b" | "c"', [])).toEqual({
      enum: ["a", "b", "c"],
    });
  });

  it("maps known interface references to $ref", () => {
    const known: ParsedInterface[] = [
      { name: "User", properties: [] },
    ];
    expect(mapType("User", known)).toEqual({ $ref: "#/definitions/User" });
  });

  it("falls back to object for unknown types", () => {
    expect(mapType("CustomType", [])).toEqual({ type: "object" });
  });
});

describe("convertToJsonSchema", () => {
  it("converts a basic interface", () => {
    const parsed: ParsedInterface = {
      name: "Example",
      properties: [
        { name: "id", type: "string", optional: false },
        { name: "label", type: "string", optional: true },
      ],
    };

    const schema = convertToJsonSchema(parsed, []);
    expect(schema).toEqual({
      $schema: "http://json-schema.org/draft-07/schema#",
      title: "Example",
      type: "object",
      properties: {
        id: { type: "string" },
        label: { type: "string" },
      },
      required: ["id"],
      definitions: {},
    });
  });

  it("omits required if no fields are required", () => {
    const parsed: ParsedInterface = {
      name: "NoRequired",
      properties: [
        { name: "note", type: "string", optional: true },
      ],
    };

    const schema = convertToJsonSchema(parsed, []);
    expect(schema.required).toBeUndefined();
  });

  it("generates schema with multiple required fields", () => {
    const parsed: ParsedInterface = {
      name: "MultiField",
      properties: [
        { name: "id", type: "string", optional: false },
        { name: "count", type: "number", optional: false },
        { name: "optionalLabel", type: "string", optional: true },
      ],
    };

    const schema = convertToJsonSchema(parsed, []);
    expect(schema.required).toEqual(["id", "count"]);
    expect(schema.properties.optionalLabel).toEqual({ type: "string" });
  });
});