import { createReadStream, createWriteStream, existsSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { readdir, rename } from 'node:fs/promises'
import chalk from 'chalk'
import { format } from 'fast-csv'
import * as csv from 'fast-csv'
import { Row } from '@fast-csv/parse'
import { logger } from 'functions/utils/logger.mjs'
import { getShouldRename, getInputDir, getInputFile } from '@/functions/utils/options.mjs'

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

export const writeCSV = (outputDir: string, file: string, analisys: unknown[]): Promise<void> => {
    return new Promise((resolve, reject) => {
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

        writeStream.on('error', reject)
        writeStream.on('finish', resolve)

        csvStream.pipe(writeStream)

        const entriesCount = analisys.length
        logger.info(`Writing ${chalk.bold(entriesCount)} entries to ${chalk.bold(file)}`)

        for (const element of analisys) {
            csvStream.write(element)
        }

        csvStream.end()
    })
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

export const processFile = async <T extends Row>(
    rowProcessor: (row: T) => void,
    finalizer: () => void | Promise<void>
): Promise<void> => {
    return new Promise((resolve, reject) => {
        createReadStream(join(getInputDir(), getInputFile()))
            .pipe(
                csv.parse<T, T[]>({
                    headers: true,
                    delimiter: ';',
                    trim: true
                })
            )
            .on('error', (error: unknown) => {
                logger.error(`Error processing file ${chalk.bold(getInputFile())}:`, error)
                reject(error)
            })
            .on('data', rowProcessor)
            .on('end', async () => {
                try {
                    await Promise.resolve(finalizer())
                    await handleFileCompletion(getInputFile(), getInputDir())
                    resolve()
                } catch (error) {
                    reject(error)
                }
            })
    })
}
