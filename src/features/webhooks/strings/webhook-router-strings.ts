import type { SourceFile } from "ts-morph";

export function ensureDefaultImport(sourceFile: SourceFile, moduleSpecifier: string, defaultName: string): void {
    // Prefer a runtime import declaration (type-only imports should not be mutated to add runtime imports).
    const imp = sourceFile
        .getImportDeclarations()
        .find((d) => d.getModuleSpecifierValue() === moduleSpecifier && d.isTypeOnly() === false);

    // If we don't already have a runtime import for this module, create one.
    if (!imp) {
        sourceFile.addImportDeclaration({moduleSpecifier, defaultImport: defaultName});
        return;
    }
    if (!imp.getDefaultImport()) {
        imp.setDefaultImport(defaultName);
    }
}

export function ensureNamedImport(
    sourceFile: SourceFile,
    moduleSpecifier: string,
    name: string,
    isTypeOnly = false,
): void {
    const imp = sourceFile
        .getImportDeclarations()
        .find((d) => d.getModuleSpecifierValue() === moduleSpecifier && d.isTypeOnly() === isTypeOnly);

    // If we didn't find a matching import declaration of the same type-only-ness,
    // create a new one. This avoids mutating an existing runtime import into type-only,
    // or vice versa.
    if (!imp) {
        sourceFile.addImportDeclaration({moduleSpecifier, namedImports: [name], isTypeOnly});
        return;
    }

    const has = imp.getNamedImports().some((n) => n.getName() === name);
    if (!has) {
        imp.addNamedImport(name);
    }
}

export function hasText(sourceFile: SourceFile, snippet: string): boolean {
    return sourceFile.getFullText().includes(snippet);
}

export function renderTestHeadersArg(headers?: Record<string, string>): string {
    if (!headers || Object.keys(headers).length === 0) return '';
    const entries = Object.entries(headers).map(([k, v]) => {
        const envMatch = /^\$\{ENV:([A-Z0-9_]+)\}$/.exec(v);
        if (envMatch) {
            const envName = envMatch[1];
            return `${JSON.stringify(k)}: (process.env[${JSON.stringify(envName)}] ?? "")`;
        }
        return `${JSON.stringify(k)}: ${JSON.stringify(v)}`;
    });
    return `, { ${entries.join(', ')} }`;
}

export function renderWebhookPostRoute(args: {
    webhookPath: string;
    requestSchema: string;
    handlerFunctionName: string;
}): string {
    const {webhookPath, requestSchema, handlerFunctionName} = args;

    const lines = [
        `router.post('${webhookPath}', async (req, res) => {`,
        `  try {`,
        `    const payload = req.body as ${requestSchema};`,
        `    await ${handlerFunctionName}(payload);`,
        `    res.status(200).json({ ok: true });`,
        `  } catch (error) {`,
        `    console.error('Webhook error:', error);`,
        `    res.status(500).json({ ok: false });`,
        `  }`,
        `});`,
    ];

    return lines.join('\n');
}

export function renderWebhookTestRoute(args: {
    testPath: string;
    handlerFunctionName: string;
    fixtureExportName: string;
    testHeadersArg: string;
}): string {
    const {testPath, handlerFunctionName, fixtureExportName, testHeadersArg} = args;

    const lines = [
        `router.post('${testPath}', async (_req, res) => {`,
        `  try {`,
        `    await ${handlerFunctionName}(${fixtureExportName}${testHeadersArg});`,
        `    res.status(200).json({ ok: true, message: 'Simulated webhook sent.' });`,
        `  } catch (error) {`,
        `    console.error('Webhook test error:', error);`,
        `    res.status(500).json({ ok: false });`,
        `  }`,
        `});`,
    ];

    return lines.join('\n');
}