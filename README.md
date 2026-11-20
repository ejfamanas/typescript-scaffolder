# TypeScript Scaffolder

![npm version](https://img.shields.io/npm/v/typescript-scaffolder)
![line coverage](https://img.shields.io/badge/line%20coverage-95.98%25-green)

A CLI and programmatic toolchain for generating fully-typed TypeScript code from raw JSON, schemas, and declarative configs.

---
### 🧭 About the Project

**TypeScript Scaffolder** helps engineers, integrators, and platform teams turn raw JSON or schema definitions into **fully‑typed, production‑ready TypeScript scaffolds** — without boilerplate, code generators, or SaaS lock‑in.

It’s designed for:

- **Integration engineers** who build and maintain internal or customer‑facing API connectors
- **Full‑stack developers** who want type‑safe clients and schemas derived directly from real data
- **Automation and DevOps teams** embedding codegen pipelines into CI/CD workflows

#### 🧩 What makes it different

- **Versionable by design** – every scaffolded artifact is plain TypeScript, not a black‑box runtime
- **Deterministic output** – predictable folder and file structure across runs and environments
- **Zero vendor lock‑in** – generated code lives in your repo, not behind an API
- **Composable architecture** – each generator (interfaces, clients, webhooks, etc.) can run standalone or as part of a single `full` pipeline

---

## ✨ Features

- ✅ Interface & enum generation from raw JSON
- ✅ Factory class generation
- ✅ Typed `.env` loader and accessors
- ✅ JSON Schema generation
- ✅ Axios-based API clients (with typed request/response)
- ✅ Command sequence runner generator
- ✅ Webhook server + client scaffolds
- ✅ CLI or API use
- ✅ GitHub-ready code output — versionable, zero runtime lock-in
---

## Installation

```bash
npm install typescript-scaffolder
```

---

## Programmatic Usage
You can follow the example below on a best approach on how to use the API:
```typescript
import * as path from "path";
import {
	generateApiClientsFromPath,
	generateApiRegistry,
	generateSequencesFromPath,
	generateEnumsFromPath,
	generateEnvLoader,
	generateInterfacesFromPath,
	generateWebhookAppFromPath, generateFactoriesFromPath,
} from "typescript-scaffolder";

const ROOT_DIR = process.cwd();                // Base dir where the script is run
const LOCAL_DIR = __dirname;                   // Base dir where this file lives
const CODEGEN_DIR = path.resolve(LOCAL_DIR, "src/codegen")

// Interface generation config
const SCHEMA_INPUT_DIR = path.resolve(LOCAL_DIR, "config/schemas");
const INTERFACE_OUTPUT_DIR = path.resolve(CODEGEN_DIR, "interfaces");

// Generate enums, this will use the previously generated interface output
const ENUM_OUTPUT_DIR = path.resolve(CODEGEN_DIR, "enums");

// Generate factories, this will use the previously generated interface output
const FACTORY_OUTPUT_DIR = path.resolve(CODEGEN_DIR, "factories")

// Client API endpoint generation config
const ENDPOINT_CONFIG_PATH = path.resolve(LOCAL_DIR, "config/endpoint-configs");
const CLIENT_OUTPUT_DIR = path.resolve(CODEGEN_DIR, "apis")

// Client API sequence generation config
const SEQUENCE_CONFIG_PATH = path.resolve(LOCAL_DIR, "config/sequence-configs");

// Webhook server generation config
const WEBHOOK_CONFIG_PATH = path.resolve(LOCAL_DIR, "config/webhook-configs");
const WEBHOOK_OUTPUT_DIR = path.resolve(CODEGEN_DIR, "webhooks");

// Env accessor config
const ENV_FILE = path.resolve(ROOT_DIR, ".env");
const ENV_OUTPUT_DIR = path.resolve(CODEGEN_DIR, "config");
const ENV_OUTPUT_FILE = "env-config.ts";

async function build() {
	// using the env accessor
	// this is a sync function, and should be run first anyway
	generateEnvLoader(ENV_FILE, ENV_OUTPUT_DIR, ENV_OUTPUT_FILE);

	// using the interface generator
	await generateInterfacesFromPath(SCHEMA_INPUT_DIR, INTERFACE_OUTPUT_DIR);

	// use the enum generator from the output of the interface generator
	await generateEnumsFromPath(INTERFACE_OUTPUT_DIR, ENUM_OUTPUT_DIR);

	// use the factory generator from the output of the interface generator
	await generateFactoriesFromPath(INTERFACE_OUTPUT_DIR, FACTORY_OUTPUT_DIR);

	// Generates an object-centric axios api client based on a config file
	await generateApiClientsFromPath(ENDPOINT_CONFIG_PATH, INTERFACE_OUTPUT_DIR, CLIENT_OUTPUT_DIR);

	// Generate the api registry to access the generated client functions
	await generateApiRegistry(CLIENT_OUTPUT_DIR);

	// Generates a command sequence file based on the generated client-api registry
	await generateSequencesFromPath(SEQUENCE_CONFIG_PATH, CLIENT_OUTPUT_DIR);

	// Generate an express webhook application
	await generateWebhookAppFromPath(WEBHOOK_CONFIG_PATH, INTERFACE_OUTPUT_DIR, WEBHOOK_OUTPUT_DIR);
}

build();
```

The generated `EnvConfig` class reads from `process.env` when you access a field. Supply runtime values through your environment or load your application's `.env` file before reading them. For example, a sample entry of `PORT=3000` generates a numeric getter, and `ENABLED=true` generates a boolean getter that accepts `true` or `false`. Accessing a missing key or an invalid typed value throws an error naming the key.

### Webhook routing

Generated Express apps mount incoming webhooks at the `path` specified in the JSON config, such as `/webhooks/stripe_payment_succeeded`. The router passes the JSON request body to the corresponding payload handler. Apps with no incoming webhooks can start with an empty registry.

### Webhook regeneration

Webhook handlers (`handle_*.ts`) and senders (`send_*_webhook.ts`) are preserved by default, including your imports, comments, and implementations. Both `webhooks` and `full` accept `--overwrite-webhooks` to explicitly rebuild these files from the current JSON configuration and interfaces.

| Mode | Existing handler and sender files | Newly configured webhooks |
|------|----------------------------------|---------------------------|
| Default | Keep their contents unchanged | Create missing files |
| `--overwrite-webhooks` | Replace their contents with generated code, discarding edits | Create missing files |

The installed CLI executable is `typescript-codegen`. The `webhooks` command takes a **directory** of JSON config files:

```bash
typescript-codegen webhooks \
  --config ./config/webhook-configs \
  --interfaces ./src/codegen/interfaces \
  --output ./src/codegen/webhooks
```

Add `--overwrite-webhooks` when you want the config to replace existing implementations. For the full pipeline:

```bash
typescript-codegen full \
  --json ./config/schemas \
  --env .env \
  --output ./src/codegen \
  --overwrite-webhooks
```

Regeneration uses fixed code-generation rules. With the same JSON configuration, interfaces, generator version, and output layout, overwrite mode produces the same handler and sender source regardless of their previous contents. With default preservation, update existing signatures or delivery logic manually when changing schemas, headers, or target URLs.

The programmatic equivalents accept an optional final `WebhookGenerationOptions` argument. For example:

```typescript
await generateWebhookAppFromPath(
    WEBHOOK_CONFIG_PATH,
    INTERFACE_OUTPUT_DIR,
    WEBHOOK_OUTPUT_DIR,
    { overwrite: true }
);
```

Omitting this argument or passing `{ overwrite: false }` preserves existing implementations.

## Quickstart CLI Example

```bash
typescript-codegen full \
  --json ./config/schemas \
  --env .env \
  --output ./src/codegen
```

---

## Full Documentation

👉 **Visit the full docs** at  
https://eric-famanas.super.site/the-typescript-scaffolder

---

## ⚙️ CLI Commands (Cheat Sheet)

| Command               | Description                               |
|-----------------------|-------------------------------------------|
| `interfaces`          | Generate TypeScript interfaces from JSON  |
| `enums`               | Create enums from interface keys          |
| `factories`           | Generate mock data factories              |
| `envloader`           | Generate typed `.env` accessor            |
| `apiclient-file`      | Generate 1 API client from a config file  |
| `apiclient-dir`       | Generate multiple API clients from dir    |
| `apiclient-registry`  | Create central API client registry        |
| `sequences`           | Generate workflow runner from steps       |
| `webhooks`            | Generate Express webhook apps/handlers    |
| `full`                | Run the entire scaffold pipeline          |

📔 Use `typescript-codegen <command> --help` for options. Both `webhooks` and `full` preserve existing webhook implementations unless `--overwrite-webhooks` is supplied.

---

## Tests and coverage

Latest completed coverage run (20 November 2026): **357 tests passed across 29 suites**.

| Metric | Coverage |
|--------|----------|
| Lines | 95.98% |
| Statements | 95.53% |
| Functions | 97.35% |
| Branches | 86.71% |

The badge reports line coverage. These totals cover files instrumented by Jest. CLI subprocess tests are included in the test count, but execution inside their child processes is not included in the coverage totals.

Reproduce the report with:

```bash
NODE_OPTIONS=--no-experimental-webstorage npm run test:coverage -- \
  --maxWorkers=2 \
  --coverageReporters=text \
  --coverageReporters=json-summary
```

The report is written to `coverage/coverage-summary.json`. An intermittent temporary-directory error can abort coverage runs; this remains tracked in [CHANGELOG.md](CHANGELOG.md).

## Roadmap
- [x] Generate interfaces from schema definitions
- [x] Generate enums to assert key names
- [x] Generate accessor for environment variables
- [x] Generate axios REST api client from interfaces
- [x] Generate command sequences for REST api calls
- [x] Generate axios client webhook apps
- [x] Generate helper functions for REST api calls
- [x] Generate wrapper functions for auth, retries, and error handling
- [x] Generate webhook test routes and fixtures
- [x] Generate express server webhook apps
- [x] Command line interface access
- [x] Factory classes based on interfaces
- [ ] Scaffolding for service mocking (GET, POST, PUT, DELETE)
- [ ] Generate enums from definitions
- [ ] Generate classes from schema definitions
- [ ] Declarative function generation

## Reporting Bugs

If you encounter a bug or unexpected behavior, please open an issue with:

- A clear description of the problem
- Steps to reproduce it (code snippets, input files, etc.)
- The expected vs. actual result
- Your environment (OS, Node.js version, TypeScript version)

Bug reports are appreciated and help improve the project, even if you're not submitting a fix directly.

## Contributing

This project is currently maintained as a solo project. While issues and ideas are welcome, I’m not accepting external pull requests at this time.

## Repo
https://github.com/ejfamanas/typescript-scaffolder

## License
Licensed under the [MIT License](LICENSE).

