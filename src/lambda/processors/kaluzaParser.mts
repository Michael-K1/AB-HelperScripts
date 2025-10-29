import type { kaluzaCSVInput } from '@/@types/kaluza.mjs'
import type { ProcessorConfig } from '@/functions/core/types.mjs'
import { getInputFiles } from '@/functions/csv.mjs'
import { logger } from '@/functions/utils/logger.mjs'
import { finalizeKaluzaAlignment, processKaluzaRow } from '@/functions/kaluza.mjs'
import { CliOption } from '@/functions/utils/options.mjs'
import { createProcessorCLI } from '@/functions/core/cli.mjs'
import { setupCommonConfig } from '@/functions/core/config.mjs'
import { displayConfiguration } from '@/functions/core/display.mjs'
import { processFiles } from '@/functions/core/fileProcessor.mjs'

// Define processor-specific CLI options
const additionalOptions = {
    filter: {
        alias: 'f',
        description: 'Comma-separated list of dataset terms to filter out',
        type: 'string'
    }
} as const

// Define processor configuration
const processorConfig: ProcessorConfig<kaluzaCSVInput> = {
    name: 'kaluza',
    inputDirDefault: 'input/kaluza',
    outputDirDefault: 'output/kaluza',
    additionalOptions,
    processRow: processKaluzaRow,
    finalizeAlignment: finalizeKaluzaAlignment
}

// Define interface for kaluza-specific arguments
interface KaluzaArgs extends Record<string, unknown> {
    [CliOption.InputDir]: string
    [CliOption.OutputDir]: string
    [CliOption.DisableRename]: boolean
    [CliOption.Verbose]: boolean
    filter?: string
}

export const handler = async () => {
    try {
        // Parse CLI arguments with type safety
        const argv = createProcessorCLI<KaluzaArgs>(processorConfig)

        // Setup configuration
        const options = setupCommonConfig(argv)

        // Process filter option
        const dataSetFilter = argv.filter?.split(',').map((item) => item.trim()) ?? []

        // Display configuration with processor-specific options
        displayConfiguration(options, {
            processorName: processorConfig.name,
            additionalConfig: {
                'Dataset filters': dataSetFilter
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
