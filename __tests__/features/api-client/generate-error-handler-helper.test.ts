import * as path from "path";
import * as fs from "fs";
import { Logger } from "../../../src/utils/logger";
import { Method } from "../../../src";
import { generateErrorHandlerForApiFile } from "../../../src/features/api-client/generate-error-handler-helper";

describe("generateErrorHandlerForApiFile", () => {
    let tmpDir: string;
    const helperFile = (base: string) => path.join(tmpDir, `${base}.errorHandler.ts`);

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(__dirname, "tmp-"));
        jest.spyOn(Logger, "info").mockImplementation(() => {
        });
        jest.spyOn(Logger, "debug").mockImplementation(() => {
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
        fs.rmSync(tmpDir, {recursive: true, force: true});
    });

    it("does nothing when no endpoints are provided", () => {
        generateErrorHandlerForApiFile(tmpDir, "emptyClient", [], true);
        expect(fs.existsSync(helperFile("emptyClient"))).toBe(false);
    });

    it("ensures the directory exists and writes the helper file", () => {
        const metas = [
            {
                functionName: "GET_user",
                responseType: "User",
                responseModule: "./interfaces/User",
                endpoint: {
                    method: "GET" as Method,
                    path: "/users/:id",
                    headers: {},
                    objectName: "User",
                    responseSchema: "MY_SCHEMA"
                }
            }
        ];

        generateErrorHandlerForApiFile(tmpDir, "user_api", metas, true);
        const output = fs.readFileSync(helperFile("user_api"), "utf8");

        expect(output).toContain("function handleErrorsImpl");
        expect(output).toContain("export function handleErrors_GET_user");
    });

    it("includes shared error impl and adds type-only imports", () => {
        const metas = [
            {
                functionName: "GET_user",
                responseType: "User",
                responseModule: "./interfaces/User",
                endpoint: {
                    method: "GET" as Method,
                    path: "/users/:id",
                    headers: {},
                    objectName: "User",
                    responseSchema: "MY_SCHEMA"
                }
            }
        ];

        generateErrorHandlerForApiFile(tmpDir, "user_api", metas, true);
        const output = fs.readFileSync(helperFile("user_api"), "utf8");

        expect(output).toContain('import { AxiosResponse } from "axios"');
        expect(output).toContain('import { WrapRequestOptions } from "typescript-scaffolder"');
        expect(output).toContain('import { User } from "./interfaces/User"');
        expect(output).toContain("function handleErrorsImpl");
    });

    it("exports one typed wrapper per endpoint", () => {
        const metas = [
            {
                functionName: "GET_user",
                responseType: "User",
                responseModule: "./interfaces/User",
                endpoint: {
                    method: "GET" as Method,
                    path: "/users/:id",
                    headers: {},
                    objectName: "User",
                    responseSchema: "MY_SCHEMA"
                }
            },
            {
                functionName: "POST_user",
                responseType: "User",
                responseModule: "./interfaces/User",
                endpoint: {
                    method: "POST" as Method,
                    path: "/users",
                    headers: {},
                    objectName: "User",
                    responseSchema: "MY_SCHEMA"
                }
            }
        ];

        generateErrorHandlerForApiFile(tmpDir, "user_api", metas, true);
        const output = fs.readFileSync(helperFile("user_api"), "utf8");

        expect(output).toContain("export function handleErrors_GET_user");
        expect(output).toContain("export function handleErrors_POST_user");
    });

    it("honors overwrite flag", () => {
        const metas = [
            {
                functionName: "GET_user",
                responseType: "User",
                responseModule: "./interfaces/User",
                endpoint: {
                    method: "GET" as Method,
                    path: "/users/:id",
                    headers: {},
                    objectName: "User",
                    responseSchema: "MY_SCHEMA"
                }
            }
        ];

        // First write with default content
        generateErrorHandlerForApiFile(tmpDir, "user_api", metas, true);
        const original = fs.readFileSync(helperFile("user_api"), "utf8");

        // Modify file manually
        fs.writeFileSync(helperFile("user_api"), "// user edits this file");

        // Re-run with overwrite = false
        generateErrorHandlerForApiFile(tmpDir, "user_api", metas, false);
        const unchanged = fs.readFileSync(helperFile("user_api"), "utf8");

        expect(unchanged).toBe("// user edits this file");
        expect(unchanged).not.toBe(original);
    });

    it("is idempotent when run twice with same inputs", () => {
        const metas = [
            {
                functionName: "GET_user",
                responseType: "User",
                responseModule: "./interfaces/User",
                endpoint: {
                    method: "GET" as Method,
                    path: "/users/:id",
                    headers: {},
                    objectName: "User",
                    responseSchema: "MY_SCHEMA"
                }
            }
        ];

        generateErrorHandlerForApiFile(tmpDir, "user_api", metas, true);
        const first = fs.readFileSync(helperFile("user_api"), "utf8");

        generateErrorHandlerForApiFile(tmpDir, "user_api", metas, true);
        const second = fs.readFileSync(helperFile("user_api"), "utf8");

        expect(second).toBe(first);
    });
});