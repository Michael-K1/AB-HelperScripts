import type { Arguments } from 'yargs'
import type { ProcessorOptions } from './types.mjs'
import { CliOption, setInputDir, setOutputDir, setShouldRename, setDecimalPrecision } from '../utils/options.mjs'

/**
 * Sets up common configuration from CLI arguments
 */
export function setupCommonConfig(argv: Arguments): ProcessorOptions {
    // Set singleton values
    setInputDir(argv[CliOption.InputDir] as string)
    setOutputDir(argv[CliOption.OutputDir] as string)
    setShouldRename(!(argv[CliOption.DisableRename] as boolean))

    // Handle decimal precision if provided
    if (CliOption.DecimalPrecision in argv) {
        setDecimalPrecision(argv[CliOption.DecimalPrecision] as number)
    }

    // Return consolidated options
    return {
        inputDir: argv[CliOption.InputDir] as string,
        outputDir: argv[CliOption.OutputDir] as string,
        disableRename: argv[CliOption.DisableRename] as boolean,
        verbose: argv[CliOption.Verbose] as boolean
    }
}
