import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import chalk from 'chalk'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { logger } from '../functions/utils/logger.mjs'
import { CliOption } from '../functions/utils/options.mjs'

// Define all available processors
const processors = {
    kaluza: () => import('./processors/kaluzaParser.mjs'),
    microvesicles: () => import('./processors/microvesicles.mjs')
} as const

type ProcessorType = keyof typeof processors

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

interface CommonOptions {
    [CliOption.InputDir]?: string
    [CliOption.OutputDir]?: string
    [CliOption.DisableRename]?: boolean
    [CliOption.Verbose]?: boolean
    [CliOption.DecimalPrecision]?: number
    filter?: string // For Kaluza processor
}

const getNumberInput = async (
    rl: ReturnType<typeof createInterface>,
    question: string,
    defaultValue: number
): Promise<number> => {
    const answer = await interactivePrompt(rl, question, defaultValue.toString())
    const num = parseInt(answer)
    return isNaN(num) ? defaultValue : num
}

const getCommonOptions = async (rl: ReturnType<typeof createInterface>, defaults: Partial<CommonOptions> = {}) => {
    const options: CommonOptions = {
        [CliOption.InputDir]: await interactivePrompt(rl, '📁 Input directory', defaults[CliOption.InputDir]),
        [CliOption.OutputDir]: await interactivePrompt(rl, '📂 Output directory', defaults[CliOption.OutputDir]),
        [CliOption.DisableRename]: !(await getBooleanInput(
            rl,
            '🔄 Enable file renaming',
            !defaults[CliOption.DisableRename]
        )),
        [CliOption.Verbose]: await getBooleanInput(rl, '📝 Enable verbose logging', defaults[CliOption.Verbose]),
        [CliOption.DecimalPrecision]: await getNumberInput(
            rl,
            '🔢 Decimal precision',
            defaults[CliOption.DecimalPrecision] ?? 3
        )
    }
    return options
}

const displayMenu = async (rl: ReturnType<typeof createInterface>): Promise<ProcessorType> => {
    console.clear()

    // Header
    const title = ' 🧬 AB Helper Scripts '
    const padding = '─'.repeat(Math.max(0, (50 - title.length) / 2))
    logger.info('\n' + chalk.dim(padding) + chalk.bold.magenta(title) + chalk.dim(padding))

    // Menu
    logger.info(chalk.bold('\nAvailable Processors:'))
    logger.info(chalk.dim('─'.repeat(50)))

    // Display available processors with colors and descriptions
    Object.keys(processors).forEach((processor, index) => {
        const description = processor === 'kaluza' ? 'Process Kaluza data files' : 'Process microvesicles data'
        logger.info(`  ${chalk.green(index + 1)}) ${chalk.yellow(processor.padEnd(15))} ${chalk.dim(description)}`)
    })

    logger.info(chalk.dim('─'.repeat(50)))

    const answer = await rl.question(chalk.blue('\nSelect a processor (number or name): '))
    const normalizedAnswer = answer.toLowerCase().trim()
    const numberChoice = parseInt(normalizedAnswer)

    if (!isNaN(numberChoice) && numberChoice > 0 && numberChoice <= Object.keys(processors).length) {
        const processor = Object.keys(processors)[numberChoice - 1] as ProcessorType
        return processor
    }

    if (normalizedAnswer in processors) {
        return normalizedAnswer as ProcessorType
    }

    logger.error('Invalid selection. Please try again.')
    return displayMenu(rl)
}

