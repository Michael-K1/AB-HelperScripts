import type { MicrovesiclesCSVInput } from '@/@types/microvesicles.mjs'
import type { ProcessorConfig } from '@/functions/core/types.mjs'
import type { Interface as ReadlineInterface } from 'node:readline/promises'
import chalk from 'chalk'
import { getInputFiles } from '@/functions/csv.mjs'
import { logger } from '@/functions/utils/logger.mjs'
import { finalizeMicrovesiclesAlignment, mergeSubjects, processVesiclesRow } from '@/functions/microvesicles.mjs'
import { CliOption, getInputDir, setDecimalPrecision } from '@/functions/utils/options.mjs'
import { processFiles } from '@/functions/core/fileProcessor.mjs'

// Define processor configuration
export const processorConfig: ProcessorConfig<MicrovesiclesCSVInput> = {
    name: 'microvesicles',
    defaultInputDir: 'input/microvesicles',
    defaultOutputDir: 'output/microvesicles',
    processRow: processVesiclesRow,
    finalizeAlignment: finalizeMicrovesiclesAlignment,
    postProcess: mergeSubjects,

    // Handle interactive setup of processor-specific options
    setupOptions: async (rl: ReadlineInterface) => {
        // Ask for decimal precision with pretty formatting
        logger.info(chalk.bold('🔢 Decimal Precision Configuration:'))

        const answer = await rl.question(
            chalk.blue('[INFO] 🎯 Enter decimal precision for numeric values') + chalk.gray(' (default: 3): ')
        )

        // Parse and validate the decimal precision
        const precision = parseInt(answer)
        if (!answer || isNaN(precision)) {
            logger.info('⚠️  Using default precision: 3')
            setDecimalPrecision(3)
        } else {
            setDecimalPrecision(precision)
            logger.info(`✓ Set decimal precision to: ${chalk.yellow(precision)}`)
        }
        logger.info(chalk.dim('─'.repeat(50)) + '\n')
    },

    // Handle non-interactive CLI options
    parseCliOptions: (argv: Record<string, unknown>) => {
        if (CliOption.DecimalPrecision in argv) {
            setDecimalPrecision(argv[CliOption.DecimalPrecision] as number)
        }
    }
}

export const handler = async () => {
    try {
        // Get input files and process them
        const inputFiles = await getInputFiles(getInputDir())
        await processFiles(inputFiles, processorConfig)
    } catch (error) {
        logger.error('An error occurred:', error)
        process.exit(1)
    }
}
