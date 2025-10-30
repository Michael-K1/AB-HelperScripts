import type { kaluzaCSVInput } from '@/@types/kaluza.mjs'
import type { ProcessorConfig } from '@/functions/core/types.mjs'
import type { Interface as ReadlineInterface } from 'node:readline/promises'
import chalk from 'chalk'
import { getInputFiles } from '@/functions/csv.mjs'
import { logger } from '@/functions/utils/logger.mjs'
import { finalizeKaluzaAlignment, processKaluzaRow } from '@/functions/kaluza.mjs'
import { CliOption, setDataSetFilter, getInputDir } from '@/functions/utils/options.mjs'
import { processFiles } from '@/functions/core/fileProcessor.mjs'

// Define processor configuration
export const processorConfig: ProcessorConfig<kaluzaCSVInput> = {
    name: 'kaluza',
    defaultInputDir: 'input/kaluza',
    defaultOutputDir: 'output/kaluza',
    processRow: processKaluzaRow,
    finalizeAlignment: finalizeKaluzaAlignment,

    // Handle interactive setup of processor-specific options
    setupOptions: async (rl: ReadlineInterface) => {
        // Ask for dataset filters with pretty formatting
        logger.info(chalk.bold('🔍 Dataset Filter Configuration:'))

        const filter = await rl.question(
            `${chalk.blue('[INFO] [Kaluza] 🏷️  Enter dataset terms to filter (comma-separated)')}${chalk.gray(' (leave empty for no filters): ')}`
        )

        // Set the filter in the singleton if provided
        if (filter.trim()) {
            setDataSetFilter(filter)
            const terms = filter.split(',').map((t) => t.trim())
            logger.info(`[Kaluza] ✓ Will filter datasets containing: ${chalk.yellow(terms.join(', '))}`)
        } else {
            logger.info(`[Kaluza] ⚠️  No dataset filters applied`)
        }
        logger.info(chalk.dim('─'.repeat(50)) + '\n')
    },

    // Handle non-interactive CLI options
    parseCliOptions: (argv: Record<string, unknown>) => {
        if (CliOption.Filter in argv) {
            setDataSetFilter(argv[CliOption.Filter] as string)
        }
    }
}

export const handler = async () => {
    try {
        // Get input files and process them
        const inputFiles = await getInputFiles(getInputDir())
        await processFiles(inputFiles, processorConfig)
    } catch (error) {
        logger.error(`[Kaluza] An error occurred:`, error)
        process.exit(1)
    }
}