const handleProcessorOptions = async (selectedProcessor: ProcessorType, rl: ReturnType<typeof createInterface>) => {
    const module = await processors[selectedProcessor]()

    if (!module) {
        throw new Error(`Failed to load processor module`)
    }

    logger.info(chalk.dim('─'.repeat(30)))
    logger.info(chalk.bold('Processor Configuration:'))

    // Get common options interactively with defaults
    const commonDefaults = {
        [CliOption.InputDir]: `input/${selectedProcessor}`,
        [CliOption.OutputDir]: `output/${selectedProcessor}`,
        [CliOption.DisableRename]: false,
        [CliOption.Verbose]: false,
        [CliOption.DecimalPrecision]: 3 // Set default decimal precision
    }

    const options = await getCommonOptions(rl, commonDefaults)

    // Display configuration summary
    logger.info('\nConfiguration:')
    logger.info(chalk.dim('─'.repeat(50)))
    logger.info(`  ${chalk.blue('•')} Input directory: ${chalk.yellow(options[CliOption.InputDir])}`)
    logger.info(`  ${chalk.blue('•')} Output directory: ${chalk.yellow(options[CliOption.OutputDir])}`)
    logger.info(
        `  ${chalk.blue('•')} File renaming: ${options[CliOption.DisableRename] ? chalk.red('disabled') : chalk.green('enabled')}`
    )
    logger.info(
        `  ${chalk.blue('•')} Verbose logging: ${options[CliOption.Verbose] ? chalk.green('enabled') : chalk.yellow('disabled')}`
    )
    logger.info(`  ${chalk.blue('•')} Decimal precision: ${chalk.yellow(options[CliOption.DecimalPrecision])}`)
    logger.info(chalk.dim('─'.repeat(50)) + '\n')

    // For Kaluza, get additional options
    if (selectedProcessor === 'kaluza') {
        const filter = await interactivePrompt(rl, 'Enter dataset terms to filter (comma-separated)', '')
        if (filter) {
            process.argv.push('--filter', filter)
        }
    }

    // Build array of command-line arguments
    const cliArgs = []

    // Add input directory
    cliArgs.push(`--${CliOption.InputDir}`, options[CliOption.InputDir] || `input/${selectedProcessor}`)

    // Add output directory
    cliArgs.push(`--${CliOption.OutputDir}`, options[CliOption.OutputDir] || `output/${selectedProcessor}`)

    // Add boolean flags
    if (options[CliOption.DisableRename]) {
        cliArgs.push(`--${CliOption.DisableRename}`)
    }
    if (options[CliOption.Verbose]) {
        cliArgs.push(`--${CliOption.Verbose}`)
    }

    // Always add decimal precision with default
    const decimalPrecision = options[CliOption.DecimalPrecision] ?? 3
    cliArgs.push(`--${CliOption.DecimalPrecision}`, decimalPrecision.toString())

    // Add Kaluza-specific options
    if (selectedProcessor === 'kaluza' && options.filter) {
        cliArgs.push('--filter', options.filter)
    }

    // Update process.argv preserving the first two entries (node and script path)
    process.argv = [...process.argv.slice(0, 2), ...cliArgs]
}

const main = async () => {
    // Parse command-line arguments
    const argv = yargs(hideBin(process.argv))
        .option(CliOption.NonInteractive, {
            alias: 'n',
            type: 'boolean',
            description: 'Run in non-interactive mode (requires all options to be provided via command line)',
            default: false
        })
        .option(CliOption.Processor, {
            alias: 'p',
            type: 'string',
            description: 'Processor to run (kaluza or microvesicles)',
            choices: Object.keys(processors)
        })
        .help()
        .alias('help', 'h')
        .parseSync()

    try {
        let selectedProcessor: ProcessorType
        let rl: ReturnType<typeof createInterface> | undefined

        if (!argv[CliOption.NonInteractive]) {
            // Create a single readline interface for all interactive operations
            rl = createInterface({ input, output })
            selectedProcessor = (argv[CliOption.Processor] as ProcessorType) ?? (await displayMenu(rl))
        } else {
            if (!argv[CliOption.Processor]) {
                throw new Error('Processor must be specified in non-interactive mode')
            }
            selectedProcessor = argv[CliOption.Processor] as ProcessorType
        }

        logger.info(`Starting ${chalk.bold(selectedProcessor)} processor...`)

        // Import the selected processor
        const module = await processors[selectedProcessor]()

        if (!('handler' in module && typeof module.handler === 'function')) {
            throw new Error(`Selected processor does not export a handler function`)
        }

        // In interactive mode, gather options
        if (rl && !argv[CliOption.NonInteractive]) {
            await handleProcessorOptions(selectedProcessor, rl)
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
