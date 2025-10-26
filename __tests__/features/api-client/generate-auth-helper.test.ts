import fs from "fs/promises";
import path from "path";
import os from "os";
import { generateAuthHelperForApiFile } from "../../../src";

describe("generateAuthHelperForApiFile", () => {
    let tempDir: string;

    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "auth-helper-test-"));
    });

    afterEach(async () => {
        await fs.rm(tempDir, {recursive: true, force: true});
    });

    it("generates an API key helper with env and fallback", async () => {
        const baseName = "apiKey";
        await generateAuthHelperForApiFile(tempDir, baseName, "apikey", {
            apiKeyName: "X-API-KEY",
            apiKeyValue: "hardcoded_key",
        });

        const outputFile = path.join(tempDir, baseName + ".authHelper.ts");
        const exists = await fs.stat(outputFile).then(() => true).catch(() => false);
        expect(exists).toBe(true);

        const content = await fs.readFile(outputFile, "utf-8");
        expect(content).toContain('process.env["APIKEY_APIKEY"]');
        expect(content).toContain("hardcoded_key");
        expect(content).toContain("X-API-KEY");
    });

    it("generates a Basic Auth helper with env and fallback", async () => {
        const baseName = "basicAuth";
        await generateAuthHelperForApiFile(tempDir, baseName, "basic", {
            username: "BASIC_AUTH_USER",
            password: "BASIC_AUTH_PASS",
        });

        const outputFile = path.join(tempDir, baseName + ".authHelper.ts");
        const exists = await fs.stat(outputFile).then(() => true).catch(() => false);
        expect(exists).toBe(true);

        const content = await fs.readFile(outputFile, "utf-8");
        expect(content).toContain('process.env["BASICAUTH_USERNAME"]');
        expect(content).toContain('process.env["BASICAUTH_PASSWORD"]');
    });

    it("generates empty helper for no auth", async () => {
        const baseName = "noAuth";
        await generateAuthHelperForApiFile(tempDir, baseName, "none");

        const outputFile = path.join(tempDir, baseName + ".authHelper.ts");
        const content = await fs.readFile(outputFile, "utf-8");
        expect(content).toContain("return {}");
    });

    it("handles missing credentials gracefully", async () => {
        const baseName = "missingCreds";
        await generateAuthHelperForApiFile(tempDir, baseName, "apikey",);

        const outputFile = path.join(tempDir, baseName + ".authHelper.ts");
        const content = await fs.readFile(outputFile, "utf-8");
        expect(content).toContain('process.env["MISSINGCREDS_APIKEY"]');
    });
});
