"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts_to_json_schema_mapper_1 = require("../../src/utils/ts-to-json-schema-mapper");
describe("mapType", () => {
    it("maps primitive types", () => {
        expect((0, ts_to_json_schema_mapper_1.mapType)("string", [])).toEqual({ type: "string" });
        expect((0, ts_to_json_schema_mapper_1.mapType)("number", [])).toEqual({ type: "number" });
        expect((0, ts_to_json_schema_mapper_1.mapType)("boolean", [])).toEqual({ type: "boolean" });
    });
    it("maps array types", () => {
        expect((0, ts_to_json_schema_mapper_1.mapType)("string[]", [])).toEqual({
            type: "array",
            items: { type: "string" },
        });
    });
    it("maps nested arrays", () => {
        expect((0, ts_to_json_schema_mapper_1.mapType)("string[][]", [])).toEqual({
            type: "array",
            items: {
                type: "array",
                items: { type: "string" },
            },
        });
    });
    it("ignores non-literal unions for now", () => {
        expect((0, ts_to_json_schema_mapper_1.mapType)("string | number", [])).toEqual({ type: "object" });
    });
    it("handles boolean arrays", () => {
        expect((0, ts_to_json_schema_mapper_1.mapType)("boolean[]", [])).toEqual({
            type: "array",
            items: { type: "boolean" },
        });
    });
    it("maps union of literals", () => {
        expect((0, ts_to_json_schema_mapper_1.mapType)('"a" | "b" | "c"', [])).toEqual({
            enum: ["a", "b", "c"],
        });
    });
    it("maps known interface references to $ref", () => {
        const known = [
            { name: "User", properties: [] },
        ];
        expect((0, ts_to_json_schema_mapper_1.mapType)("User", known)).toEqual({ $ref: "#/definitions/User" });
    });
    it("falls back to object for unknown types", () => {
        expect((0, ts_to_json_schema_mapper_1.mapType)("CustomType", [])).toEqual({ type: "object" });
    });
});
describe("convertToJsonSchema", () => {
    it("converts a basic interface", () => {
        const parsed = {
            name: "Example",
            properties: [
                { name: "id", type: "string", optional: false },
                { name: "label", type: "string", optional: true },
            ],
        };
        const schema = (0, ts_to_json_schema_mapper_1.convertToJsonSchema)(parsed, []);
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
        const parsed = {
            name: "NoRequired",
            properties: [
                { name: "note", type: "string", optional: true },
            ],
        };
        const schema = (0, ts_to_json_schema_mapper_1.convertToJsonSchema)(parsed, []);
        expect(schema.required).toBeUndefined();
    });
    it("generates schema with multiple required fields", () => {
        const parsed = {
            name: "MultiField",
            properties: [
                { name: "id", type: "string", optional: false },
                { name: "count", type: "number", optional: false },
                { name: "optionalLabel", type: "string", optional: true },
            ],
        };
        const schema = (0, ts_to_json_schema_mapper_1.convertToJsonSchema)(parsed, []);
        expect(schema.required).toEqual(["id", "count"]);
        expect(schema.properties.optionalLabel).toEqual({ type: "string" });
    });
});
