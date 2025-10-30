import { stdin as input, stdout as output } from 'node:process'
import { createInterface } from 'node:readline/promises'
import chalk from 'chalk'
import { Processors, ProcessorType } from '@/@types/processors.mjs'
import { logger } from '../functions/utils/logger.mjs'
import { createMainCLI } from '../functions/core/cli.mjs'

import {
    CliOption,
    displayMainMenu,
    setInputDir,
    setOutputDir,
    setShouldRename,
    setVerbose
} from '../functions/utils/options.mjs'

const interactivePrompt = async (rl: ReturnType<typeof createInterface>, question: string, defaultValue?: string) => {
    const defaultText = defaultValue ? chalk.gray(` (${defaultValue})`) : ''
    const answer = await rl.question(chalk.blue(`${question}${defaultText}: `))
    return answer.trim() || defaultValue || ''
}

const getBooleanInput = async (
    rl: ReturnType<typeof createInterface>,
    question: string,
    defaultValue: boolean = false
) => {
    const answer = await rl.question(chalk.blue(`${question} (y/n)${chalk.gray(` (${defaultValue ? 'y' : 'n'})`)}: `))
    if (!answer) return defaultValue
    return answer.toLowerCase().startsWith('y')
}

const handleProcessorOptions = async (rl: ReturnType<typeof createInterface>, selectedProcessor: ProcessorType) => {
    // Pretty header for configuration section with lab theme
    const header = ' 🧬 AB Helper Scripts '
    const padding = '═'.repeat(Math.max(0, (50 - header.length) / 2))
    logger.info('\n' + chalk.dim(padding) + chalk.bold.magenta(header) + chalk.dim(padding))

    // Section separator with lab theme
    logger.info(chalk.dim('\n┌──') + chalk.bold.cyan(' 🧪 Configuration Setup ') + chalk.dim('──┐'))

    // Get input for common options with lab-themed emojis
    const inputDir = await interactivePrompt(rl, '🔬 Input directory', `input/${selectedProcessor}`)
    const outputDir = await interactivePrompt(rl, '🧫 Output directory', `output/${selectedProcessor}`)
    const enableRename = await getBooleanInput(rl, '🧪 Enable file renaming', true)
    const verbose = await getBooleanInput(rl, '🔭 Enable verbose logging', false)

    // Set common options in singletons
    setInputDir(inputDir)
    setOutputDir(outputDir)
    setShouldRename(enableRename)
    setVerbose(verbose)

    // Display configuration summary with lab-themed box design
    logger.info(chalk.dim('\n┌──') + chalk.bold.magenta(' 📊 Configuration Summary ') + chalk.dim('──┐'))
    logger.info(chalk.dim('├' + '─'.repeat(48) + '┤'))
    logger.info(chalk.dim('│') + `  🔬 Input directory:  ${chalk.yellow(inputDir)}`.padEnd(47) + chalk.dim('│'))
    logger.info(chalk.dim('│') + `  🧫 Output directory: ${chalk.yellow(outputDir)}`.padEnd(47) + chalk.dim('│'))
    logger.info(
        chalk.dim('│') +
            `  🧪 File renaming:    ${!enableRename ? chalk.red('❌ disabled') : chalk.green('✓ enabled')}`.padEnd(47) +
            chalk.dim('│')
    )
    logger.info(
        chalk.dim('│') +
            `  🔭 Verbose logging:  ${verbose ? chalk.green('✓ enabled') : chalk.yellow('❌ disabled')}`.padEnd(47) +
            chalk.dim('│')
    )
    logger.info(chalk.dim('└' + '─'.repeat(48) + '┘\n'))
}

const main = async () => {
    try {
        // Parse command-line arguments
        const argv = createMainCLI()

        let selectedProcessor: ProcessorType
        let rl: ReturnType<typeof createInterface> | undefined

        if (!argv[CliOption.NonInteractive]) {
            // Create a single readline interface for all interactive operations
            rl = createInterface({ input, output })
            selectedProcessor = (argv[CliOption.Processor] as ProcessorType) ?? (await displayMainMenu(rl))
        } else {
            if (!argv[CliOption.Processor]) {
                throw new Error('Processor must be specified in non-interactive mode')
            }
            selectedProcessor = argv[CliOption.Processor] as ProcessorType

            // In non-interactive mode, set options directly from CLI args
            setInputDir((argv[CliOption.InputDir] as string) ?? `input/${selectedProcessor}`)
            setOutputDir((argv[CliOption.OutputDir] as string) ?? `output/${selectedProcessor}`)
            setShouldRename(!(argv[CliOption.DisableRename] as boolean))
            setVerbose(argv[CliOption.Verbose] as boolean)
        }

        logger.info(`Starting ${chalk.bold(selectedProcessor)} processor...`)

        // Import the selected processor first to access its config
        const module = await Processors[selectedProcessor]()

        if (!('handler' in module && typeof module.handler === 'function')) {
            throw new Error(`Selected processor does not export a handler function`)
        }

        // In interactive mode, gather common options and processor-specific options
        if (rl && !argv[CliOption.NonInteractive]) {
            await handleProcessorOptions(rl, selectedProcessor)

            // If the processor has specific options, configure those too

            if ('processorConfig' in module && module.processorConfig?.setupOptions) {
                await module.processorConfig.setupOptions(rl)
            }

            rl.close()
        }

        // Execute the handler
        await module.handler()
    } catch (error) {
        logger.error('An error occurred:', error)
        process.exit(1)
    }
}

// Start the process
await main()
