import type { MicrovesiclesCSVInput } from '@/@types/microvesicles.mjs'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import chalk from 'chalk'
import { getInputFiles, processFile } from '@/functions/csv.mjs'
import { logger, configureLogger } from 'functions/utils/logger.mjs'
import { finalizeMicrovesiclesAlignment, mergeSubjects, processVesiclesRow } from '@/functions/microvesicles.mjs'
import {
    setInputDir,
    setOutputDir,
    setInputFile,
    setShouldRename,
    setDecimalPrecision,
    getOutputDir,
    getInputDir,
    getShouldRename,
    getDecimalPrecision
} from '@/functions/utils/options.mjs'

export const handler = async () => {
    // Parse command line arguments using yargs
    const argv = yargs(hideBin(process.argv))
        .option('input-dir', {
            alias: 'i',
            description: 'Input directory containing CSV files',
            type: 'string',
            default: 'input/microvesicles'
        })
        .option('output-dir', {
            alias: 'o',
            description: 'Output directory for processed CSV files',
            type: 'string',
            default: 'output/microvesicles'
        })
        .option('disable-rename', {
            description: 'Do not rename processed files with DONE_ prefix',
            type: 'boolean',
            default: false
        })
        .option('verbose', {
            alias: 'v',
            description: 'Show detailed timing and processing information',
            type: 'boolean',
            default: false
        })
        .option('decimal-precision', {
            alias: 'dp',
            description: 'Number of decimal places for numeric values',
            type: 'number',
            default: 3
        })
        .help()
        .alias('help', 'h')
        .example('$0 --filter "bianco,Alexa"', 'Filter out datasets containing bianco or Alexa')
        .example('$0 -f "bianco,Alexa" -i custom-input -o custom-output', 'Use custom input/output directories')
        .version(false)
        .parseSync()

    // Get input/output directories, rename option and verbose flag
    setInputDir(argv['input-dir'] as string)
    setOutputDir(argv['output-dir'] as string)
    setShouldRename(!(argv['disable-rename'] as boolean))
    setDecimalPrecision(argv['decimal-precision'] as number)

    const inputDir = getInputDir()
    const outputDir = getOutputDir()
    const shouldRename = getShouldRename()
    const isVerbose = argv['verbose'] as boolean
    const decimalPrecision = getDecimalPrecision()

    // Re-initialize logger with verbose setting
    configureLogger(isVerbose)

    logger.info(`${chalk.bold('Configuration:')}`)

    logger.info(`  • Input directory: ${chalk.cyan()}`)
    logger.info(`  • Output directory: ${chalk.cyan(outputDir)}`)
    logger.info(`  • File renaming: ${shouldRename ? chalk.green('enabled') : chalk.yellow('disabled')}`)
    logger.info(`  • Verbose logging: ${isVerbose ? chalk.green('enabled') : chalk.gray('disabled')}`)
    logger.info(`  • Decimal precision: ${chalk.cyan(decimalPrecision)}`)

    const inputFiles = await getInputFiles(inputDir)

    if (inputFiles.length === 0) {
        logger.warn('No files to process.')
        return
    }

    logger.timing.start('Main execution')
    try {
        for (const file of inputFiles) {
            setInputFile(file)

            logger.timing.start(file)
            logger.info(`Processing file: ${chalk.bold(file)}`)
            // Process file logic will go here
            await processFile<MicrovesiclesCSVInput>(processVesiclesRow, finalizeMicrovesiclesAlignment)
        }
        await mergeSubjects()
        logger.timing.end('Main execution')
        logger.success(`Processing completed successfully`)
        logger.success(`Find the results in ${chalk.bold(outputDir)}`)
    } catch (error) {
        logger.error('An error occurred during processing:', error)
        process.exit(1)
    }
}
