import * as path from 'path';
import { Project } from 'ts-morph';
import { ensureDir, extractInterfaces, readWebhookConfigFile } from '../../utils/file-system';
import { IncomingWebhook, WebhookConfigFile } from "models/webhook-definitions";
import { toPascalCase } from "../../utils/object-helpers";
import {
    assertDirectoryContainingAllSchemas,
} from "../../utils/client-constructors";
import { Logger } from "../../utils/logger";
import { generateWebhookFixture } from './generate-webhook-fixture';

/**
 * Generates an Express router file for a single incoming webhook.
 *
 * @param webhook - The webhook definition to generate a route for.
 * @param interfaceInputDir - Root path for interface .ts files.
 * @param outputDir - Base output directory (e.g., src/codegen/routes/webhooks).
 */
export async function generateWebhookRoute(
    webhook: IncomingWebhook,
    interfaceInputDir: string,
    outputDir: string,
    fixtureName?: string
): Promise<void> {
    const {handlerName, path: webhookPath, requestSchema} = webhook;
    const funcName = `generateWebhookRoute`;
	Logger.debug(funcName, 'Starting webhook route generation...');

    const pascalHandlerName = toPascalCase(handlerName);
    const routeFile = path.join(outputDir, 'router.ts');
    ensureDir(outputDir);

    const interfaceImportPath = path.relative(outputDir, path.join(interfaceInputDir, requestSchema)).replace(/\\/g, '/');
    // Handler files are now generated in the same routes/ directory, so use a relative local import.
    const handlerImportPath = `./handle_${handlerName}`;
    const serviceName = path.basename(interfaceInputDir);
    const fixtureExportName = `mock${toPascalCase(requestSchema)}`;

    const project = new Project();
    const existing = project.addSourceFileAtPathIfExists(routeFile);
    const sourceFile = existing ?? project.createSourceFile(routeFile, '', { overwrite: true });

    // --- Helper functions for idempotency ---
    const ensureDefaultImport = (moduleSpecifier: string, defaultName: string) => {
      const imp = sourceFile.getImportDeclarations().find(d => d.getModuleSpecifierValue() === moduleSpecifier);
      if (!imp) { sourceFile.addImportDeclaration({ moduleSpecifier, defaultImport: defaultName }); return; }
      if (!imp.getDefaultImport()) { imp.setDefaultImport(defaultName); }
    };

    const ensureNamedImport = (moduleSpecifier: string, name: string, isTypeOnly = false) => {
      const imp = sourceFile.getImportDeclarations().find(d => d.getModuleSpecifierValue() === moduleSpecifier);
      if (!imp) { sourceFile.addImportDeclaration({ moduleSpecifier, namedImports: [name], isTypeOnly }); return; }
      const has = imp.getNamedImports().some(n => n.getName() === name);
      if (!has) { imp.addNamedImport(name); }
      if (isTypeOnly && !imp.isTypeOnly()) imp.setIsTypeOnly(true);
    };

    const hasText = (snippet: string) => sourceFile.getFullText().includes(snippet);

    const renderTestHeadersArg = (headers?: Record<string, string>): string => {
      if (!headers || Object.keys(headers).length === 0) return '';
      const entries = Object.entries(headers).map(([k, v]) => {
        const envMatch = /^\$\{ENV:([A-Z0-9_]+)\}$/.exec(v);
        if (envMatch) {
          const envName = envMatch[1];
          return `'${k}': (process.env.${envName} ?? '')`;
        }
        return `'${k}': ${JSON.stringify(v)}`;
      });
      return `, { ${entries.join(', ')} }`;
    };

    // --- Idempotent imports ---
    ensureDefaultImport('express', 'express');
    ensureNamedImport(interfaceImportPath.startsWith('.') ? interfaceImportPath : `./${interfaceImportPath}`, requestSchema, true);
    ensureNamedImport(handlerImportPath.startsWith('.') ? handlerImportPath : `./${handlerImportPath}`, `handle${pascalHandlerName}Webhook`);
    ensureNamedImport(`./${requestSchema}.fixture`, fixtureExportName);

    // --- Router bootstrap only once ---
    if (!hasText('const router = express.Router()')) {
      sourceFile.addStatements([
        'const router = express.Router();',
        'router.use(express.json());'
      ]);
    }

    // --- Main webhook route only once ---
    if (!hasText(`router.post('${webhookPath}'`)) {
      sourceFile.addStatements([
        `router.post('${webhookPath}', async (req, res) => {
	try {
		const payload = req.body as ${requestSchema};
		await handle${pascalHandlerName}Webhook(payload);
		res.status(200).json({ ok: true });
	} catch (error) {
		console.error('Webhook error:', error);
		res.status(500).json({ ok: false });
	}
});`
      ]);
    }

    const testHeadersArg = renderTestHeadersArg((webhook as any).testHeaders);

    // --- Test route only once ---
    const testPath = `/test/${serviceName}-${handlerName}-webhook`;
    if (!hasText(`router.post('${testPath}'`)) {
      sourceFile.addStatements([
        `router.post('${testPath}', async (_req, res) => {
	try {
		await handle${pascalHandlerName}Webhook(${fixtureExportName}${testHeadersArg});
		res.status(200).json({ ok: true, message: 'Simulated webhook sent.' });
	} catch (error) {
		console.error('Webhook test error:', error);
		res.status(500).json({ ok: false });
	}
});`
      ]);
    }

    generateWebhookFixture(
        requestSchema,
        interfaceImportPath,
        outputDir,
        project,
        fixtureName ?? fixtureExportName
    );

    // --- Default export only once ---
    if (!hasText('export default router')) {
      sourceFile.addStatements(['export default router;']);
    }
    Logger.debug(funcName, 'Webhook route generation complete')
    await project.save();
}
/**
 * Reads a WebhookConfigFile and generates Express routes for each incoming webhook.
 *
 * @param configPath - Path to the webhook config file.
 * @param interfaceInputDir - Directory containing interface .ts files.
 * @param outputDir - Output directory for generated routes.
 */
