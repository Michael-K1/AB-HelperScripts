import type { ProcessorConfig } from './types.mjs'
import type { Row } from '@fast-csv/parse'
import chalk from 'chalk'
import { logger } from '@/functions/utils/logger.mjs'
import { setInputFile, getOutputDir } from '@/functions/utils/options.mjs'
import { processFile } from '@/functions/csv.mjs'

/**
 * Processes files using the provided processor configuration
 */
export async function processFiles<T extends Row>(files: string[], config: ProcessorConfig<T>): Promise<void> {
    if (files.length === 0) {
        logger.warn('No files to process.')
        return
    }

    logger.timing.start('Main execution')

    try {
        for (const file of files) {
            setInputFile(file)
            logger.timing.start(file)
            logger.info(`Processing file: ${chalk.bold(file)}`)

            // Process the file using the csv module's processFile function
            if (!config.processRow) {
                logger.error('No Row Processor found!')
            }
            await processFile<T>(config.processRow, () =>
                config.finalizeAlignment ? config.finalizeAlignment() : Promise.resolve()
            )
        }

        // Run post-processing if defined
        if (config.postProcess) {
            await config.postProcess()
        }

        logger.timing.end('Main execution')
        logger.success(`Processing completed successfully`)
        logger.success(`Find the results in ${chalk.bold(getOutputDir())}`)
    } catch (error) {
        logger.error('An error occurred during processing:', error)
        throw error
    }
}
