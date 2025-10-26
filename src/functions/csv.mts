import { createReadStream, createWriteStream, existsSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { readdir, rename } from 'node:fs/promises'
import chalk from 'chalk'
import { format } from 'fast-csv'
import { DateTime } from 'luxon'
import * as csv from 'fast-csv'
import { Row } from '@fast-csv/parse'
import { logger } from 'functions/utils/logger.mjs'

export const getInputFiles = async (inputDir: string): Promise<string[]> => {
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

export const writeCSV = (outputDir: string, file: string, analisys: unknown[]) => {
    // Check if output directory exists, create it if it doesn't
    if (!existsSync(outputDir)) {
        logger.info(`Creating output directory: ${chalk.cyan(outputDir)}`)
        mkdirSync(outputDir, { recursive: true })
    }

    logger.info(`Writing ${chalk.bold(analisys.length)} merged rows to CSV`)
    const csvStream = format({
        headers: true,
        delimiter: ';'
    })
    const outputFilePath = join(outputDir, file)
    const writeStream = createWriteStream(outputFilePath)
    csvStream.pipe(writeStream)

    const entriesCount = analisys.length
    logger.info(`Writing ${chalk.bold(entriesCount)} entries to ${chalk.bold(file)}`)

    for (const element of analisys) csvStream.write(element)

    csvStream.end()
}

/**
 * Handle file completion, renaming, and timing
 *
 * @param file File being processed
 * @param inputDir Input directory path
 * @param shouldRename Whether to rename processed files
 * @param fileTimer Timer for file processing
 * @param totalTimer Total timer for all processing
 * @param filesProcessed Number of files processed so far
 * @param totalFiles Total number of files to process
 * @returns Updated count of processed files
 */
export const handleFileCompletion = async (file: string, inputDir: string) => {
    // Rename the file if needed
    if (getShouldRename()) {
        try {
            await rename(join(inputDir, file), join(inputDir, `DONE_${file}`))
            logger.success(`Renamed ${chalk.bold(file)} to ${chalk.bold(`DONE_${file}`)}`)
        } catch (err) {
            logger.error(`Failed to rename ${chalk.bold(file)}:`, err)
        }
    }

    // End the file timer
    logger.timing.end(file)

    // Check if all files are processed and end the total timer if so
}

let _inputDir = 'input'
export const setInputDir = (dir?: string) => {
    _inputDir = dir ?? 'input'
}
export const getInputDir = (): string => _inputDir

let _outputDir = 'output'
export const setOutputDir = (dir?: string) => {
    _outputDir = dir ?? 'output'
}
export const getOutputDir = (): string => _outputDir

let _inputFile = `${DateTime.now().toISO()}`
export const setInputFile = (file: string) => {
    _inputFile = file
}
export const getInputFile = (): string => _inputFile

let _shouldRename = true
export const setShouldRename = (value: boolean) => {
    _shouldRename = value
}
export const getShouldRename = (): boolean => _shouldRename
export const processFile = async <T extends Row>(rowProcessor: (row: T) => void, finalizer: () => void) =>
    createReadStream(resolve(getInputDir(), getInputFile()))
        .pipe(
            csv.parse<T, T[]>({
                headers: true,
                delimiter: ';',
                trim: true
            })
        )
        .on('error', (error: unknown) => logger.error(`Error processing file ${chalk.bold(getInputFile())}:`, error))
        .on('data', rowProcessor)
        .on('finish', finalizer)
        .on('close', async () => {
            // Use the refactored function to handle file completion
            await handleFileCompletion(getInputFile(), getInputDir())
        })
