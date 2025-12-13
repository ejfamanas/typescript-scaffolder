import { promises as fs } from "fs";
import path from "path";
import { Logger } from "../../utils/logger";
import { renderAuthHelperContent } from "./strings/auth-helper-strings";

/**
 * Generates an authentication helper file for the specified API client.
 * Supports 'apikey', 'basic', and 'none' authentication types.
 *
 * @param outputDir - The directory where the auth helper file will be created.
 * @param fileBaseName - The base name of the API client file.
 * @param authType - The type of authentication ('apikey' | 'basic' | 'none').
 * @param credentials - Optional credentials needed for 'apikey' or 'basic' auth.
 */
export async function generateAuthHelperForApiFile(
    outputDir: string,
    fileBaseName: string,
    authType: "apikey" | "basic" | "none",
    credentials?: {
        username?: string;
        password?: string;
        apiKeyName?: string;
        apiKeyValue?: string;
    }
) {
    const funcName = "generateAuthHelperForApiFile"
    Logger.debug(funcName, `Generating auth helper for ${fileBaseName}`)

    const content = renderAuthHelperContent({
        fileBaseName,
        authType,
        credentials,
    });

    const filePath = path.join(outputDir, `${fileBaseName}.authHelper.ts`);
    await fs.writeFile(filePath, content, "utf-8");
    Logger.info(funcName, `Auth helper file generated at: ${filePath}`);
}
