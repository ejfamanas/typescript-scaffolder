import { findDirectoryContainingAllSchemas } from "../../utils/client-constructors";
import { walkDirectory, ensureDir, readWebhookConfigFile, extractInterfaces } from "../../utils/file-system";
import { Logger } from "../../utils/logger";
import { BaseWebhook, WebhookConfigFile } from 'models/webhook-definitions';
import { IncomingWebhook } from 'models/webhook-definitions';
import { OutgoingWebhook } from 'models/webhook-definitions';
import { Project } from 'ts-morph';
import path from 'path';
import fs from 'fs';
import { toPascalCase } from "../../utils/object-helpers";
import { addClientRequiredImports } from "../../utils/client-constructors";

export async function generateIncomingWebhook(
    webhook: IncomingWebhook,
    interfaceInputDir: string,
    outputDir: string
): Promise<void> {
    const funcName = 'generateIncomingWebhook';
    const {name, requestSchema, handlerName} = webhook;

    Logger.debug(funcName, `Generating incoming webhook handler for "${name}"...`);

    const fileName = `handle_${handlerName}.ts`;
    const outputFilePath = path.join(outputDir, fileName);
    fs.mkdirSync(path.dirname(outputFilePath), {recursive: true});

    const project = new Project();
    const sourceFile = project.createSourceFile(outputFilePath, '', {overwrite: true});

    // Include axios, responseSchema to avoid manual editing later
    addClientRequiredImports(
        sourceFile,
        outputFilePath,
        interfaceInputDir,
        requestSchema,
        '',
        true,
        false
    );

    sourceFile.addFunction({
        name: `handle${toPascalCase(handlerName)}Webhook`,
        isExported: true,
        isAsync: true,
        parameters: [
            {
                name: 'payload',
                type: requestSchema,
            },
        ],
        returnType: 'Promise<void>',
        statements: [
            '// TODO: Implement webhook handler logic here',
            'console.log("Received webhook payload:", payload);',
        ],
    });

    await sourceFile.save();
}

export async function generateOutgoingWebhook(
    webhook: OutgoingWebhook,
    interfaceInputDir: string,
    outputDir: string
): Promise<void> {
    const funcName = 'generateOutgoingWebhook';
    const {name, requestSchema, responseSchema, targetUrl} = webhook;

    Logger.debug(funcName, `Generating outgoing webhook sender for "${name}"...`);

    const fileName = `send_${name}_webhook.ts`;
    const outputFilePath = path.join(outputDir, fileName);
    fs.mkdirSync(path.dirname(outputFilePath), {recursive: true});

    const project = new Project();
    const sourceFile = project.createSourceFile(outputFilePath, '', {overwrite: true});

    addClientRequiredImports(
        sourceFile,
        outputFilePath,
        interfaceInputDir,
        requestSchema,
        responseSchema || '',
        true,
    );

    sourceFile.addFunction({
        name: `send${toPascalCase(name)}Webhook`,
        isExported: true,
        isAsync: true,
        parameters: [
            {
                name: 'body',
                type: requestSchema,
            },
            {
                name: 'headers',
                type: 'Record<string, string>',
                hasQuestionToken: true,
            }
        ],
        returnType: `Promise<${responseSchema || 'any'}>`,
        statements: [
            `const response = await axios.post(\`${targetUrl}\`, body, { headers });`,
            'return response.data;',
        ],
    });

    await sourceFile.save();
}

export async function generateWebhooksFromFile(
    configPath: string,
    interfaceInputDir: string,
    outputDir: string
): Promise<void> {
    const funcName = 'generateWebhooksFromFile';
    Logger.debug(funcName, 'Starting webhook handler generation...');

    const config = readWebhookConfigFile(configPath);
    if (!config) {
        Logger.warn(funcName, `Skipping invalid config file at: ${configPath}`);
        return;
    }

    for (const webhook of config.webhooks) {
        if (webhook.direction === 'incoming') {
            await generateIncomingWebhook(webhook, interfaceInputDir, outputDir);
        } else if (webhook.direction === 'outgoing') {
            await generateOutgoingWebhook(webhook, interfaceInputDir, outputDir);
        } else {
            Logger.warn(funcName, `Skipping unknown webhook direction for: ${(webhook as BaseWebhook).name}`);
        }
    }
    Logger.debug(funcName, 'Finished generating all webhook handlers.');
}

/**
 * Generate webhook handlers/senders from all config files in a directory, mapping to interface directories.
 * @param configDir - Path to the webhook config file.
 * @param interfacesRootDir - Directory containing interface .ts files.
 * @param outputRootDir - Output directory for generated routes.
 */
export async function generateWebhooksFromPath(
    configDir: string,
    interfacesRootDir: string,
    outputRootDir: string
): Promise<void> {
    const funcName = 'generateWebhooksFromPath';
    Logger.debug(funcName, 'Starting webhook generation from config and interface directories...');

    const {configFiles, interfaceNameToDirs} = extractInterfaces(configDir, interfacesRootDir);

    for (const configPath of configFiles) {
        const config: WebhookConfigFile | null = readWebhookConfigFile(configPath);
        if (!config) {
            continue;
        }

        const requiredSchemas = new Set<string>();
        for (const webhook of config.webhooks) {
            requiredSchemas.add(webhook.requestSchema);
            if (webhook.direction === 'outgoing' && webhook.responseSchema) {
                requiredSchemas.add(webhook.responseSchema);
            }
        }

        const foundDir = findDirectoryContainingAllSchemas(requiredSchemas, interfaceNameToDirs, configPath, funcName);
        if (!foundDir) {
            Logger.warn(funcName, `Could not find a directory containing all schemas for config: ${configPath}`);
            continue;
        }

        const relativeInterfaceDir = path.relative(interfacesRootDir, foundDir);
        const outputDir = path.join(outputRootDir, relativeInterfaceDir);
        ensureDir(outputDir);

        await generateWebhooksFromFile(configPath, foundDir, outputDir);
    }

    Logger.info(funcName, 'Webhook generation completed.');
}