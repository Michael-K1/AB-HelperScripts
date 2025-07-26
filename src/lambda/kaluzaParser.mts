import type { kaluzaCSVHeader, kaluzaAnalysis } from '@/types/kaluza.mjs'
import { createReadStream, createWriteStream } from 'node:fs'
import { resolve, join } from 'node:path'
import { readdir, rename } from 'node:fs/promises'
import * as csv from 'fast-csv'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

//TODO read csv from input folder //! filter those that start wit DONE_XXXX
// filter from dataset those that contains bianco e alexa //! should be input to the program
// write to output folder
// rename original file to the new name to show it has been done already

// Function to get all files in the input directory that don't start with DONE_
const getInputFiles = async (inputDir: string): Promise<string[]> => {
    try {
        const files = await readdir(resolve(inputDir))
        const result = files.filter((file) => !file.startsWith('DONE_'))
        console.log(`Files that need processing: ${result.length}`)
        return result
    } catch (error) {
        console.error(`Error reading input directory ${inputDir}:`, error)
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
    const inputFiles = await getInputFiles(inputDir)
    if (inputFiles.length === 0) {
        console.log('No files to process.')
        return
    }

    for (const file of inputFiles) {
        console.log(`Processing file: ${file}`)
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
            .on('error', (error) => console.error(`Error processing file ${file}:`, error))
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

                for (const element of Object.values(kaluzaAnalysis)) {
                    csvStream.write(element)
                }
                csvStream.end()
            })
            .on('close', () => {
                // Rename the original file to mark it as processed if shouldRename is true
                if (shouldRename) {
                    rename(join(inputDir, file), join(inputDir, `DONE_${file}`))
                        .then(() => console.log(`Renamed ${file} to DONE_${file}`))
                        .catch((err) => console.error(`Failed to rename ${file}:`, err))
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
        .help()
        .alias('help', 'h')
        .example('$0 --filter "bianco,Alexa"', 'Filter out datasets containing bianco or Alexa')
        .example('$0 -f "bianco,Alexa" -i custom-input -o custom-output', 'Use custom input/output directories')
        .version(false)
        .parseSync()

    // Convert the filter string to an array if provided
    const dataSetFilter = argv.filter ? argv.filter.split(',').map((item) => item.trim()) : []

    // Get input/output directories and rename option
    const inputDir = argv['input-dir'] as string
    const outputDir = argv['output-dir'] as string
    const shouldRename = !(argv['disable-rename'] as boolean)

    console.log(`Filtering out datasets containing: ${dataSetFilter.length > 0 ? dataSetFilter.join(', ') : 'none'}`)
    console.log(`Input directory: ${inputDir}`)
    console.log(`Output directory: ${outputDir}`)
    console.log(`Will ${shouldRename ? '' : 'not '}rename processed files`)

    try {
        await processFiles(dataSetFilter, inputDir, outputDir, shouldRename)
    } catch (error) {
        console.error('An error occurred during processing:', error)
    }
}

await main()
