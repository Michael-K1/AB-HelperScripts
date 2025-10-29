import type { kaluzaCSVInput } from '@/@types/kaluza.mjs'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import chalk from 'chalk'
import { getInputFiles, processFile } from '@/functions/csv.mjs'
import { logger, configureLogger } from 'functions/utils/logger.mjs'
import { finalizeKaluzaAlignment, processKaluzaRow } from '@/functions/kaluza.mjs'
import {
    setInputDir,
    setOutputDir,
    setInputFile,
    setShouldRename,
    setDataSetFilter,
    getInputDir,
    getOutputDir,
    getShouldRename,
    CliOption
} from '@/functions/utils/options.mjs'

export const handler = async () => {
    // Parse command line arguments using yargs
    const argv = yargs(hideBin(process.argv))
        .option('filter', {
            alias: 'f',
            description: 'Comma-separated list of dataset terms to filter out',
            type: 'string'
        })
        .option(CliOption.InputDir, {
            alias: 'i',
            description: 'Input directory containing CSV files',
            type: 'string',
            default: 'input/kaluza'
        })
        .option(CliOption.OutputDir, {
            alias: 'o',
            description: 'Output directory for processed CSV files',
            type: 'string',
            default: 'output/kaluza'
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
        .example('$0 --filter "bianco,Alexa"', 'Filter out datasets containing bianco or Alexa')
        .example('$0 -f "bianco,Alexa" -i custom-input -o custom-output', 'Use custom input/output directories')
        .version(false)
        .parseSync()

    // Set options using singletons
    setInputDir(argv[CliOption.InputDir] as string)
    setOutputDir(argv[CliOption.OutputDir] as string)
    setShouldRename(!(argv[CliOption.DisableRename] as boolean))
    setDataSetFilter(argv.filter)

    const dataSetFilter = argv.filter ? argv.filter.split(',').map((item) => item.trim()) : []
    const inputDir = getInputDir()
    const outputDir = getOutputDir()
    const shouldRename = getShouldRename()

    const isVerbose = argv['verbose'] as boolean

    // Re-initialize logger with verbose setting
    configureLogger(isVerbose)

    logger.info(`${chalk.bold('Configuration:')}`)
    logger.info(
        `  • Filtering datasets containing: ${
            dataSetFilter.length > 0 ? chalk.yellow(dataSetFilter.join(', ')) : chalk.gray('none')
        }`
    )
    logger.info(`  • Input directory: ${chalk.cyan(inputDir)}`)
    logger.info(`  • Output directory: ${chalk.cyan(outputDir)}`)
    logger.info(`  • File renaming: ${shouldRename ? chalk.green('enabled') : chalk.yellow('disabled')}`)
    logger.info(`  • Verbose logging: ${isVerbose ? chalk.green('enabled') : chalk.gray('disabled')}`)

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
            // Process file logic here
            await processFile<kaluzaCSVInput>(processKaluzaRow, finalizeKaluzaAlignment)
        }

        logger.timing.end('Main execution')
        logger.success(`Processing completed successfully`)
        logger.success(`Find the results in ${chalk.bold(outputDir)}`)
    } catch (error) {
        logger.error('An error occurred during processing:', error)
        process.exit(1)
    }
}
