import type { ProcessorConfig, ProcessorOptions } from './types.mjs'
import chalk from 'chalk'
import { logger } from '../utils/logger.mjs'
import { setInputFile } from '../utils/options.mjs'

/**
 * Processes files using the provided processor configuration
 */
export async function processFiles<T>(
    files: string[],
    config: ProcessorConfig<T>,
    options: ProcessorOptions
): Promise<void> {
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

            // Process file using the provided processor
            if (config.finalizeAlignment) {
                await config.finalizeAlignment()
            }
        }

        // Run post-processing if defined
        if (config.postProcess) {
            await config.postProcess()
        }

        logger.timing.end('Main execution')
        logger.success(`Processing completed successfully`)
        logger.success(`Find the results in ${chalk.bold(options.outputDir)}`)
    } catch (error) {
        logger.error('An error occurred during processing:', error)
        throw error
    }
}
