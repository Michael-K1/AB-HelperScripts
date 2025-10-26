import { createWriteStream, existsSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { readdir, rename } from 'node:fs/promises'
import chalk from 'chalk'
import { format } from 'fast-csv'
import { DateTime } from 'luxon'
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
export const handleFileCompletion = async (
    file: string,
    inputDir: string,
    shouldRename: boolean,
    fileTimer: { label: string; startTime: DateTime }
) => {
    // Rename the file if needed
    if (shouldRename) {
        try {
            await rename(join(inputDir, file), join(inputDir, `DONE_${file}`))
            logger.success(`Renamed ${chalk.bold(file)} to ${chalk.bold(`DONE_${file}`)}`)
        } catch (err) {
            logger.error(`Failed to rename ${chalk.bold(file)}:`, err)
        }
    }

    // End the file timer
    logger.timing.end(fileTimer)

    // Check if all files are processed and end the total timer if so
}
