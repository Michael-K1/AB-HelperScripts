import type { MicrovesiclesCSVInput } from '@/@types/microvesicles.mjs'
import type { ProcessorConfig } from '@/functions/core/types.mjs'
import { getInputFiles } from '@/functions/csv.mjs'
import { logger } from '@/functions/utils/logger.mjs'
import { finalizeMicrovesiclesAlignment, mergeSubjects, processVesiclesRow } from '@/functions/microvesicles.mjs'
import { CliOption } from '@/functions/utils/options.mjs'
import { createProcessorCLI } from '@/functions/core/cli.mjs'
import { setupCommonConfig } from '@/functions/core/config.mjs'
import { displayConfiguration } from '@/functions/core/display.mjs'
import { processFiles } from '@/functions/core/fileProcessor.mjs'

// Define processor-specific CLI options
const additionalOptions = {
    [CliOption.DecimalPrecision]: {
        alias: 'dp',
        description: 'Number of decimal places for numeric values',
        type: 'number',
        default: 3
    }
} as const

// Define processor configuration
const processorConfig: ProcessorConfig<MicrovesiclesCSVInput> = {
    name: 'microvesicles',
    inputDirDefault: 'input/microvesicles',
    outputDirDefault: 'output/microvesicles',
    additionalOptions,
    processRow: processVesiclesRow,
    finalizeAlignment: finalizeMicrovesiclesAlignment,
    postProcess: mergeSubjects
}

// Define interface for microvesicles-specific arguments
interface MicrovesiclesArgs extends Record<string, unknown> {
    [CliOption.InputDir]: string
    [CliOption.OutputDir]: string
    [CliOption.DisableRename]: boolean
    [CliOption.Verbose]: boolean
    [CliOption.DecimalPrecision]: number
}

export const handler = async () => {
    try {
        // Parse CLI arguments with type safety
        const argv = createProcessorCLI<MicrovesiclesArgs>(processorConfig)

        // Setup configuration
        const options = setupCommonConfig(argv)

        // Display configuration with processor-specific options
        displayConfiguration(options, {
            processorName: processorConfig.name,
            additionalConfig: {
                'Decimal precision': options[CliOption.DecimalPrecision]
            }
        })

        // Get input files and process them
        const inputFiles = await getInputFiles(options.inputDir)
        await processFiles(inputFiles, processorConfig, options)
    } catch (error) {
        logger.error('An error occurred:', error)
        process.exit(1)
    }
}
