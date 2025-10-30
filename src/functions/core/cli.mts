import type { Arguments } from 'yargs'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { CliOption } from '../utils/options.mjs'

/**
 * Creates main CLI configuration with common options only
 * @returns Parsed CLI arguments
 */
export const createMainCLI = (): Arguments => {
    return yargs(hideBin(process.argv))
        .option(CliOption.NonInteractive, {
            alias: 'n',
            type: 'boolean',
            description: 'Run in non-interactive mode (requires all options to be provided via command line)',
            default: false
        })
        .option(CliOption.Processor, {
            alias: 'p',
            type: 'string',
            description: 'Processor to run (kaluza or microvesicles)'
        })
        .option(CliOption.InputDir, {
            alias: 'i',
            description: 'Input directory containing CSV files',
            type: 'string'
        })
        .option(CliOption.OutputDir, {
            alias: 'o',
            description: 'Output directory for processed CSV files',
            type: 'string'
        })
        .option(CliOption.DisableRename, {
            description: 'Do not rename processed files with DONE_ prefix',
            type: 'boolean',
            default: false
        })
        .option(CliOption.Verbose, {
            alias: 'v',
            description: 'Show detailed timing and processing information',
            type: 'boolean',
            default: false
        })
        .help()
        .alias('help', 'h')
        .version(false)
        .parseSync()
}
