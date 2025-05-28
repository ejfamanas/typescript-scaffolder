#!/usr/bin/env node
import { Command } from 'commander';
import path from 'path';
import { Logger } from './utils/logger';
import {generateInterfacesFromPath} from "./features/generate-interfaces";

const program = new Command();

program
    .name('typescript-scaffolder')
    .description('Generate TypeScript interfaces from JSON schemas')
    .version('1.0.0')
    .option('-i, --input <dir>', 'Input directory', 'schemas')
    .option('-o, --output <dir>', 'Output directory', 'codegen/interfaces')
    .option('--declaration', 'Generate .d.ts files instead of .ts', false)
    .parse(process.argv);

const options = program.opts();

Logger.info('cli', `Generating interfaces from "${options.input}" to "${options.output}"`);
generateInterfacesFromPath(
    path.resolve(options.input),
    path.resolve(options.output)
);