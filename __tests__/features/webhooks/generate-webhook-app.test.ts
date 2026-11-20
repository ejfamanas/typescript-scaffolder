import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// If your barrel path differs, tweak this line.
import {
  generateWebhookApp,
  generateWebhookAppFromFile,
  generateWebhookAppFromPath,
} from '../../../src';

/** Helpers **/
function mkdirp(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function writeFile(p: string, content: string) {
  mkdirp(path.dirname(p));
  fs.writeFileSync(p, content);
}

function readIfExists(p: string): string | null {
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}

function findFileRecursive(root: string, predicate: (name: string) => boolean): string | null {
  if (!fs.existsSync(root)) return null;
  const entries = fs.readdirSync(root, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(root, e.name);
    if (e.isDirectory()) {
      const found = findFileRecursive(full, predicate);
      if (found) return found;
    } else if (predicate(e.name)) {
      return full;
    }
  }
  return null;
}

/**
 * Locates a generated app file by a permissive naming pattern. We don't lock to an exact filename
 * to keep tests resilient to small naming changes (e.g., create<Service>WebhookApp.ts vs service-app.ts)
 */
function findGeneratedAppFile(serviceOutDir: string): string | null {
  return findFileRecursive(serviceOutDir, (name) => /webhook.*app\.ts$/i.test(name) || /create.*webhook.*app\.ts$/i.test(name));
}

describe('generate-webhook-app', () => {
  let tmpDir: string;
  let outRoot: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'webhook-app-'));
    outRoot = path.join(tmpDir, 'out');
    mkdirp(outRoot);
  });

  afterEach(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it('generateWebhookApp creates an Express app file using an existing registry', async () => {
    const serviceDir = path.join(outRoot, 'source-omega');
    const routesDir = path.join(serviceDir, 'routes');

    // Minimal router + handlers so a registry makes sense
    writeFile(path.join(routesDir, 'router.ts'), `import express from 'express'; const router = express.Router(); export default router;`);
    writeFile(path.join(routesDir, 'handle_alpha.ts'), `export async function handleAlphaWebhook(){ return; }`);
    writeFile(path.join(routesDir, 'handle_beta.ts'), `export async function handleBetaWebhook(){ return; }`);

    // A minimal registry that resembles the generator's output
    const registryPath = path.join(serviceDir, 'webhookAppRegistry.ts');
    const existingRegistry = `import router from './routes/router';\nimport * as handle_alpha from './routes/handle_alpha';\nimport * as handle_beta from './routes/handle_beta';\n\nexport const webhookAppRegistry = {\n  'source-omega': { router, handlers: { ...handle_alpha, ...handle_beta } }\n};\n`;
    writeFile(registryPath, existingRegistry);

    await generateWebhookApp('source-omega',serviceDir);

    const appFile = findGeneratedAppFile(serviceDir);
    expect(appFile).toBeTruthy();
    const src = readIfExists(appFile!);
    expect(src).toBeTruthy();

    // Basic expectations: imports express, references the registry, and creates an app
    expect(src!).toMatch(/import\s+express\s+from\s+['"]express['"]/);
    expect(src!).toMatch(/webhookAppRegistry/);
    expect(src!).toMatch(/express\.Router\(|express\(\)/);
    expect(src!).toContain("webhookAppRegistry['source-omega']?.router");
    expect(src!).toContain('app.use(router);');
    expect(fs.readFileSync(registryPath, 'utf8')).toBe(existingRegistry);
  });

  it('generateWebhookAppFromFile uses the interface service name when the output folder has a different name', async () => {
    const interfacesRoot = path.join(tmpDir, 'interfaces');
    const serviceInterfaces = path.join(interfacesRoot, 'source-sigma');
    const outputRoot = outRoot;

    mkdirp(serviceInterfaces);

    // Minimal config file
    const configDir = path.join(tmpDir, 'configs');
    mkdirp(configDir);
    const configFile = path.join(configDir, 'source-sigma.json');
    writeFile(configFile, JSON.stringify({
      webhooks: [
        {
          direction: 'incoming',
          name: 'stripe_payment',
          path: '/webhooks/stripe',
          requestSchema: 'StripePaymentSucceededPayload',
          handlerName: 'handleStripePaymentWebhook'
        }
      ]
    }, null, 2));

    // Minimal interface so path resolution succeeds
    writeFile(
      path.join(serviceInterfaces, 'StripePaymentSucceededPayload.ts'),
      `export interface StripePaymentSucceededPayload { id: string }`
    );

    // NOTE: now pass configFile as first argument
    await generateWebhookAppFromFile(configFile, serviceInterfaces, outputRoot);

    const appFile = path.join(outputRoot, 'createSourceSigmaWebhookApp.ts');
    const src = readIfExists(appFile);
    expect(src).toBeTruthy();
    expect(src!).toMatch(/import\s+express\s+from\s+['"]express['"]/);
    expect(src!).toContain("webhookAppRegistry['source-sigma']?.router");
    expect(fs.readFileSync(path.join(outputRoot, 'webhookAppRegistry.ts'), 'utf8'))
      .toContain("'source-sigma':");
  });

  it('generateWebhookAppFromPath discovers multiple configs and generates apps per service', async () => {
    const configDir = path.join(tmpDir, 'configs');
    const interfacesRoot = path.join(tmpDir, 'interfaces');
    const outputRoot = outRoot;

    // Service A interfaces & config
    const svcAIfaces = path.join(interfacesRoot, 'source-alpha');
    mkdirp(svcAIfaces);
    writeFile(path.join(svcAIfaces, 'FooPayload.ts'), `export interface FooPayload { id: string }`);
    writeFile(
      path.join(configDir, 'alpha.json'),
      JSON.stringify(
        { webhooks: [{ direction: 'incoming', name: 'foo', path: '/foo', handlerName: 'handleFoo', requestSchema: 'FooPayload' }] },
        null,
        2
      )
    );

    // Service B interfaces & config
    const svcBIfaces = path.join(interfacesRoot, 'source-beta');
    mkdirp(svcBIfaces);
    writeFile(path.join(svcBIfaces, 'BarPayload.ts'), `export interface BarPayload { id: string }`);
    mkdirp(configDir);
    writeFile(
      path.join(configDir, 'beta.json'),
      JSON.stringify(
        { webhooks: [{ direction: 'incoming', name: 'bar', path: '/bar', handlerName: 'handleBar', requestSchema: 'BarPayload' }] },
        null,
        2
      )
    );

    await generateWebhookAppFromPath(configDir, interfacesRoot, outputRoot);

    const appA = findGeneratedAppFile(path.join(outputRoot, 'source-alpha'));
    const appB = findGeneratedAppFile(path.join(outputRoot, 'source-beta'));
    expect(appA && appB).toBeTruthy();

    const srcA = readIfExists(appA!);
    const srcB = readIfExists(appB!);
    expect(srcA!).toMatch(/import\s+express\s+from\s+['"]express['"]/);
    expect(srcB!).toMatch(/import\s+express\s+from\s+['"]express['"]/);
  });

  it('creates an empty registry for a standalone app without routes', async () => {
    const serviceDir = path.join(outRoot, 'custom-output');
    await generateWebhookApp('source-missing', serviceDir);

    const appFile = findGeneratedAppFile(serviceDir);
    expect(appFile).toBeTruthy();

    const src = readIfExists(appFile!);
    expect(src).toBeTruthy();

    // Minimal Express app is created
    expect(src!).toMatch(/import\s+express\s+from\s+['"]express['"]/);

    expect(src!).toMatch(/import\s*\{\s*webhookAppRegistry\s*\}\s*from\s*['"]\.\/webhookAppRegistry['"]/);
    expect(src!).toContain("webhookAppRegistry['source-missing']?.router");
    expect(src!).toContain('if (router)');
    expect(src!).not.toContain('app.post(');
    const registry = fs.readFileSync(path.join(serviceDir, 'webhookAppRegistry.ts'), 'utf8');
    expect(registry).toContain("'source-missing':");
    expect(registry).toContain('router: undefined,');
  });

  it('generates app when registry has router but no handlers', async () => {
    const serviceDir = path.join(outRoot, 'source-empty');
    const routesDir = path.join(serviceDir, 'routes');
    mkdirp(routesDir);

    // minimal router
    writeFile(
        path.join(routesDir, 'router.ts'),
        `import express from 'express'; const router = express.Router(); export default router;`
    );

    // registry with router only; no handlers prop
    writeFile(
        path.join(serviceDir, 'webhookAppRegistry.ts'),
        `import router from './routes/router';
       export const webhookAppRegistry = { 'source-empty': { router } };`
    );

    await generateWebhookApp('source-empty', serviceDir);

    const appFile = findGeneratedAppFile(serviceDir);
    expect(appFile).toBeTruthy();

    const src = readIfExists(appFile!);
    expect(src).toBeTruthy();

    // Should reference express and the registry
    expect(src!).toMatch(/import\s+express\s+from\s+['"]express['"]/);
    expect(src!).toMatch(/webhookAppRegistry/);

    // With no handlers, there should be no obvious attempt to mount handler endpoints in the app file.
    // (Router mounting is fine; handler-specific wiring should be absent.)

    // No handler module imports in the file
    expect(src!).not.toMatch(/from\s+['"]\.\/routes\/handle_/);

    expect(src!).toContain("webhookAppRegistry['source-empty']?.router");
    expect(src!).toContain('app.use(router);');
    expect(src!).not.toContain('app.post(');
  });

  it('does not mount payload handlers as Express routes when there is no router', async () => {
    const serviceDir = path.join(outRoot, 'source-handlers-only');
    const routesDir = path.join(serviceDir, 'routes');
    mkdirp(routesDir);

    // Two handler modules, no router
    writeFile(
      path.join(routesDir, 'handle_alpha.ts'),
      `export async function handleAlphaWebhook(req:any,res:any){ return; }`
    );
    writeFile(
      path.join(routesDir, 'handle_beta.ts'),
      `export async function handleBetaWebhook(req:any,res:any){ return; }`
    );

    await generateWebhookApp('source-handlers-only', serviceDir);

    const appFile = findGeneratedAppFile(serviceDir);
    expect(appFile).toBeTruthy();
    const src = readIfExists(appFile!);
    expect(src).toBeTruthy();

    // Express + registry import present; no router import
    expect(src!).toMatch(/import\s+express\s+from\s+['"]express['"]/);
    expect(src!).toMatch(/import\s*\{\s*webhookAppRegistry\s*\}\s*from\s*['"]\.\/webhookAppRegistry['"]/);
    expect(src!).not.toMatch(/from\s+['"]\.\/routes\/router['"]/);

    expect(src!).toContain("webhookAppRegistry['source-handlers-only']?.router");
    expect(src!).not.toContain('app.post(');
    const registry = fs.readFileSync(path.join(serviceDir, 'webhookAppRegistry.ts'), 'utf8');
    expect(registry).toContain('router: undefined,');
    expect(registry).toContain('...handle_alpha');
  });

  it('is idempotent: running generateWebhookApp twice does not duplicate imports or loops', async () => {
    const serviceDir = path.join(outRoot, 'source-idempotent');
    mkdirp(serviceDir);

    // Minimal empty registry mapping for the service
    writeFile(
      path.join(serviceDir, 'webhookAppRegistry.ts'),
      `export const webhookAppRegistry = { 'source-idempotent': {} as any };\n`
    );

    await generateWebhookApp('source-idempotent', serviceDir);
    await generateWebhookApp('source-idempotent', serviceDir);

    const appFile = findGeneratedAppFile(serviceDir);
    expect(appFile).toBeTruthy();
    const src = readIfExists(appFile!);
    expect(src).toBeTruthy();

    // No duplicate express imports or router mounts
    expect((src!.match(/import\s+express\s+from\s+['"]express['"]/g) || []).length).toBe(1);
    expect((src!.match(/app\.use\(router\)/g) || []).length).toBe(1);
  });

  it('logs warning and exits when generateWebhookAppFromFile receives invalid JSON', async () => {
    const configPath = path.join(tmpDir, 'bad.json');
    const interfacesDir = path.join(tmpDir, 'interfaces');
    const outputDir = path.join(tmpDir, 'out');
    mkdirp(interfacesDir);
    writeFile(configPath, ''); // invalid JSON

    await expect(generateWebhookAppFromFile(configPath, interfacesDir, outputDir)).rejects.toThrow(/Failed to parse webhook config JSON/);
  });

  it('skips bad config files when using generateWebhookAppFromPath', async () => {
    const configDir = path.join(tmpDir, 'configs');
    const interfacesDir = path.join(tmpDir, 'interfaces');
    const outputDir = path.join(tmpDir, 'out');
    mkdirp(configDir);
    mkdirp(interfacesDir);
    writeFile(path.join(configDir, 'bad.json'), ''); // invalid JSON

    await expect(generateWebhookAppFromPath(configDir, interfacesDir, outputDir)).rejects.toThrow(/Failed to parse webhook config JSON/);
  });

  it('warns and skips when schema is not found in any interface folder', async () => {
    const configDir = path.join(tmpDir, 'configs');
    const interfacesDir = path.join(tmpDir, 'interfaces');
    const outputDir = path.join(tmpDir, 'out');

    mkdirp(configDir);
    mkdirp(interfacesDir);

    writeFile(path.join(configDir, 'no-match.json'), JSON.stringify({
      webhooks: [
        {
          direction: 'incoming',
          name: 'failWebhook',
          path: '/fail',
          handlerName: 'failHandler',
          requestSchema: 'UnfindableSchema'
        }
      ]
    }));

    await expect(generateWebhookAppFromPath(configDir, interfacesDir, outputDir)).rejects.toThrow(/Failed to locate an interfaces directory containing all required schemas/);
  });
});