export async function generateWebhookRoutesFromFile(
    configPath: string,
    interfaceInputDir: string,
    outputDir: string
): Promise<void> {
    const config = readWebhookConfigFile(configPath);
    if (!config) return;

    for (const webhook of config.webhooks) {
        if (webhook.direction !== 'incoming') continue;
        await generateWebhookRoute(webhook, interfaceInputDir, outputDir);
    }
}


/**
 * Generate Express webhook route files from all config files in a directory.
 * @param configDir - Path to the webhook config file.
 * @param interfacesRootDir - Directory containing interface .ts files.
 * @param outputRootDir - Output directory for generated routes.
 */
export async function generateWebhookRoutesFromPath(
	configDir: string,
	interfacesRootDir: string,
	outputRootDir: string
): Promise<void> {
	const funcName = 'generateWebhookRoutesFromPath';
	Logger.debug(funcName, 'Starting webhook route generation from config and interface directories...');

	const { configFiles, interfaceNameToDirs } = extractInterfaces(configDir, interfacesRootDir);

	for (const configPath of configFiles) {
		const config: WebhookConfigFile | null = readWebhookConfigFile(configPath);
		if (!config) {
			continue;
		}

		const requiredSchemas = new Set<string>();
		for (const webhook of config.webhooks) {
			if (webhook.direction === 'incoming') {
				requiredSchemas.add(webhook.requestSchema);
			}
		}

		const foundDir = assertDirectoryContainingAllSchemas(requiredSchemas, interfaceNameToDirs, configPath);
		if (!foundDir) {
			Logger.warn(funcName, `Could not find a directory containing all schemas for config: ${configPath}`);
			continue;
		}

		const relativeInterfaceDir = path.relative(interfacesRootDir, foundDir);
		const outputDir = path.join(outputRootDir, relativeInterfaceDir);
		ensureDir(outputDir);

		await generateWebhookRoutesFromFile(configPath, foundDir, outputDir);
	}

	Logger.info(funcName, 'Webhook route generation completed.');
}