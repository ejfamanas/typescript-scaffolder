"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const interface_parser_1 = require("../../src/utils/interface-parser");
const ts_morph_1 = require("ts-morph");
describe("extractInterfacesFromFile", () => {
    const exampleFile = path_1.default.resolve(__dirname, "test-data", "example.ts");
    it("should extract interfaces with correct name and properties", () => {
        const interfaces = (0, interface_parser_1.extractInterfacesFromFile)(exampleFile);
        expect(interfaces).toHaveLength(1);
        const user = interfaces[0];
        expect(user.name).toBe("User");
        const expectedProps = ["id", "name", "email", "roles"];
        const actualProps = user.properties.map(p => p.name);
        expect(actualProps).toEqual(expect.arrayContaining(expectedProps));
    });
    it("should correctly identify optional properties", () => {
        const interfaces = (0, interface_parser_1.extractInterfacesFromFile)(exampleFile);
        const user = interfaces[0];
        const emailProp = user.properties.find(p => p.name === "email");
        expect(emailProp).toBeDefined();
        expect(emailProp.optional).toBe(true);
    });
    it("should capture JSDoc comments if present", () => {
        const interfaces = (0, interface_parser_1.extractInterfacesFromFile)(exampleFile);
        const user = interfaces[0];
        const idProp = user.properties.find(p => p.name === "id");
        expect(idProp?.jsDoc).toMatch(/user identifier/i);
    });
    it("should handle nested interfaces correctly", () => {
        const nestedExampleFile = path_1.default.resolve(__dirname, "test-data", "nested.ts");
        const interfaces = (0, interface_parser_1.extractInterfacesFromFile)(nestedExampleFile);
        const user = interfaces.find(i => i.name === "User");
        const address = interfaces.find(i => i.name === "Address");
        expect(user).toBeDefined();
        expect(address).toBeDefined();
        const addressProp = user.properties.find(p => p.name === "address");
        expect(addressProp?.type).toBe("Address");
    });
    it("should parse union and array types", () => {
        const unionExampleFile = path_1.default.resolve(__dirname, "test-data", "union-array.ts");
        const interfaces = (0, interface_parser_1.extractInterfacesFromFile)(unionExampleFile);
        const item = interfaces.find(i => i.name === "Item");
        expect(item).toBeDefined();
        const tagProp = item.properties.find(p => p.name === "tags");
        expect(tagProp?.type).toBe("array");
        expect(tagProp?.elementType).toBe("string");
        const statusProp = item.properties.find(p => p.name === "status");
        expect(statusProp?.type).toBe("union");
        expect(statusProp?.unionTypes).toEqual(["draft", "published", "archived"]);
    });
    it("should parse generic array types", () => {
        const genericArrayFile = path_1.default.resolve(__dirname, "test-data", "generic-arrays.ts");
        const interfaces = (0, interface_parser_1.extractInterfacesFromFile)(genericArrayFile);
        const entry = interfaces.find(i => i.name === "LogEntry");
        expect(entry).toBeDefined();
        const messagesProp = entry.properties.find(p => p.name === "messages");
        expect(messagesProp?.type).toBe("array");
        expect(messagesProp?.elementType).toBe("string");
        const timestampsProp = entry.properties.find(p => p.name === "timestamps");
        expect(timestampsProp?.type).toBe("array");
        expect(timestampsProp?.elementType).toBe("number");
    });
    it("should extract generic type parameters from interfaces", () => {
        const genericInterfaceFile = path_1.default.resolve(__dirname, "test-data", "generic-interface.ts");
        const interfaces = (0, interface_parser_1.extractInterfacesFromFile)(genericInterfaceFile);
        const response = interfaces.find(i => i.name === "ApiResponse");
        expect(response).toBeDefined();
        expect(response?.typeParameters).toEqual(["T"]);
        const dataProp = response.properties.find(p => p.name === "data");
        expect(dataProp?.type).toBe("T");
        const statusProp = response.properties.find(p => p.name === "status");
        expect(statusProp?.type).toBe("number");
    });
    it("should parse enums correctly", () => {
        const enumFile = path_1.default.resolve(__dirname, "test-data", "enum.ts");
        const interfaces = (0, interface_parser_1.extractInterfacesFromFile)(enumFile);
        const user = interfaces.find(i => i.name === "UserWithStatus");
        expect(user).toBeDefined();
        const statusProp = user.properties.find(p => p.name === "status");
        expect(statusProp?.type).toBe("enum");
        expect(statusProp?.enumValues).toEqual(["ACTIVE", "INACTIVE", "BANNED"]);
    });
});
describe("parseProperty", () => {
    const createProperty = (code) => {
        const project = new ts_morph_1.Project();
        const sourceFile = project.createSourceFile("temp.ts", code);
        const iface = sourceFile.getInterfaceOrThrow("Sample");
        return iface.getProperties()[0];
    };
    it("parses a simple string property", () => {
        const prop = createProperty(`interface Sample { name: string }`);
        const result = (0, interface_parser_1.parseProperty)(prop);
        expect(result).toMatchObject({
            name: "name",
            type: "string",
            optional: false,
        });
    });
    it("parses an optional number property with jsDoc", () => {
        const prop = createProperty(`
      interface Sample {
        /** user age */
        age?: number;
      }
    `);
        const result = (0, interface_parser_1.parseProperty)(prop);
        expect(result.name).toBe("age");
        expect(result.type).toBe("number");
        expect(result.optional).toBe(true);
        expect(result.jsDoc).toMatch(/user age/);
    });
    it("parses an array of strings", () => {
        const prop = createProperty(`interface Sample { tags: string[] }`);
        const result = (0, interface_parser_1.parseProperty)(prop);
        expect(result.type).toBe("array");
        expect(result.elementType).toBe("string");
    });
    it("parses a union of string literals", () => {
        const prop = createProperty(`interface Sample { status: "draft" | "published" | "archived" }`);
        const result = (0, interface_parser_1.parseProperty)(prop);
        expect(result.type).toBe("union");
        expect(result.unionTypes).toEqual(["draft", "published", "archived"]);
    });
    it("parses a reference to an enum", () => {
        const prop = createProperty(`
      enum Status {
        ACTIVE = "ACTIVE",
        INACTIVE = "INACTIVE",
        BANNED = "BANNED"
      }
      interface Sample {
        status: Status;
      }
    `);
        const result = (0, interface_parser_1.parseProperty)(prop);
        expect(result.type).toBe("enum");
        expect(result.enumValues).toEqual(["ACTIVE", "INACTIVE", "BANNED"]);
    });
    it("parses generic Array<string>", () => {
        const prop = createProperty(`interface Sample { values: Array<string> }`);
        const result = (0, interface_parser_1.parseProperty)(prop);
        expect(result.type).toBe("array");
        expect(result.elementType).toBe("string");
    });
    it("parses generic ReadonlyArray<number>", () => {
        const prop = createProperty(`interface Sample { nums: ReadonlyArray<number> }`);
        const result = (0, interface_parser_1.parseProperty)(prop);
        expect(result.type).toBe("array");
        expect(result.elementType).toBe("number");
    });
    it("parses generic Array of object type", () => {
        const prop = createProperty(`interface Sample { items: Array<{ id: number }> }`);
        const result = (0, interface_parser_1.parseProperty)(prop);
        expect(result.type).toBe("array");
        expect(result.elementType).toMatch(/^{ id: number; }$/);
    });
    it("should merge properties from extended interfaces", () => {
        const inheritedFile = path_1.default.resolve(__dirname, "test-data", "inherited.ts");
        const interfaces = (0, interface_parser_1.extractInterfacesFromFile)(inheritedFile);
        const employee = interfaces.find(i => i.name === "Employee");
        expect(employee).toBeDefined();
        const propNames = employee.properties.map(p => p.name);
        expect(propNames).toEqual(expect.arrayContaining(["id", "name", "position"]));
    });
    it("parses array of custom types", () => {
        const prop = createProperty(`interface Sample { items: CustomType[] }`);
        const result = (0, interface_parser_1.parseProperty)(prop);
        expect(result.type).toBe("array");
        expect(result.elementType).toBe("CustomType");
    });
    it("parses array of unknown/complex nested types", () => {
        const prop = createProperty(`interface Sample { entries: Array<Record<string, number>> }`);
        const result = (0, interface_parser_1.parseProperty)(prop);
        expect(result.type).toBe("array");
        expect(result.elementType).toContain("Record<string, number>");
    });
});
