import type { ProcessorOptions } from './types.mjs'
import { createInterface } from 'node:readline/promises'
import chalk from 'chalk'
import { ProcessorType, Processors } from '@/@types/processors.mjs'
import { logger } from '../utils/logger.mjs'
import { getInputDir, getOutputDir, getShouldRename, getVerbose } from '../utils/options.mjs'

export interface DisplayConfig {
    processorName: string
    additionalConfig?: Record<string, unknown>
}

/**
 * Displays processor configuration in a consistent format
 */
/**
 * Calculates the left and right padding for text in a box drawing.
 * @param char The character to use for padding (e.g., '─' or ' ')
 * @param text The text to pad
 * @param width The total width of the box
 * @param center Whether to center the text (true) or left-align it (false)
 * @returns A tuple of [leftPadding, rightPadding]
 */
export const calculatePadding = (
    char: string,
    text: string,
    width: number,
    center: boolean = true
): [string, string] => {
    const totalPadding = Math.max(0, width - text.length - 2)

    // For left-aligned text, all padding goes to the right
    if (!center) return ['', char.repeat(totalPadding)]

    const horizontalLine = char.repeat(totalPadding)
    return horizontalLine
        .split('')
        .reduce(([left, right], _, i) => (i % 2 === 0 ? [left + char, right] : [left, char + right]), ['', ''])
}

export const getBooleanInput = async (
    rl: ReturnType<typeof createInterface>,
    question: string,
    defaultValue: boolean = false
) => {
    const answer = await rl.question(
        chalk.blue(`[INFO] ${question} (y/n)${chalk.gray(` (${defaultValue ? 'y' : 'n'})`)}: `)
    )
    if (!answer) return defaultValue
    return answer.toLowerCase().startsWith('y')
}

export const interactivePrompt = async (
    rl: ReturnType<typeof createInterface>,
    question: string,
    defaultValue?: string
) => {
    const defaultText = defaultValue ? chalk.gray(` (${defaultValue})`) : ''
    const answer = await rl.question(chalk.blue(`[INFO] ${question}${defaultText}: `))
    return answer.trim() || defaultValue || ''
}

export const displayMainMenu = async (rl: ReturnType<typeof createInterface>): Promise<ProcessorType> => {
    console.clear()

    // Header
    const title = ' 🧬 AB Helper Scripts '
    const boxWidth = 50
    const [leftPad, rightPad] = calculatePadding('═', title, boxWidth)
    logger.info(chalk.dim(leftPad) + chalk.bold.magenta(title) + chalk.dim(rightPad))

    // Menu
    logger.info(chalk.bold('Available Processors:'))
    logger.info(chalk.dim('─'.repeat(50)))

    // Display available Processors with colors and descriptions
    Object.keys(Processors).forEach((processor, index) => {
        const description = processor === 'kaluza' ? 'Process Kaluza data files' : 'Process microvesicles data'
        logger.info(`  ${chalk.green(index + 1)}) ${chalk.yellow(processor.padEnd(15))} ${chalk.dim(description)}`)
    })

    logger.info(chalk.dim('─'.repeat(50)))

    const answer = await rl.question(chalk.blue('[INFO] Select a processor (number or name): '))
    const normalizedAnswer = answer.toLowerCase().trim()
    const numberChoice = parseInt(normalizedAnswer)

    if (!isNaN(numberChoice) && numberChoice > 0 && numberChoice <= Object.keys(Processors).length) {
        const processor = Object.keys(Processors)[numberChoice - 1] as ProcessorType
        return processor
    }

    if (normalizedAnswer in Processors) {
        return normalizedAnswer as ProcessorType
    }

    logger.error('Invalid selection. Please try again.')
    return displayMainMenu(rl)
}

export const displayConfigurationBox = () => {
    const boxWidth = 50

    // Helper function to strip ANSI escape codes for length calculations
    const stripAnsi = (str: string) => str.replace(new RegExp('\u001b' + '\\[\\d+m', 'g'), '')

    // Get current configuration values
    const inputDir = getInputDir()
    const outputDir = getOutputDir()
    const enableRename = getShouldRename()
    const verbose = getVerbose()

    // Display configuration summary with lab-themed box design
    const summaryHeaderText = ' 📊 Configuration Summary '
    const [summaryLeftPad, summaryRightPad] = calculatePadding('─', summaryHeaderText, boxWidth)

    logger.info(
        chalk.dim('┌' + summaryLeftPad) + chalk.bold.magenta(summaryHeaderText) + chalk.dim(summaryRightPad + '┐')
    )
    logger.info(chalk.dim('├' + '─'.repeat(boxWidth - 2) + '┤'))

    // Create content lines with consistent padding
    const createContentLine = (icon: string, label: string, value: string) => {
        const doubleWidthCount = (stripAnsi(value).match(/❌/g) || []).length
        const content = `  ${icon} ${label}${stripAnsi(value)}`
        const [, padding] = calculatePadding(' ', content, boxWidth - doubleWidthCount, false)
        return chalk.dim('│') + `  ${icon} ${label}${value}` + padding + chalk.dim('│')
    }

    // Display configuration lines
    logger.info(createContentLine('🔬', 'Input directory:  ', chalk.yellow(inputDir)))
    logger.info(createContentLine('🧫', 'Output directory: ', chalk.yellow(outputDir)))
    logger.info(
        createContentLine(
            '🧪',
            'File renaming:    ',
            !enableRename ? chalk.red('❌ disabled') : chalk.green('✓ enabled')
        )
    )
    logger.info(
        createContentLine('🔭', 'Verbose logging:  ', verbose ? chalk.green('✓ enabled') : chalk.yellow('❌ disabled'))
    )

    logger.info(chalk.dim('└' + '─'.repeat(boxWidth - 2) + '┘\n'))
}

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
