import type { ProcessorOptions } from './types.mjs'
import chalk from 'chalk'
import { logger } from '../utils/logger.mjs'

export interface DisplayConfig {
    processorName: string
    additionalConfig?: Record<string, unknown>
}

/**
 * Displays processor configuration in a consistent format
 */
export function displayConfiguration(options: ProcessorOptions, config: DisplayConfig) {
    logger.info(`${chalk.bold('Configuration:')}`)

    // Always show common options
    logger.info(`  • Input directory: ${chalk.cyan(options.inputDir)}`)
    logger.info(`  • Output directory: ${chalk.cyan(options.outputDir)}`)
    logger.info(`  • File renaming: ${options.disableRename ? chalk.yellow('disabled') : chalk.green('enabled')}`)
    logger.info(`  • Verbose logging: ${options.verbose ? chalk.green('enabled') : chalk.gray('disabled')}`)

    // Show additional configuration if provided
    if (config.additionalConfig) {
        Object.entries(config.additionalConfig).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                logger.info(`  • ${key}: ${value.length > 0 ? chalk.yellow(value.join(', ')) : chalk.gray('none')}`)
            } else if (typeof value === 'number') {
                logger.info(`  • ${key}: ${chalk.cyan(value)}`)
            } else {
                logger.info(`  • ${key}: ${chalk.cyan(value)}`)
            }
        })
    }
}
