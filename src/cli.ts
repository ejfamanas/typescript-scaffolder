#!/usr/bin/env node
import { Command } from 'commander';
import path from 'path';
import { Logger } from './utils/logger';
import { generateInterfacesFromPath } from "./features/generate-interfaces";
import { generateEnumsFromPath } from './features/generate-enums';
import { generateEnvLoader } from './features/generate-env-loader';
import { generateApiClientFromFile, generateApiClientsFromPath } from './features/generate-api-client';
import { generateApiRegistry } from './features/generate-api-client-registry';
import { generateWebhookAppFromPath } from './features/generate-webhook-app';
import { generateWebhookAppRegistry } from "./features/generate-webhook-app-registry";
import { generateJsonSchemasFromPath } from "./features/generate-json-schemas";

const program = new Command();

program
    .command('interfaces')
    .description('Generate TypeScript interfaces from JSON schemas')
    .requiredOption('-i, --input <dir>', 'Input directory')
    .requiredOption('-o, --output <dir>', 'Output directory')
    .action(async (options) => {
        Logger.info('cli', `Generating interfaces from "${options.input}" to "${options.output}"`);
        await generateInterfacesFromPath(
            path.resolve(options.input),
            path.resolve(options.output)
        );
    });

program
    .command('jsonschemas')
    .description('Generate JSON schemas from TypeScript interfaces')
    .requiredOption('-i, --input <dir>', 'Input directory')
    .requiredOption('-o, --output <dir>', 'Output directory')
    .action(async (options) => {
        Logger.info('cli', `Generating JSON schemas from "${options.input}" to "${options.output}" with ext "${options.ext}"`);
        await generateJsonSchemasFromPath(
            path.resolve(options.input),
            path.resolve(options.output)
        );
    });

program
    .command('enums')
    .description('Generate enums from TypeScript interface files')
    .requiredOption('-i, --input <dir>', 'Input directory')
    .requiredOption('-o, --output <dir>', 'Output directory')
    .option('-e, --ext <extension>', 'File extension to filter', '.ts')
    .action(async (options) => {
        Logger.info('cli', `Generating enums from "${options.input}" to "${options.output}" with ext "${options.ext}"`);
        await generateEnumsFromPath(
            path.resolve(options.input),
            path.resolve(options.output),
            options.ext
        );
    });

program
    .command('envloader')
    .description('Generate TypeScript env loader from .env file')
    .requiredOption('-e, --env-file <file>', 'Path to .env file')
    .requiredOption('-o, --output-dir <dir>', 'Output directory')
    .requiredOption('-f, --output-file <filename>', 'Output filename (e.g. env.ts)')
    .option('--class-name <name>', 'Env class name', 'EnvConfig')
    .option('--enum-name <name>', 'Env enum name', 'EnvKeys')
    .action((options) => {
        Logger.info('cli', `Generating env loader from "${options.envFile}" to "${options.outputDir}/${options.outputFile}"`);
        generateEnvLoader(
            path.resolve(options.envFile),
            path.resolve(options.outputDir),
            options.outputFile,
            options.className,
            options.enumName
        );
    });

program
    .command('apiclient-file')
    .description('Generate an API client from a single JSON config file')
    .requiredOption('-c, --config <file>', 'Path to JSON config file')
    .requiredOption('-i, --interfaces <dir>', 'Path to interfaces directory')
    .requiredOption('-o, --output <dir>', 'Output directory')
    .action(async (options) => {
        Logger.info('cli', `Generating API client from file "${options.config}"`);
        await generateApiClientFromFile(
            path.resolve(options.config),
            path.resolve(options.interfaces),
            path.resolve(options.output)
        );
    });

program
    .command('apiclient-dir')
    .description('Generate API clients from multiple JSON config files in a directory')
    .requiredOption('-c, --config-dir <dir>', 'Directory with JSON config files')
    .requiredOption('-i, --interfaces-root <dir>', 'Root interfaces directory')
    .requiredOption('-o, --output-root <dir>', 'Root output directory')
    .action(async (options) => {
        Logger.info('cli', `Generating API clients from directory "${options.configDir}"`);
        await generateApiClientsFromPath(
            path.resolve(options.configDir),
            path.resolve(options.interfacesRoot),
            path.resolve(options.outputRoot)
        );
    });

program
    .command('apiclient-registry')
    .description('Generate API client registry from API client files')
    .requiredOption('-a, --api-root <dir>', 'Root directory containing API client files')
    .option('-r, --registry-file <filename>', 'Name of the registry file', 'registry.ts')
    .action(async (options) => {
        Logger.info('cli', `Generating API client registry in "${options.apiRoot}" with filename "${options.registryFile}"`);
        await generateApiRegistry(
            path.resolve(options.apiRoot),
            options.registryFile
        );
    });

program
    .command('webhooks')
    .description('Generate webhook app and registry from config file')
    .requiredOption('-c, --config <file>', 'path to config file')
    .requiredOption('-i, --interfaces <dir>', 'path to interfaces directory')
    .requiredOption('-o, --output <dir>', 'output directory')
    .action(async (options) => {
        Logger.info('cli', `Generating webhook app and registry from config "${options.config}", interfaces "${options.interfaces}", output "${options.output}"`);
        await generateWebhookAppRegistry(path.resolve(options.output));
        await generateWebhookAppFromPath(
            path.resolve(options.config),
            path.resolve(options.interfaces),
            path.resolve(options.output)
        );
    });

program
    .command('sequences')
    .description('Generate sequence runners from JSON config files')
    .requiredOption('-c, --config-dir <dir>', 'Directory with sequence JSON config files')
    .requiredOption('-o, --output <dir>', 'Output directory for generated runners')
    .action(async (options) => {
        Logger.info('cli', `Generating sequence runners from "${options.configDir}" to "${options.output}"`);
        const { generateSequencesFromPath } = await import('./features/generate-sequence-runner');
        await generateSequencesFromPath(
            path.resolve(options.configDir),
            path.resolve(options.output)
        );
    });

program
    .command('help')
    .description('Display help information')
    .action(() => {
        program.outputHelp();
    });

program.parse(process.argv);