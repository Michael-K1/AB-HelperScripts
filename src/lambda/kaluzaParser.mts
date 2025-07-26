import type { kaluzaCSVHeader, kaluzaAnalysis } from '@/types/kaluza.mjs'
import { createReadStream, createWriteStream, existsSync, mkdirSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { readdir, rename } from 'node:fs/promises'
import * as csv from 'fast-csv'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import chalk from 'chalk'

//TODO read csv from input folder //! filter those that start wit DONE_XXXX
// filter from dataset those that contains bianco e alexa //! should be input to the program
// write to output folder
// rename original file to the new name to show it has been done already

// Logger utility functions with verbose control
const createLogger = (verbose: boolean = false) => {
    return {
        info: (message: string) => console.log(chalk.blue(`[INFO] ${message}`)),
        success: (message: string) => console.log(chalk.green(`[SUCCESS] ${message}`)),
        warn: (message: string) => console.log(chalk.yellow(`[WARNING] ${message}`)),
        error: (message: string, error?: unknown) =>
            console.error(
                chalk.red(`[ERROR] ${message}`),
                error ? chalk.red(error instanceof Error ? error.message : String(error)) : ''
            ),
        verbose: (message: string) => {
            if (verbose) {
                console.log(chalk.gray(`[VERBOSE] ${message}`))
            }
        },
        timing: {
            start: (label: string) => {
                if (verbose || label.includes('Total') || label === 'Main execution') {
                    console.time(chalk.cyan(`⏱️ [TIMING] ${label}`))
                }
                return { label, startTime: Date.now() }
            },
            end: (timer: { label: string; startTime: number }) => {
                if (verbose || timer.label.includes('Total') || timer.label === 'Main execution') {
                    console.timeEnd(chalk.cyan(`⏱️ [TIMING] ${timer.label}`))
                } else if (timer.label.startsWith('Processing')) {
                    // For non-verbose mode, collect timing data without displaying
                    const elapsed = Date.now() - timer.startTime
                    logger.verbose(`${timer.label} completed in ${elapsed}ms`)
                }
            }
        }
    }
}

// Initialize with default (non-verbose)
let logger = createLogger(false)

// Function to get all files in the input directory that don't start with DONE_
const getInputFiles = async (inputDir: string): Promise<string[]> => {
    // Check if input directory exists
    if (!existsSync(inputDir)) {
        logger.error(`Input directory ${chalk.italic(inputDir)} does not exist`)
        return []
    }

    try {
        const files = await readdir(resolve(inputDir))
        const result = files.filter((file) => !file.startsWith('DONE_'))
        logger.info(`Found ${chalk.bold(result.length)} files that need processing`)
        return result
    } catch (error) {
        logger.error(`Error reading input directory ${chalk.italic(inputDir)}:`, error)
        return []
    }
}

// Main function to process files
const processFiles = async (
    dataSetFilter: string[],
    inputDir: string = 'input',
    outputDir: string = 'output',
    shouldRename: boolean = true
) => {
    const totalTimer = logger.timing.start('Total processing time')

    // Check if output directory exists, create it if it doesn't
    if (!existsSync(outputDir)) {
        logger.info(`Creating output directory: ${chalk.cyan(outputDir)}`)
        mkdirSync(outputDir, { recursive: true })
    }

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
        const kaluzaAnalysis: Record<string, kaluzaAnalysis> = {}

        createReadStream(resolve(inputDir, file))
            .pipe(
                csv.parse<kaluzaCSVHeader, kaluzaCSVHeader[]>({
                    headers: true,
                    delimiter: ';',
                    trim: true
                })
            )
            .on('error', (error) => logger.error(`Error processing file ${chalk.bold(file)}:`, error))
            .on('data', (row: kaluzaCSVHeader) => {
                for (const element of dataSetFilter)
                    if (row['Data Set'].includes(element))
                        // skip iteration
                        return

                const [dataSet, ...timestamp] = row['Data Set'].split('-')

                const isAllRow = row['Gate'] === 'All'

                if (!(dataSet in kaluzaAnalysis)) {
                    kaluzaAnalysis[dataSet] = {
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

                kaluzaAnalysis[dataSet] = {
                    ...kaluzaAnalysis[dataSet],
                    Gate: kaluzaAnalysis[dataSet]['%Gated'] ?? row['Gate'],
                    '%Gated': kaluzaAnalysis[dataSet]['%Gated'] ?? row['%Gated'],

                    'X-Med': kaluzaAnalysis[dataSet]['X-Med'] ?? row['X-Med'],
                    'X-AMean': kaluzaAnalysis[dataSet]['X-AMean'] ?? row['X-AMean'],
                    'X-GMean': kaluzaAnalysis[dataSet]['X-GMean'] ?? row['X-GMean'],

                    'X-Med-all': kaluzaAnalysis[dataSet]['X-Med-all'] ?? row['X-Med'],
                    'X-AMean-all': kaluzaAnalysis[dataSet]['X-AMean-all'] ?? row['X-AMean'],
                    'X-GMean-all': kaluzaAnalysis[dataSet]['X-GMean-all'] ?? row['X-GMean']
                }
            })
            .on('finish', () => {
                const csvStream = csv.format({
                    headers: true,
                    delimiter: ';'
                })
                const outputFilePath = join(outputDir, `processed_${file}`)
                const writeStream = createWriteStream(outputFilePath)
                csvStream.pipe(writeStream)

                const entriesCount = Object.values(kaluzaAnalysis).length
                logger.info(`Writing ${chalk.bold(entriesCount)} entries to ${chalk.bold(`processed_${file}`)}`)

                for (const element of Object.values(kaluzaAnalysis)) {
                    csvStream.write(element)
                }
                csvStream.end()
            })
            .on('close', () => {
                // Rename the original file to mark it as processed if shouldRename is true
                if (shouldRename) {
                    rename(join(inputDir, file), join(inputDir, `DONE_${file}`))
                        .then(() => {
                            logger.success(`Renamed ${chalk.bold(file)} to ${chalk.bold(`DONE_${file}`)}`)
                            logger.timing.end(fileTimer)

                            // Check if this is the last file to process
                            filesProcessed++
                            if (filesProcessed === inputFiles.length) {
                                logger.timing.end(totalTimer)
                            }
                        })
                        .catch((err) => logger.error(`Failed to rename ${chalk.bold(file)}:`, err))
                } else {
                    logger.timing.end(fileTimer)

                    // Check if this is the last file to process
                    filesProcessed++
                    if (filesProcessed === inputFiles.length) {
                        logger.timing.end(totalTimer)
                    }
                }
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
    logger = createLogger(isVerbose)

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
