import {
    generateJsonSchemaFromFile,
    generateJsonSchemaFromInterface,
    generateJsonSchemasFromPath
} from "../../src";
import * as parser from "../../src/utils/interface-parser";
import * as mapper from "../../src/utils/ts-to-json-schema-mapper";
import * as fsUtils from "../../src/utils/file-system";
import * as fs from "fs";
import * as path from "path";
import { ParsedInterface } from "../../src";



jest.mock("fs");
jest.mock("../../src/utils/logger", () => ({
    Logger: {
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));
jest.mock("../../src/utils/file-system");

const mockedGenerateJsonSchemaFromFile = generateJsonSchemaFromFile as jest.MockedFunction<typeof generateJsonSchemaFromFile>;
const mockedWalkDirectory = fsUtils.walkDirectory as jest.MockedFunction<typeof fsUtils.walkDirectory>;

describe("generateJsonSchemaFromInterface", () => {
    it("returns empty object if no interfaces are provided", () => {
        const result = generateJsonSchemaFromInterface([]);
        expect(result).toEqual({});
    });

    it("generates schema with definitions for multiple interfaces", () => {
        const interfaces: ParsedInterface[] = [
            {name: "A", properties: [{name: "id", type: "string", optional: false}]},
            {name: "B", properties: [{name: "ref", type: "A", optional: false}]},
        ];

        // TODO: This is erroring in the IDE even though the function call is correct based on the signature
        // @ts-ignore
        jest.spyOn(mapper, "convertToJsonSchema").mockImplementation((iface: ParsedInterface) => ({
            title: iface.name,
            type: "object",
            properties: {},
            definitions: {},
        }));

        const result = generateJsonSchemaFromInterface(interfaces);
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
    const mockInterfaces: ParsedInterface[] = [
        {name: "Test", properties: [{name: "value", type: "number", optional: false}]},
    ];
    const mockSchema = {title: "Test", type: "object", properties: {value: {type: "number"}}};

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

        await generateJsonSchemaFromFile(filePath, relativePath, outputDir);

        const outPath = path.join(outputDir, "test.schema.json");
        expect(fs.writeFileSync).toHaveBeenCalledWith(
            outPath,
            JSON.stringify(mockSchema, null, 2),
            "utf-8"
        );
    });

    it("logs a warning if schema is null", async () => {
        // TODO: This is erroring in the IDE even though the function call is correct based on the signature
        // @ts-ignore
        jest.spyOn(parser, "extractInterfacesFromFile").mockReturnValue(mockInterfaces);
        // TODO: This is erroring in the IDE even though the function call is correct based on the signature
        // @ts-ignore
        jest.spyOn(mapper, "convertToJsonSchema").mockReturnValue(null as any);

        const filePath = "src/models/test.ts";
        const relativePath = "test.ts";
        const outputDir = "dist/schemas";

        await generateJsonSchemaFromFile(filePath, relativePath, outputDir);

        expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it("throws an error if something goes wrong", async () => {
        // TODO: This is erroring in the IDE even though the function call is correct based on the signature
        // @ts-ignore
        jest.spyOn(parser, "extractInterfacesFromFile").mockImplementation(() => {
            throw new Error("parse failure");
        });

        await expect(
            generateJsonSchemaFromFile("bad.ts", "bad.ts", "out")
        ).rejects.toThrow("Critical error when trying to process bad.ts, Error: parse failure");
    });
});

describe("generateJsonSchemasFromPath", () => {
    it('should call walkDirectory with a callback', () => {
        const fakeSchemaDir = '/schemas';
        const fakeOutputDir = '/output';

        generateJsonSchemasFromPath(fakeSchemaDir, fakeOutputDir);

        expect(mockedWalkDirectory).toHaveBeenCalledWith(
            fakeSchemaDir,
            expect.any(Function),
            '.ts'
        );
    });
});