import type { Arguments } from 'yargs'
import type { ProcessorOptions } from './types.mjs'
import {
    CliOption,
    setInputDir,
    setOutputDir,
    setShouldRename,
    setDecimalPrecision,
    getInputDir,
    getOutputDir,
    getShouldRename,
    getDecimalPrecision,
    setDataSetFilter,
    getDataSetFilter,
    setVerbose,
    getVerbose
} from '../utils/options.mjs'

/**
 * Sets up common configuration from CLI arguments
 */
export function setupCommonConfig(argv: Arguments): ProcessorOptions {
    // Set singleton values
    setInputDir(argv[CliOption.InputDir] as string)
    setOutputDir(argv[CliOption.OutputDir] as string)
    setShouldRename(!(argv[CliOption.DisableRename] as boolean))
    setVerbose(argv[CliOption.Verbose] as boolean)

    // Handle decimal precision if provided
    if (CliOption.DecimalPrecision in argv) {
        setDecimalPrecision(argv[CliOption.DecimalPrecision] as number)
    }

    // Return consolidated options
    return {
        inputDir: getInputDir(),
        outputDir: getOutputDir(),
        disableRename: getShouldRename(),
        verbose: getVerbose(),
        [CliOption.DecimalPrecision]: getDecimalPrecision()
    }
}

/**
 * Sets up processor-specific configuration from CLI arguments
 */
export function setupAdditionalConfig(argv: Arguments, options: ProcessorOptions): ProcessorOptions {
    // Handle decimal precision if provided
    if (CliOption.DecimalPrecision in argv) {
        setDecimalPrecision(argv[CliOption.DecimalPrecision] as number)
        options[CliOption.DecimalPrecision] = getDecimalPrecision()
    }

    // Handle dataset filter if provided
    if (CliOption.Filter in argv && argv[CliOption.Filter]) {
        setDataSetFilter(argv[CliOption.Filter] as string)
        options.dataSetFilter = getDataSetFilter()
    }

    return options
}
