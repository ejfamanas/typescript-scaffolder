"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const src_1 = require("../../src");
const parser = __importStar(require("../../src/utils/interface-parser"));
const mapper = __importStar(require("../../src/utils/ts-to-json-schema-mapper"));
const fsUtils = __importStar(require("../../src/utils/file-system"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
jest.mock("fs");
jest.mock("../../src/utils/logger", () => ({
    Logger: {
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));
jest.mock("../../src/utils/file-system");
const mockedGenerateJsonSchemaFromFile = src_1.generateJsonSchemaFromFile;
const mockedWalkDirectory = fsUtils.walkDirectory;
describe("generateJsonSchemaFromInterface", () => {
    it("returns empty object if no interfaces are provided", () => {
        const result = (0, src_1.generateJsonSchemaFromInterface)([]);
        expect(result).toEqual({});
    });
    it("generates schema with definitions for multiple interfaces", () => {
        const interfaces = [
            { name: "A", properties: [{ name: "id", type: "string", optional: false }] },
            { name: "B", properties: [{ name: "ref", type: "A", optional: false }] },
        ];
        // TODO: This is erroring in the IDE even though the function call is correct based on the signature
        // @ts-ignore
        jest.spyOn(mapper, "convertToJsonSchema").mockImplementation((iface) => ({
            title: iface.name,
            type: "object",
            properties: {},
            definitions: {},
        }));
        const result = (0, src_1.generateJsonSchemaFromInterface)(interfaces);
        expect(result).toEqual({
            title: "A",
            type: "object",
            properties: {},
            definitions: {
                B: {
                    title: "B",
                    type: "object",
                    properties: {},
                    definitions: {},
                },
            },
        });
    });
});
describe("generateJsonSchemaFromFile", () => {
    const mockInterfaces = [
        { name: "Test", properties: [{ name: "value", type: "number", optional: false }] },
    ];
    const mockSchema = { title: "Test", type: "object", properties: { value: { type: "number" } } };
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it("writes JSON schema to file", async () => {
        // TODO: This is erroring in the IDE even though the function call is correct based on the signature
        // @ts-ignore
        jest.spyOn(parser, "extractInterfacesFromFile").mockReturnValue(mockInterfaces);
        // TODO: This is erroring in the IDE even though the function call is correct based on the signature
        // @ts-ignore
        jest.spyOn(mapper, "convertToJsonSchema").mockReturnValue(mockSchema);
        const filePath = "src/models/test.ts";
        const relativePath = "test.ts";
        const outputDir = "dist/schemas";
        await (0, src_1.generateJsonSchemaFromFile)(filePath, relativePath, outputDir);
        const outPath = path_1.default.join(outputDir, "test.schema.json");
        expect(fs_1.default.writeFileSync).toHaveBeenCalledWith(outPath, JSON.stringify(mockSchema, null, 2), "utf-8");
    });
    it("logs a warning if schema is null", async () => {
        // TODO: This is erroring in the IDE even though the function call is correct based on the signature
        // @ts-ignore
        jest.spyOn(parser, "extractInterfacesFromFile").mockReturnValue(mockInterfaces);
        // TODO: This is erroring in the IDE even though the function call is correct based on the signature
        // @ts-ignore
        jest.spyOn(mapper, "convertToJsonSchema").mockReturnValue(null);
        const filePath = "src/models/test.ts";
        const relativePath = "test.ts";
        const outputDir = "dist/schemas";
        await (0, src_1.generateJsonSchemaFromFile)(filePath, relativePath, outputDir);
        expect(fs_1.default.writeFileSync).not.toHaveBeenCalled();
    });
    it("throws an error if something goes wrong", async () => {
        // TODO: This is erroring in the IDE even though the function call is correct based on the signature
        // @ts-ignore
        jest.spyOn(parser, "extractInterfacesFromFile").mockImplementation(() => {
            throw new Error("parse failure");
        });
        await expect((0, src_1.generateJsonSchemaFromFile)("bad.ts", "bad.ts", "out")).rejects.toThrow("Critical error when trying to process bad.ts, Error: parse failure");
    });
});
describe("generateJsonSchemasFromPath", () => {
    it('should call walkDirectory with a callback', () => {
        const fakeSchemaDir = '/schemas';
        const fakeOutputDir = '/output';
        (0, src_1.generateJsonSchemasFromPath)(fakeSchemaDir, fakeOutputDir);
        expect(mockedWalkDirectory).toHaveBeenCalledWith(fakeSchemaDir, expect.any(Function), '.ts');
    });
});
