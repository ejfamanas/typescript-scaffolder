import * as path from "path";
import { extractInterfacesFromFile, parseProperty } from "../../src/utils/interface-parser";
import * as fs from "fs";
import * as os from "os";
import { Project, PropertySignature } from "ts-morph";
import { ParsedInterface } from "../../src";

describe("extractInterfacesFromFile", () => {
    const exampleFile = path.resolve(__dirname, "test-data", "example.ts");

    it("should extract interfaces with correct name and properties", () => {
        const interfaces: ParsedInterface[] = extractInterfacesFromFile(exampleFile);

        expect(interfaces).toHaveLength(1);
        const user = interfaces[0];
        expect(user.name).toBe("User");

        const expectedProps = ["id", "name", "email", "roles"];
        const actualProps = user.properties.map(p => p.name);
        expect(actualProps).toEqual(expect.arrayContaining(expectedProps));
    });

    it("should correctly identify optional properties", () => {
        const interfaces = extractInterfacesFromFile(exampleFile);
        const user = interfaces[0];

        const emailProp = user.properties.find(p => p.name === "email");
        expect(emailProp).toBeDefined();
        expect(emailProp!.optional).toBe(true);
    });

    it("should capture JSDoc comments if present", () => {
        const interfaces = extractInterfacesFromFile(exampleFile);
        const user = interfaces[0];

        const idProp = user.properties.find(p => p.name === "id");
        expect(idProp?.jsDoc).toMatch(/user identifier/i);
    });

    it("should handle nested interfaces correctly", () => {
        const nestedExampleFile = path.resolve(__dirname, "test-data", "nested.ts");
        const interfaces = extractInterfacesFromFile(nestedExampleFile);

        const user = interfaces.find(i => i.name === "User");
        const address = interfaces.find(i => i.name === "Address");

        expect(user).toBeDefined();
        expect(address).toBeDefined();

        const addressProp = user!.properties.find(p => p.name === "address");
        expect(addressProp?.type).toBe("Address");
    });

    it("should parse union and array types", () => {
        const unionExampleFile = path.resolve(__dirname, "test-data", "union-array.ts");
        const interfaces = extractInterfacesFromFile(unionExampleFile);

        const item = interfaces.find(i => i.name === "Item");
        expect(item).toBeDefined();

        const tagProp = item!.properties.find(p => p.name === "tags");
        expect(tagProp?.type).toBe("array");
        expect(tagProp?.elementType).toBe("string");

        const statusProp = item!.properties.find(p => p.name === "status");
        expect(statusProp?.type).toBe("union");
        expect(statusProp?.unionTypes).toEqual(["draft", "published", "archived"]);
    });
    it("should parse generic array types", () => {
        const genericArrayFile = path.resolve(__dirname, "test-data", "generic-arrays.ts");
        const interfaces = extractInterfacesFromFile(genericArrayFile);

        const entry = interfaces.find(i => i.name === "LogEntry");
        expect(entry).toBeDefined();

        const messagesProp = entry!.properties.find(p => p.name === "messages");
        expect(messagesProp?.type).toBe("array");
        expect(messagesProp?.elementType).toBe("string");

        const timestampsProp = entry!.properties.find(p => p.name === "timestamps");
        expect(timestampsProp?.type).toBe("array");
        expect(timestampsProp?.elementType).toBe("number");
    });

    it("should extract generic type parameters from interfaces", () => {
        const genericInterfaceFile = path.resolve(__dirname, "test-data", "generic-interface.ts");
        const interfaces = extractInterfacesFromFile(genericInterfaceFile);

        const response = interfaces.find(i => i.name === "ApiResponse");
        expect(response).toBeDefined();
        expect(response?.typeParameters).toEqual(["T"]);

        const dataProp = response!.properties.find(p => p.name === "data");
        expect(dataProp?.type).toBe("T");

        const statusProp = response!.properties.find(p => p.name === "status");
        expect(statusProp?.type).toBe("number");
    });

    it("should parse enums correctly", () => {
        const enumFile = path.resolve(__dirname, "test-data", "enum.ts");
        const interfaces = extractInterfacesFromFile(enumFile);

        const user = interfaces.find(i => i.name === "UserWithStatus");
        expect(user).toBeDefined();

        const statusProp = user!.properties.find(p => p.name === "status");
        expect(statusProp?.type).toBe("enum");
        expect(statusProp?.enumValues).toEqual(["ACTIVE", "INACTIVE", "BANNED"]);
    });
});

