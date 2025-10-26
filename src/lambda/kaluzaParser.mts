import type { kaluzaCSVInput, kaluzaAlignment, kaluzaFinalAnalysis } from '@/@types/kaluza.mjs'
import { createReadStream } from 'node:fs'
import { resolve } from 'node:path'
import * as csv from 'fast-csv'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import chalk from 'chalk'
import { getInputFiles, handleFileCompletion, writeCSV } from 'functions/csv.mjs'
import { logger, configureLogger } from 'functions/utils/logger.mjs'

// Main function to process files
const processFiles = async (
    dataSetFilter: string[],
    inputDir: string = 'input',
    inputFile: string,
    outputDir: string = 'output',
    shouldRename: boolean = true
) => {
    // Track when all files are processed for total timer

    const fileTimer = logger.timing.start(`Processing ${inputFile}`)
    logger.info(`Processing file: ${chalk.bold(inputFile)}`)
    // Process file logic will go here
    const kaluzaAligned: Record<string, kaluzaAlignment> = {}

    createReadStream(resolve(inputDir, inputFile))
        .pipe(
            csv.parse<kaluzaCSVInput, kaluzaCSVInput[]>({
                headers: true,
                delimiter: ';',
                trim: true
            })
        )
        .on('error', (error) => logger.error(`Error processing file ${chalk.bold(inputFile)}:`, error))
        .on('data', (row: kaluzaCSVInput) => {
            for (const element of dataSetFilter) if (row['Data Set'].includes(element)) return // skip iteration

            const [dataSet, ...timestamp] = row['Data Set'].split('-')

            const isAllRow = row['Gate'] === 'All'

            // Create the base entry if it doesn't exist yet
            if (!(dataSet in kaluzaAligned)) {
                kaluzaAligned[dataSet] = {
                    'Data Set': dataSet,
                    Gate: null,
                    '%Gated': null,
                    'X-Med': null,
                    'X-AMean': null,
                    'X-GMean': null,
                    'X-Med-all': null,
                    'X-AMean-all': null,
                    'X-GMean-all': null,
                    timestamp: timestamp.join('-')
                }
            }

            // Update with values based on row type (All or not)
            if (isAllRow) {
                // Update "All" metrics
                kaluzaAligned[dataSet]['X-Med-all'] = row['X-Med']
                kaluzaAligned[dataSet]['X-AMean-all'] = row['X-AMean']
                kaluzaAligned[dataSet]['X-GMean-all'] = row['X-GMean']
                return
            }
            // Only update regular metrics if they haven't been set yet
            kaluzaAligned[dataSet]['Gate'] = kaluzaAligned[dataSet]['Gate'] ?? row['%Gated']
            kaluzaAligned[dataSet]['%Gated'] = kaluzaAligned[dataSet]['%Gated'] ?? row['%Gated']
            kaluzaAligned[dataSet]['X-Med'] = kaluzaAligned[dataSet]['X-Med'] ?? row['X-Med']
            kaluzaAligned[dataSet]['X-AMean'] = kaluzaAligned[dataSet]['X-AMean'] ?? row['X-AMean']
            kaluzaAligned[dataSet]['X-GMean'] = kaluzaAligned[dataSet]['X-GMean'] ?? row['X-GMean']
        })
        .on('finish', () => {
            // First write the aligned data
            const alignedRows = Object.values(kaluzaAligned)
            writeCSV(outputDir, `aligned_${inputFile}`, alignedRows)

            logger.info(`Processing merged data for ${chalk.bold(inputFile)}...`)

            // Process the merged data inside the finish handler
            const analysisMap: Record<string, kaluzaFinalAnalysis> = {}

            for (const e of alignedRows) {
                // Merge logic for BAS and ADP rows
                const [antibody, stimulation, subject] = e['Data Set'].split('_')
                const key = `${antibody}_${subject}`

                const tmp: kaluzaFinalAnalysis = {
                    [`${stimulation}-%Gated`]: e['%Gated'],
                    [`${stimulation}-X-Med`]: e['X-Med'],
                    [`${stimulation}-X-AMean`]: e['X-AMean'],
                    [`${stimulation}-X-GMean`]: e['X-GMean'],
                    [`${stimulation}-X-Med-all`]: e['X-Med-all'],
                    [`${stimulation}-X-AMean-all`]: e['X-AMean-all'],
                    [`${stimulation}-X-GMean-all`]: e['X-GMean-all']
                }

                if (!(key in analysisMap)) {
                    // Merge BAS and ADP rows
                    analysisMap[key] = {
                        'Data Set': key,
                        ...tmp
                    }
                    continue
                }
                analysisMap[key] = {
                    ...analysisMap[key],
                    ...tmp
                }
            }

            // Write the merged data to CSV
            const finalRows = Object.values(analysisMap)
            if (finalRows.length === 0) {
                logger.warn(`No merged data to write for ${chalk.bold(inputFile)}`)
                return
            }
            writeCSV(outputDir, `merged_${inputFile}`, finalRows)
        })
        .on('close', async () => {
            // Use the refactored function to handle file completion
            await handleFileCompletion(inputFile, inputDir, shouldRename, fileTimer)
        })
}

const main = async () => {
    // Parse command line arguments using yargs
    const argv = yargs(hideBin(process.argv))
        .option('filter', {
            alias: 'f',
            description: 'Comma-separated list of dataset terms to filter out',
            type: 'string'
        })
        .option('input-dir', {
            alias: 'i',
            description: 'Input directory containing CSV files',
            type: 'string',
            default: 'input'
        })
        .option('output-dir', {
            alias: 'o',
            description: 'Output directory for processed CSV files',
            type: 'string',
            default: 'output'
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
        .help()
        .alias('help', 'h')
        .example('$0 --filter "bianco,Alexa"', 'Filter out datasets containing bianco or Alexa')
        .example('$0 -f "bianco,Alexa" -i custom-input -o custom-output', 'Use custom input/output directories')
        .version(false)
        .parseSync()

    // Convert the filter string to an array if provided
    const dataSetFilter = argv.filter ? argv.filter.split(',').map((item) => item.trim()) : []

    // Get input/output directories, rename option and verbose flag
    const inputDir = argv['input-dir'] as string
    const outputDir = argv['output-dir'] as string
    const shouldRename = !(argv['disable-rename'] as boolean)
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

    const mainTimer = logger.timing.start('Main execution')
    try {
        for (const file of inputFiles) await processFiles(dataSetFilter, inputDir, file, outputDir, shouldRename)

        logger.timing.end(mainTimer)
        logger.success(`Processing completed successfully`)
    } catch (error) {
        logger.error('An error occurred during processing:', error)
        process.exit(1)
    }
}

await main()
