import type { Arguments, Argv, Options } from 'yargs'
import type { ProcessorCliConfig } from './types.mjs'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { CliOption } from '../utils/options.mjs'

/**
 * Creates base CLI configuration with common options
 * @param config Processor configuration
 * @returns Configured yargs instance with common options
 */
export const createBaseCLI = (config: ProcessorCliConfig): Argv =>
    yargs(hideBin(process.argv))
        .option(CliOption.InputDir, {
            alias: 'i',
            description: 'Input directory containing CSV files',
            type: 'string',
            default: config.inputDirDefault
        })
        .option(CliOption.OutputDir, {
            alias: 'o',
            description: 'Output directory for processed CSV files',
            type: 'string',
            default: config.outputDirDefault
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

/**
 * Extends CLI with processor-specific options
 * @param cli Base yargs instance
 * @param additionalOptions Processor-specific options
 * @returns Extended yargs instance
 */
export const extendCLI = (cli: Argv, additionalOptions?: Record<string, Options>): Argv => {
    if (!additionalOptions) {
        return cli
    }

    Object.entries(additionalOptions).forEach(([key, option]) => {
        cli.option(key, option)
    })

    return cli
}

/**
 * Type-safe wrapper for parsing CLI arguments
 * @param cli Configured yargs instance
 * @returns Parsed arguments with proper types
 */
export const parseArguments = <T extends Record<string, unknown>>(cli: Argv): Arguments<T> =>
    cli.parseSync() as Arguments<T>

/**
 * Creates a complete CLI setup for a processor
 * @param config Processor configuration
 * @returns Parsed CLI arguments with proper typing
 */
export const createProcessorCLI = <T extends Record<string, unknown>>(config: ProcessorCliConfig): Arguments<T> => {
    const baseCli = createBaseCLI(config)
    const extendedCli = extendCLI(baseCli, config.additionalOptions)
    return parseArguments<T>(extendedCli)
}
