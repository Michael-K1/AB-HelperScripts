import type { kaluzaCSVInput, kaluzaAlignment, kaluzaFinalAnalysis } from '@/types/kaluza.mjs'
import { createReadStream } from 'node:fs'
import { resolve } from 'node:path'
import * as csv from 'fast-csv'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import chalk from 'chalk'
import { getInputFiles, handleFileCompletion, writeCSV } from '@/functions/csv.mjs'
import { logger, configureLogger } from 'functions/utils/logger.mjs'

//TODO read csv from input folder //! filter those that start wit DONE_XXXX
// filter from dataset those that contains bianco e alexa //! should be input to the program
// write to output folder
// rename original file to the new name to show it has been done already

// Function to get all files in the input directory that don't start with DONE_

// Main function to process files
const processFiles = async (
    dataSetFilter: string[],
    inputDir: string = 'input',
    outputDir: string = 'output',
    shouldRename: boolean = true
) => {
    const totalTimer = logger.timing.start('Total processing time')

    const inputFiles = await getInputFiles(inputDir)

    if (inputFiles.length === 0) {
        logger.warn('No files to process.')
        logger.timing.end(totalTimer)
        return
    }

    // Track when all files are processed for total timer
    let filesProcessed = 0

    for (const file of inputFiles) {
        const fileTimer = logger.timing.start(`Processing ${file}`)
        logger.info(`Processing file: ${chalk.bold(file)}`)
        // Process file logic will go here
        const kaluzaAligned: Record<string, kaluzaAlignment> = {}

        createReadStream(resolve(inputDir, file))
            .pipe(
                csv.parse<kaluzaCSVInput, kaluzaCSVInput[]>({
                    headers: true,
                    delimiter: ';',
                    trim: true
                })
            )
            .on('error', (error) => logger.error(`Error processing file ${chalk.bold(file)}:`, error))
            .on('data', (row: kaluzaCSVInput) => {
                for (const element of dataSetFilter)
                    if (row['Data Set'].includes(element))
                        // skip iteration
                        return

                const [dataSet, ...timestamp] = row['Data Set'].split('-')

                const isAllRow = row['Gate'] === 'All'

                if (!(dataSet in kaluzaAligned)) {
                    kaluzaAligned[dataSet] = {
                        'Data Set': dataSet,
                        Gate: isAllRow ? null : row['%Gated'],
                        '%Gated': isAllRow ? null : row['%Gated'],

                        'X-Med': isAllRow ? null : row['X-Med'],
                        'X-AMean': isAllRow ? null : row['X-AMean'],
                        'X-GMean': isAllRow ? null : row['X-GMean'],

                        'X-Med-all': isAllRow ? row['X-Med'] : null,
                        'X-AMean-all': isAllRow ? row['X-AMean'] : null,
                        'X-GMean-all': isAllRow ? row['X-GMean'] : null,
                        timestamp: timestamp.join('-')
                    }
                    return
                }

                kaluzaAligned[dataSet] = {
                    ...kaluzaAligned[dataSet],
                    Gate: kaluzaAligned[dataSet]['%Gated'] ?? row['Gate'],
                    '%Gated': kaluzaAligned[dataSet]['%Gated'] ?? row['%Gated'],

                    'X-Med': kaluzaAligned[dataSet]['X-Med'] ?? row['X-Med'],
                    'X-AMean': kaluzaAligned[dataSet]['X-AMean'] ?? row['X-AMean'],
                    'X-GMean': kaluzaAligned[dataSet]['X-GMean'] ?? row['X-GMean'],

                    'X-Med-all': kaluzaAligned[dataSet]['X-Med-all'] ?? row['X-Med'],
                    'X-AMean-all': kaluzaAligned[dataSet]['X-AMean-all'] ?? row['X-AMean'],
                    'X-GMean-all': kaluzaAligned[dataSet]['X-GMean-all'] ?? row['X-GMean']
                }
            })
            .on('finish', () => {
                // First write the aligned data
                writeCSV(outputDir, `aligned_${file}`, Object.values(kaluzaAligned))

                //TODO: for each aligned, merge 2 rows to be a longer one with bas and ADP
                logger.info(`Processing merged data for ${chalk.bold(file)}...`)

                // Process the merged data inside the finish handler
                const alignedRows = Object.values(kaluzaAligned)
                const finalRows: Record<string, kaluzaFinalAnalysis> = {}

                for (const e of alignedRows) {
                    // Merge logic for BAS and ADP rows
                    const [antibody, stimulation, subject] = e['Data Set'].split('|') as string[]
                    const key = `${antibody}|${subject}`

                    const tmp: kaluzaFinalAnalysis = {
                        [`${stimulation}-%Gated`]: e['%Gated'],
                        [`${stimulation}-X-Med`]: e['X-Med'],
                        [`${stimulation}-X-AMean`]: e['X-AMean'],
                        [`${stimulation}-X-GMean`]: e['X-GMean'],
                        [`${stimulation}-X-Med-all`]: e['X-Med-all'],
                        [`${stimulation}-X-AMean-all`]: e['X-AMean-all'],
                        [`${stimulation}-X-GMean-all`]: e['X-GMean-all']
                    }

                    if (!(key in finalRows)) {
                        // Merge BAS and ADP rows
                        finalRows[key] = {
                            'Data Set': key,
                            ...tmp
                        }
                        continue
                    }
                    finalRows[key] = {
                        ...finalRows[key],
                        ...tmp
                    }
                }

                // Write the merged data to CSV
                if (Object.keys(finalRows).length > 0) {
                    logger.info(`Writing ${chalk.bold(Object.keys(finalRows).length)} merged rows to CSV`)
                    writeCSV(outputDir, `merged_${file}`, Object.values(finalRows))
                } else {
                    logger.warn(`No merged data to write for ${chalk.bold(file)}`)
                }
            })
            .on('close', async () => {
                // Use the refactored function to handle file completion
                filesProcessed = await handleFileCompletion(
                    file,
                    inputDir,
                    shouldRename,
                    fileTimer,
                    totalTimer,
                    filesProcessed,
                    inputFiles.length
                )
            })
    }
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

    try {
        const mainTimer = logger.timing.start('Main execution')
        await processFiles(dataSetFilter, inputDir, outputDir, shouldRename)
        logger.timing.end(mainTimer)
        logger.success(`Processing completed successfully`)
    } catch (error) {
        logger.error('An error occurred during processing:', error)
        process.exit(1)
    }
}

await main()
