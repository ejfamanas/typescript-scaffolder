import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Project } from 'ts-morph';
import { generateWebhookRoute, IncomingWebhook, generateWebhookRoutesFromFile, generateWebhookRoutesFromPath, generateWebhookAppRegistry } from "../../../src";

/**
 * Helper to read a file if it exists.
 */
function readIfExists(p: string): string | null {
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}



/**
 * NOTE: You must wire this to your generator.
 * Replace the body of this function to call your real generator for one webhook.
 * It should generate/append to `<outputDir>/router.ts`.
 */
async function generateOneWebhookRouter(
  project: Project,
  opts: {
    outputDir: string;
    interfaceInputDir: string;
    requestSchema: string;
    handlerName: string;
    webhookPath: string;
    serviceName: string;
    testHeaders?: Record<string, string>;
  }
) {
  const webhook: IncomingWebhook = {
    direction: 'incoming',
    name: opts.handlerName,
    path: opts.webhookPath,
    handlerName: opts.handlerName,
    requestSchema: opts.requestSchema,
    testHeaders: opts.testHeaders,
  };

  await generateWebhookRoute(
    webhook,
    opts.interfaceInputDir,
    opts.outputDir
  );
}

describe('generate-webhook-router', () => {
  let tmpDir: string;
  let project: Project;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'router-gen-'));
    project = new Project({ useInMemoryFileSystem: false });
  });

  afterEach(() => {
    try {
      const entries = fs.readdirSync(tmpDir);
      for (const e of entries) {
        fs.rmSync(path.join(tmpDir, e), { recursive: true, force: true });
      }
      fs.rmdirSync(tmpDir);
    } catch {
      /* no-op */
    }
  });

  it('creates router.ts for first webhook and appends a second without duplicates', async () => {
    // Arrange: fake interface dir (used only for relative import construction in your generator)
    const ifaceDir = path.join(tmpDir, 'interfaces', 'service-alpha');
    fs.mkdirSync(ifaceDir, { recursive: true });

    // Act: generate first webhook
    await generateOneWebhookRouter(project, {
      outputDir: tmpDir,
      interfaceInputDir: ifaceDir,
      requestSchema: 'StripePaymentSucceededPayload',
      handlerName: 'handleStripePaymentSucceeded',
      webhookPath: '/webhooks/stripe_payment_succeeded',
      serviceName: 'service-alpha',
    });
    await project.save();

    // Append second webhook to the same router
    await generateOneWebhookRouter(project, {
      outputDir: tmpDir,
      interfaceInputDir: ifaceDir,
      requestSchema: 'StripePaymentFailedPayload',
      handlerName: 'handleStripePaymentFailed',
      webhookPath: '/webhooks/stripe_payment_failed',
      serviceName: 'service-alpha',
    });
    await project.save();

    // Assert: router exists and has both routes
    const routerPath = path.join(tmpDir, 'router.ts');
    const txt = readIfExists(routerPath);
    expect(txt).toBeTruthy();
    const src = String(txt);

    // Single bootstrap & export
    expect(src.match(/const\s+router\s*=\s*express\.Router\(\)/g)?.length).toBe(1);
    expect(src.match(/export\s+default\s+router/g)?.length).toBe(1);

    // Both incoming routes are present
    expect(src).toContain("router.post('/webhooks/stripe_payment_succeeded'");
    expect(src).toContain("router.post('/webhooks/stripe_payment_failed'");

    // No duplicate imports for express
    expect((src.match(/from\s+['"]express['"]/g) || []).length).toBe(1);
  });

  it('imports unique fixtures and uses the correct one per test route', async () => {
    const ifaceDir = path.join(tmpDir, 'interfaces', 'service-beta');
    fs.mkdirSync(ifaceDir, { recursive: true });

    await generateOneWebhookRouter(project, {
      outputDir: tmpDir,
      interfaceInputDir: ifaceDir,
      requestSchema: 'StripePaymentSucceededPayload',
      handlerName: 'handleStripePaymentSucceeded',
      webhookPath: '/webhooks/stripe_payment_succeeded',
      serviceName: 'service-beta',
    });
    await project.save();

    await generateOneWebhookRouter(project, {
      outputDir: tmpDir,
      interfaceInputDir: ifaceDir,
      requestSchema: 'StripePaymentFailedPayload',
      handlerName: 'handleStripePaymentFailed',
      webhookPath: '/webhooks/stripe_payment_failed',
      serviceName: 'service-beta',
    });
    await project.save();

    const src = String(readIfExists(path.join(tmpDir, 'router.ts')));

    // Fixture imports should be unique per interface
    expect(src).toMatch(/import\s+\{\s*mockStripePaymentSucceededPayload\s*\}\s+from\s+['"].*StripePaymentSucceededPayload\.fixture['"];?/);
    expect(src).toMatch(/import\s+\{\s*mockStripePaymentFailedPayload\s*\}\s+from\s+['"].*StripePaymentFailedPayload\.fixture['"];?/);

    // Test routes should reference the matching mock
    expect(src).toContain("router.post('/test/service-beta-handleStripePaymentSucceeded-webhook'");
    expect(src).toContain('await handleHandleStripePaymentSucceededWebhook(mockStripePaymentSucceededPayload)');

    expect(src).toContain("router.post('/test/service-beta-handleStripePaymentFailed-webhook'");
    expect(src).toContain('await handleHandleStripePaymentFailedWebhook(mockStripePaymentFailedPayload)');
  });

  it('renders testHeaders in the test route (ENV and literal)', async () => {
    const ifaceDir = path.join(tmpDir, 'interfaces', 'service-gamma');
    fs.mkdirSync(ifaceDir, { recursive: true });

    await generateOneWebhookRouter(project, {
      outputDir: tmpDir,
      interfaceInputDir: ifaceDir,
      requestSchema: 'StripePaymentSucceededPayload',
      handlerName: 'handleStripePaymentSucceeded',
      webhookPath: '/webhooks/stripe_payment_succeeded',
      serviceName: 'service-gamma',
      testHeaders: {
        'stripe-signature': '${ENV:STRIPE_TEST_SIGNATURE}',
        'x-api-key': 'dev-local'
      }
    });
    await project.save();

    const src = String(readIfExists(path.join(tmpDir, 'router.ts')));

    // Test route should include both headers: env expanded, literal preserved
    expect(src).toContain("router.post('/test/service-gamma-handleStripePaymentSucceeded-webhook'");
    expect(src).toMatch(/await\s+handleHandleStripePaymentSucceededWebhook\(mockStripePaymentSucceededPayload,\s*\{\s*'stripe-signature':\s*\(process\.env\.STRIPE_TEST_SIGNATURE\s*\?\?\s*''\),\s*'x-api-key':\s*['"]dev-local['"]\s*\}\s*\)/);  });

  it('is idempotent: re-running does not duplicate imports or routes', async () => {
    const ifaceDir = path.join(tmpDir, 'interfaces', 'service-delta');
    fs.mkdirSync(ifaceDir, { recursive: true });

    const opts = {
      outputDir: tmpDir,
      interfaceInputDir: ifaceDir,
      requestSchema: 'StripePaymentSucceededPayload',
      handlerName: 'handleStripePaymentSucceeded',
      webhookPath: '/webhooks/stripe_payment_succeeded',
      serviceName: 'service-delta',
    } as const;

    await generateOneWebhookRouter(project, opts);
    await project.save();

    // Run again with same params
    await generateOneWebhookRouter(project, opts);
    await project.save();

    const src = String(readIfExists(path.join(tmpDir, 'router.ts')));

    // Ensure no duplicates for route and imports
    expect((src.match(/router\.post\('\/webhooks\/stripe_payment_succeeded'/g) || []).length).toBe(1);
    expect((src.match(/from\s+['"]express['"]/g) || []).length).toBe(1);
    expect((src.match(/export\s+default\s+router/g) || []).length).toBe(1);
  });
});

describe('generateWebhookRoutesFromFile', () => {
  let tmpDir: string;
  let outputDir: string;
  let ifaceDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-from-file-'));
    outputDir = path.join(tmpDir, 'out');
    ifaceDir = path.join(tmpDir, 'interfaces', 'service-zeta');
    fs.mkdirSync(outputDir, { recursive: true });
    fs.mkdirSync(ifaceDir, { recursive: true });
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  it('reads config and generates aggregated router with multiple incoming webhooks', async () => {
    const configPath = path.join(tmpDir, 'stripe-multi.json');
    const config = {
      webhooks: [
        {
          direction: 'incoming',
          name: 'stripe_payment_succeeded',
          path: '/webhooks/stripe_payment_succeeded',
          handlerName: 'handleStripePaymentSucceeded',
          requestSchema: 'StripePaymentSucceededPayload'
        },
        {
          direction: 'incoming',
          name: 'stripe_payment_failed',
          path: '/webhooks/stripe_payment_failed',
          handlerName: 'handleStripePaymentFailed',
          requestSchema: 'StripePaymentFailedPayload',
          testHeaders: {
            'stripe-signature': '${ENV:STRIPE_TEST_SIGNATURE}',
            'x-api-key': 'dev-local'
          }
        },
        {
          direction: 'outgoing',
          name: 'ignore_me_outgoing',
          targetUrl: 'https://example.com/hook'
        }
      ]
    } as any;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    await generateWebhookRoutesFromFile(configPath, ifaceDir, outputDir);

    const routerPath = path.join(outputDir, 'router.ts');
    const src = readIfExists(routerPath);
    expect(src).toBeTruthy();
    const txt = String(src);

    // has both routes
    expect(txt).toContain("router.post('/webhooks/stripe_payment_succeeded'");
    expect(txt).toContain("router.post('/webhooks/stripe_payment_failed'");

    // unique test routes
    expect(txt).toContain("router.post('/test/service-zeta-handleStripePaymentSucceeded-webhook'");
    expect(txt).toContain("router.post('/test/service-zeta-handleStripePaymentFailed-webhook'");

    // fixture imports for both
    expect(txt).toMatch(/import\s+\{\s*mockStripePaymentSucceededPayload\s*\}\s+from\s+['"].*StripePaymentSucceededPayload\.fixture['"];?/);
    expect(txt).toMatch(/import\s+\{\s*mockStripePaymentFailedPayload\s*\}\s+from\s+['"].*StripePaymentFailedPayload\.fixture['"];?/);

    // headers rendered for the failed route
    expect(txt).toMatch(/handleHandleStripePaymentFailedWebhook\(mockStripePaymentFailedPayload,\s*\{\s*'stripe-signature':\s*\(process\.env\.STRIPE_TEST_SIGNATURE\s*\?\?\s*''\),\s*'x-api-key':\s*['"]dev-local['"]\s*\}\s*\)/);
  });
});

describe('generateWebhookRoutesFromPath', () => {
  let tmpDir: string;
  let configDir: string;
  let interfacesRootDir: string;
  let outputRootDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-from-path-'));
    configDir = path.join(tmpDir, 'configs');
    interfacesRootDir = path.join(tmpDir, 'interfaces');
    outputRootDir = path.join(tmpDir, 'out');
    fs.mkdirSync(configDir, { recursive: true });
    fs.mkdirSync(interfacesRootDir, { recursive: true });
    fs.mkdirSync(outputRootDir, { recursive: true });
  });

  afterEach(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it('discovers config files, resolves interface dirs, and generates routers under the correct output subdir', async () => {
    // Prepare interfaces under a service subdir so extractInterfaces can find schemas
    const serviceDir = path.join(interfacesRootDir, 'source-omega');
    fs.mkdirSync(serviceDir, { recursive: true });
    fs.writeFileSync(path.join(serviceDir, 'StripePaymentSucceededPayload.ts'), 'export interface StripePaymentSucceededPayload { id: string }\n');
    fs.writeFileSync(path.join(serviceDir, 'StripePaymentFailedPayload.ts'), 'export interface StripePaymentFailedPayload { id: string }\n');

    // Prepare config file with two incoming webhooks for the same service
    const cfg = {
      webhooks: [
        {
          direction: 'incoming',
          name: 'stripe_payment_succeeded',
          path: '/webhooks/stripe_payment_succeeded',
          handlerName: 'handleStripePaymentSucceeded',
          requestSchema: 'StripePaymentSucceededPayload'
        },
        {
          direction: 'incoming',
          name: 'stripe_payment_failed',
          path: '/webhooks/stripe_payment_failed',
          handlerName: 'handleStripePaymentFailed',
          requestSchema: 'StripePaymentFailedPayload',
          testHeaders: {
            'stripe-signature': '${ENV:STRIPE_TEST_SIGNATURE}',
            'x-api-key': 'dev-local'
          }
        }
      ]
    };
    const cfgPath = path.join(configDir, 'omega.json');
    fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));

    // Run the high-level generator
    await generateWebhookRoutesFromPath(configDir, interfacesRootDir, outputRootDir);

    // Router should be created under outputRootDir/<relativeInterfaceDir>/router.ts
    const expectedRouterPath = path.join(outputRootDir, 'source-omega', 'router.ts');
    const txt = readIfExists(expectedRouterPath);
    expect(txt).toBeTruthy();
    const src = String(txt);

    // Two webhook routes present
    expect(src).toContain("router.post('/webhooks/stripe_payment_succeeded'");
    expect(src).toContain("router.post('/webhooks/stripe_payment_failed'");

    // Unique test routes per webhook
    expect(src).toContain("router.post('/test/source-omega-handleStripePaymentSucceeded-webhook'");
    expect(src).toContain("router.post('/test/source-omega-handleStripePaymentFailed-webhook'");

    // Fixture imports present
    expect(src).toMatch(/import\s+\{\s*mockStripePaymentSucceededPayload\s*\}\s+from\s+['"].*StripePaymentSucceededPayload\.fixture['"];?/);
    expect(src).toMatch(/import\s+\{\s*mockStripePaymentFailedPayload\s*\}\s+from\s+['"].*StripePaymentFailedPayload\.fixture['"];?/);

    // Headers rendered for the failed route (ENV + literal)
    expect(src).toMatch(/handleHandleStripePaymentFailedWebhook\(mockStripePaymentFailedPayload,\s*\{\s*'stripe-signature':\s*\(process\.env\.STRIPE_TEST_SIGNATURE\s*\?\?\s*''\),\s*'x-api-key':\s*['"]dev-local['"]\s*\}\s*\)/);
  });
});