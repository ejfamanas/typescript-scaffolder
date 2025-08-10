import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
    generateWebhookAppRegistriesFromPath,
    generateWebhookAppRegistry
} from '../../../src';

/**
 * Helpers
 */
function writeFile(p: string, content: string) {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
}

function findRegistryFileRecursive(dir: string): string | null {
    if (!fs.existsSync(dir)) return null;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            const found = findRegistryFileRecursive(full);
            if (found) return found;
        } else if (/registry/i.test(entry.name) && entry.name.endsWith('.ts')) {
            return full;
        }
    }
    return null;
}

function findRegistryFile(serviceDir: string): string | null {
    const entries = fs.readdirSync(serviceDir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(serviceDir, entry.name);
        if (entry.isDirectory()) {
            const found = findRegistryFile(fullPath);
            if (found) return found;
        } else if (/registry/i.test(entry.name) && entry.name.endsWith('.ts')) {
            return fullPath;
        }
    }
    return null;
}

function read(p: string): string {
    return fs.readFileSync(p, 'utf8');
}

describe('generate-webhook-app-registry', () => {
    let tmpDir: string;
    let outRoot: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'app-registry-'));
        outRoot = path.join(tmpDir, 'out');
        fs.mkdirSync(outRoot, { recursive: true });
    });

    afterEach(() => {
        try {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {
            /* ignore */
        }
    });

    it('generates a registry including router + handlers when router exists', async () => {
        const svc = path.join(outRoot, 'source-omega');
        // fake handlers
        writeFile(
            path.join(svc, 'routes/handle_alpha.ts'),
            `export async function handleAlphaWebhook(){ return; }`
        );
        writeFile(
            path.join(svc, 'routes/handle_beta.ts'),
            `export async function handleBetaWebhook(){ return; }`
        );
        // fake router
        writeFile(
            path.join(svc, 'routes/router.ts'),
            `import express from 'express'; const router = express.Router(); export default router;`
        );

        await generateWebhookAppRegistriesFromPath(outRoot);

        const registryPath = findRegistryFile(svc);
        expect(registryPath).toBeTruthy();
        const txt = read(registryPath!);

        // Must import router and handlers
        expect(txt).toMatch(/from\s+['"].\/routes\/router['"]/);
        expect(txt).toMatch(/from\s+['"].\/routes\/handle_alpha['"]/);
        expect(txt).toMatch(/from\s+['"].\/routes\/handle_beta['"]/);

        // Must export a registry shape that mentions both router and handlers
        // We don't pin exact object shape — just assert presence
        expect(txt).toMatch(/router/);
        expect(txt).toMatch(/handlers/);
    });

    it('generates a registry without router when router.ts is missing', async () => {
        const svc = path.join(outRoot, 'source-theta');
        writeFile(
            path.join(svc, 'routes/handle_one.ts'),
            `export async function handleOneWebhook(){ return; }`
        );
        writeFile(
            path.join(svc, 'routes/handle_two.ts'),
            `export async function handleTwoWebhook(){ return; }`
        );

        await generateWebhookAppRegistriesFromPath(outRoot);

        const registryPath = findRegistryFile(svc);
        expect(registryPath).toBeTruthy();
        const txt = read(registryPath!);

        // Should import handlers but not router
        expect(txt).toMatch(/from\s+['"].\/routes\/handle_one['"]/);
        expect(txt).toMatch(/from\s+['"].\/routes\/handle_two['"]/);
        expect(txt).not.toMatch(/from\s+['"].\/routes\/router['"]/);

        // Export should still include handlers
        expect(txt).toMatch(/handlers/);
    });

    it('scans multiple services and writes a registry for each', async () => {
        const svcA = path.join(outRoot, 'source-alpha');
        const svcB = path.join(outRoot, 'source-beta');

        // Service A: handlers + router
        writeFile(
            path.join(svcA, 'routes/handle_foo.ts'),
            `export async function handleFooWebhook(){ return; }`
        );
        writeFile(
            path.join(svcA, 'routes/router.ts'),
            `export default {} as any;`
        );

        // Service B: only handlers
        writeFile(
            path.join(svcB, 'routes/handle_bar.ts'),
            `export async function handleBarWebhook(){ return; }`
        );

        await generateWebhookAppRegistriesFromPath(outRoot);

        const regA = findRegistryFile(svcA);
        const regB = findRegistryFile(svcB);
        expect(regA && regB).toBeTruthy();

        const aTxt = read(regA!);
        const bTxt = read(regB!);

        // Minimal assertions that each registry mentions its local handlers/router appropriately
        // A: namespace import + spread into handlers
        expect(aTxt).toMatch(/import\s+\*\s+as\s+handle_foo\s+from\s+['"].\/routes\/handle_foo['"]/);
        expect(aTxt).toMatch(/handlers:\s*\{\s*\.\.\.handle_foo/);

        // B: namespace import + spread into handlers
        expect(bTxt).toMatch(/import\s+\*\s+as\s+handle_bar\s+from\s+['"].\/routes\/handle_bar['"]/);
        expect(bTxt).toMatch(/handlers:\s*\{\s*\.\.\.handle_bar/);

        expect(bTxt).not.toMatch(/from\s+['"].\/routes\/router['"]/);
    });
});


describe('generateWebhookAppRegistry', () => {
    let tmpDir: string;
    let outRoot: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'app-registry-'));
        outRoot = path.join(tmpDir, 'out');
        fs.mkdirSync(outRoot, { recursive: true });
    });

    afterEach(() => {
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    });

    it('generates a registry including router + handlers when router exists', async () => {
        const serviceDir = path.join(outRoot, 'source-omega');
        const routesDir = path.join(serviceDir, 'routes');
        // fake handlers
        writeFile(path.join(routesDir, 'handle_alpha.ts'), `export async function handleAlphaWebhook(){ return; }`);
        writeFile(path.join(routesDir, 'handle_beta.ts'), `export async function handleBetaWebhook(){ return; }`);
        // fake router inside routes
        writeFile(path.join(routesDir, 'router.ts'), `import express from 'express'; const router = express.Router(); export default router;`);

        await generateWebhookAppRegistry(serviceDir);

        const registryPath = findRegistryFileRecursive(serviceDir);
        expect(registryPath).toBeTruthy();
        const txt = fs.readFileSync(registryPath!, 'utf8');

        // Should import router and handlers under ./routes/
        expect(txt).toMatch(/from\s+['"]\.\/routes\/router['"]/);
        expect(txt).toMatch(/from\s+['"]\.\/routes\/handle_alpha['"]/);
        expect(txt).toMatch(/from\s+['"]\.\/routes\/handle_beta['"]/);

        // Should spread handler namespaces into handlers object
        expect(txt).toMatch(/handlers:\s*\{[\s\S]*\.\.\.handle_alpha[\s\S]*\.\.\.handle_beta[\s\S]*\}/);

        // Mentions router in the exported registry shape
        expect(txt).toMatch(/router/);
    });

    it('generates a registry without router when router.ts is missing', async () => {
        const serviceDir = path.join(outRoot, 'source-theta');
        const routesDir = path.join(serviceDir, 'routes');
        writeFile(path.join(routesDir, 'handle_one.ts'), `export async function handleOneWebhook(){ return; }`);
        writeFile(path.join(routesDir, 'handle_two.ts'), `export async function handleTwoWebhook(){ return; }`);

        await generateWebhookAppRegistry(serviceDir);

        const registryPath = findRegistryFileRecursive(serviceDir);
        expect(registryPath).toBeTruthy();
        const txt = fs.readFileSync(registryPath!, 'utf8');

        // Should import handlers but not router
        expect(txt).toMatch(/from\s+['"]\.\/routes\/handle_one['"]/);
        expect(txt).toMatch(/from\s+['"]\.\/routes\/handle_two['"]/);
        expect(txt).not.toMatch(/from\s+['"]\.\/routes\/router['"]/);

        // Export should still include handlers spread
        expect(txt).toMatch(/handlers:\s*\{[\s\S]*\.\.\.handle_one[\s\S]*\}/);
    });

    it('does not write a registry when routes directory is missing', async () => {
        const serviceDir = path.join(outRoot, 'source-kappa');
        // do NOT create routes dir

        await generateWebhookAppRegistry(serviceDir);

        const registryPath = findRegistryFileRecursive(serviceDir);
        expect(registryPath).toBeNull();
    });
});