# Changelog

## Unreleased

### Fixed

- [x] **Read environment values at runtime and parse their types.** Generated accessors use the example file to infer keys and types. Each getter reads the current environment, converts numbers and booleans, and raises an error naming the key if a required value is missing or invalid. Regression coverage compiles the generated module in strict mode, checks that sample values stay out of its source, and exercises runtime reads. [Environment loader](src/features/generate-env-loader.ts) · [Regression tests](__tests__/features/generate-env-loader.test.ts)
- [x] **Preserve webhook handler implementations on regeneration.** Existing incoming handler and outgoing sender files are left unchanged by default. Newly configured webhooks still get their own files. Both `webhooks` and `full` expose `--overwrite-webhooks` to explicitly replace implementations from config; programmatic generators accept `{ overwrite: true }`. The CLI help identifies the config input as a directory. Regression coverage checks preservation, explicit overwrite, new config entries, and repeatable handler and sender output through both CLI commands using raw JSON inputs. [Webhook generator](src/features/webhooks/generate-webhooks.ts) · [Generator tests](__tests__/features/webhooks/generate-webhooks.test.ts) · [CLI tests](__tests__/cli/webhook-regeneration.test.ts)

### Open items from the 2.3.20 review

Reviewed commit `c37cafa`. The bundled `full` example generated 62 TypeScript files and exited successfully. Compiling that output in a strict consumer project produced eight errors.

#### High priority

- [ ] **Mount the configured webhook routes in the generated Express app.** The payment example passes fixture objects to `app.post` as handlers and throws during app construction. Verify that the generated app compiles, starts, and dispatches a POST at `/webhooks/stripe_payment_succeeded` to the intended handler. [App template](src/features/webhooks/strings/webhook-app-strings.ts) · [Registry generator](src/features/webhooks/generate-webhook-app-registry.ts)
- [ ] **Resolve sequence steps to the generated API clients.** The bundled runner calls `apiRegistry["populate-users"].getAll_people()`, but the client is registered as `apiRegistry["source-charlie"].GET_ALL_person`. Align the service key and method lookup. Verify that both bundled runners compile against the generated registry and call the expected client methods with mocked responses. [Sequence generator](src/features/api-client/generate-sequence-runner.ts) · [Client naming](src/utils/client-constructors.ts)

#### Medium priority

- [ ] **Fix argument handling in the standalone `factories` command.** The CLI passes the Faker flag into the file-extension parameter, so both flag settings exit successfully with zero files. Verify that the standalone command generates factories from the bundled interfaces both with and without `--faker`, and that the flag selects Faker-based defaults. [CLI](src/cli.ts) · [Factory generator](src/features/generate-factories.ts)
- [ ] **Honor `includeErrorHandler` in endpoint configs.** File-based generation writes the error-handler module but drops the flag when building the client function. Verify that enabling the flag makes the generated endpoint invoke its wrapper on a failed request and disabling it preserves the direct request behavior. [API client generator](src/features/api-client/generate-api-client.ts)
- [ ] **Make public type declarations usable outside this repository.** The emitted declarations retain imports such as `models/api-definitions`, which depend on the generator's local TypeScript path alias. Verify that a separate consumer can import the built package and type-check with `skipLibCheck: false` and no consumer-defined alias. [Public API](src/index.ts) · [TypeScript configuration](tsconfig.json)

#### Test reliability

- [ ] **Resolve the intermittent temporary-directory failure in the full Jest suite.** On Node 25.2.0, Jest required `--no-experimental-webstorage` to start. With that flag, the coverage run recorded 348 passes, one failure, and 95.96% line coverage. The affected test passed in isolation, and a second full run encountered another temporary-directory error. Verify the fix with repeated full-suite and coverage runs. [Test scripts](package.json) · [Jest configuration](jest.config.js)

### Additional findings from CLI regression testing

- [ ] **Allow `full` to run with an empty endpoint-config directory.** With a fresh output directory and no endpoint configs, API registry generation throws `ENOENT` while scanning the missing `<output>/apis` directory, before webhook generation starts. Verify that a webhook-only config can complete the full pipeline without manually creating that output directory. [CLI](src/cli.ts) · [API registry generator](src/features/api-client/generate-api-client-registry.ts)