describe("parseProperty", () => {
    const createProperty = (code: string): PropertySignature => {
        const project = new Project();
        const sourceFile = project.createSourceFile("temp.ts", code);
        const iface = sourceFile.getInterfaceOrThrow("Sample");
        return iface.getProperties()[0];
    };

    it("parses a simple string property", () => {
        const prop = createProperty(`interface Sample { name: string }`);
        const result = parseProperty(prop);
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
        const result = parseProperty(prop);
        expect(result.name).toBe("age");
        expect(result.type).toBe("number");
        expect(result.optional).toBe(true);
        expect(result.jsDoc).toMatch(/user age/);
    });

    it("parses an array of strings", () => {
        const prop = createProperty(`interface Sample { tags: string[] }`);
        const result = parseProperty(prop);
        expect(result.type).toBe("array");
        expect(result.elementType).toBe("string");
    });

    it("parses a union of string literals", () => {
        const prop = createProperty(`interface Sample { status: "draft" | "published" | "archived" }`);
        const result = parseProperty(prop);
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
        const result = parseProperty(prop);
        expect(result.type).toBe("enum");
        expect(result.enumValues).toEqual(["ACTIVE", "INACTIVE", "BANNED"]);
    });

    it("parses generic Array<string>", () => {
        const prop = createProperty(`interface Sample { values: Array<string> }`);
        const result = parseProperty(prop);
        expect(result.type).toBe("array");
        expect(result.elementType).toBe("string");
    });

    it("parses generic ReadonlyArray<number>", () => {
        const prop = createProperty(`interface Sample { nums: ReadonlyArray<number> }`);
        const result = parseProperty(prop);
        expect(result.type).toBe("array");
        expect(result.elementType).toBe("number");
    });

    it("parses generic Array of object type", () => {
        const prop = createProperty(`interface Sample { items: Array<{ id: number }> }`);
        const result = parseProperty(prop);
        expect(result.type).toBe("array");
        expect(result.elementType).toMatch(/^{ id: number; }$/);
    });

    it("should merge properties from extended interfaces", () => {
        const inheritedFile = path.resolve(__dirname, "test-data", "inherited.ts");
        const interfaces = extractInterfacesFromFile(inheritedFile);

        const employee = interfaces.find(i => i.name === "Employee");
        expect(employee).toBeDefined();

        const propNames = employee!.properties.map(p => p.name);
        expect(propNames).toEqual(expect.arrayContaining(["id", "name", "position"]));
    });

    it("parses array of custom types", () => {
        const prop = createProperty(`interface Sample { items: CustomType[] }`);
        const result = parseProperty(prop);
        expect(result.type).toBe("array");
        expect(result.elementType).toBe("CustomType");
    });

    it("parses array of unknown/complex nested types", () => {
        const prop = createProperty(`interface Sample { entries: Array<Record<string, number>> }`);
        const result = parseProperty(prop);
        expect(result.type).toBe("array");
        expect(result.elementType).toContain("Record<string, number>");
    });
});

// Additional edge-case coverage for interface-parser
describe("interface-parser edge cases", () => {
  const mkTmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "iface-edges-"));
  const writeTempFile = (dir: string, filename: string, content: string) => {
    const p = path.join(dir, filename);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
    return p;
  };

  it("returns empty array when file has no interfaces", () => {
    const dir = mkTmpDir();
    const file = writeTempFile(dir, "no-interfaces.ts", `const x = 1; type T = string;`);
    const result = extractInterfacesFromFile(file);
    expect(result).toHaveLength(0);
  });

  it("handles an empty interface with zero properties", () => {
    const dir = mkTmpDir();
    const file = writeTempFile(dir, "empty.ts", `export interface Empty {}`);
    const result = extractInterfacesFromFile(file);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Empty");
    expect(result[0].properties).toHaveLength(0);
  });

  // Local helper (separate from the one in the earlier describe) so these tests are self-contained
  const createProperty2 = (code: string): PropertySignature => {
    const project = new Project();
    const sourceFile = project.createSourceFile("tmp-edge.ts", code);
    const iface = sourceFile.getInterfaceOrThrow("Sample");
    return iface.getProperties()[0];
  };

  it("parses array of union: (string | number)[]", () => {
    const prop = createProperty2(`interface Sample { vals: (string | number)[] }`);
    const result = parseProperty(prop);
    expect(result.type).toBe("array");
    // element type may be rendered as a union string; be tolerant
    expect(String(result.elementType)).toMatch(/string/);
    expect(String(result.elementType)).toMatch(/number/);
  });

  it("parses union of arrays: string[] | number[]", () => {
    const prop = createProperty2(`interface Sample { v: string[] | number[] }`);
    const result = parseProperty(prop);
    // Implementation detail: parser may represent this as a structured union OR as a stringified union type
    if (result.type === "union") {
      expect(Array.isArray(result.unionTypes)).toBe(true);
      expect(result.unionTypes!.length).toBe(2);
      // Be tolerant about exact values (e.g., "string[]" vs "Array<string>")
      const joined = result.unionTypes!.join(" | ");
      expect(joined).toMatch(/string\[\]|Array<\s*string\s*>/);
      expect(joined).toMatch(/number\[\]|Array<\s*number\s*>/);
    } else {
      // Stringified union fallback
      expect(String(result.type).replace(/\s+/g, " ")).toBe("string[] | number[]");
    }
  });

  it("handles complex Record types without crashing", () => {
    const prop = createProperty2(`interface Sample { map: Record<string, unknown> }`);
    const result = parseProperty(prop);
    // We don't enforce a specific string; just ensure it didn't get misclassified as array/union/primitive
    expect(["array", "union", "string", "number", "boolean"]).not.toContain(result.type);
    expect(typeof result.type).toBe("string");
  });

    it("sets jsDoc to undefined or empty string when absent", () => {
        const prop = createProperty2(`interface Sample { value: string }`);
        const result = parseProperty(prop);
        expect(result.jsDoc ?? "").toBe("");
    });
});