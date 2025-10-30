import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import chalk from 'chalk'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { logger } from '../functions/utils/logger.mjs'
import { CliOption } from '../functions/utils/options.mjs'

// Import all lambda handlers
const lambdas = {
    kaluza: () => import('../lambda/kaluzaParser.mjs'),
    microvesicles: () => import('../lambda/microvesicles.mjs')
} as const

type LambdaType = keyof typeof lambdas

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
        [CliOption.InputDir]: await interactivePrompt(rl, 'Input directory', defaults[CliOption.InputDir]),
        [CliOption.OutputDir]: await interactivePrompt(rl, 'Output directory', defaults[CliOption.OutputDir]),
        [CliOption.DisableRename]: !(await getBooleanInput(
            rl,
            'Enable file renaming',
            !defaults[CliOption.DisableRename]
        )),
        [CliOption.Verbose]: await getBooleanInput(rl, 'Enable verbose logging', defaults[CliOption.Verbose]),
        [CliOption.DecimalPrecision]: await getNumberInput(
            rl,
            'Decimal precision',
            defaults[CliOption.DecimalPrecision] ?? 3
        )
    }
    return options
}

const displayMenu = async (rl: ReturnType<typeof createInterface>): Promise<LambdaType> => {
    console.clear()
    console.log(chalk.bold.blue('🧬 AB Helper Scripts'))
    console.log(chalk.dim('─'.repeat(30)))
    console.log('\nAvailable processors:')

    // Display available lambdas
    Object.keys(lambdas).forEach((lambda, index) => {
        console.log(`${chalk.green(index + 1)}) ${chalk.yellow(lambda)}`)
    })

    console.log('\n' + chalk.dim('─'.repeat(30)))

    const answer = await rl.question(chalk.blue('\nSelect a processor (number or name): '))

    // Try to match by number
    const numberChoice = parseInt(answer)
    if (!isNaN(numberChoice) && numberChoice > 0 && numberChoice <= Object.keys(lambdas).length) {
        const lambda = Object.keys(lambdas)[numberChoice - 1] as LambdaType
        return lambda
    }

    // Try to match by name
    const normalizedAnswer = answer.toLowerCase()
    if (normalizedAnswer in lambdas) {
        return normalizedAnswer as LambdaType
    }

    console.log(chalk.red('Invalid selection. Please try again.'))
    return await displayMenu(rl) // Pass the existing readline interface
}

const handleProcessorOptions = async (selectedLambda: LambdaType, rl: ReturnType<typeof createInterface>) => {
    console.log(chalk.dim('\n─'.repeat(5)))
    console.log(chalk.bold('\nProcessor Configuration:'))

    // Get common options interactively
    const commonDefaults = {
        [CliOption.InputDir]: `input/${selectedLambda}`,
        [CliOption.OutputDir]: `output/${selectedLambda}`,
        [CliOption.DisableRename]: false,
        [CliOption.Verbose]: false
    }

    const options = await getCommonOptions(rl, commonDefaults)

    // For Kaluza, get additional options
    if (selectedLambda === 'kaluza') {
        const filter = await interactivePrompt(rl, 'Enter dataset terms to filter (comma-separated)', '')
        if (filter) {
            process.argv.push('--filter', filter)
        }
    }

    // Set the gathered options
    if (options[CliOption.InputDir]) process.argv.push(`--${CliOption.InputDir}`, options[CliOption.InputDir])
    if (options[CliOption.OutputDir]) process.argv.push(`--${CliOption.OutputDir}`, options[CliOption.OutputDir])
    if (options[CliOption.DisableRename]) process.argv.push(`--${CliOption.DisableRename}`)
    if (options[CliOption.Verbose]) process.argv.push(`--${CliOption.Verbose}`)
    if (options[CliOption.DecimalPrecision])
        process.argv.push(`--${CliOption.DecimalPrecision}`, options[CliOption.DecimalPrecision].toString())
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
            choices: Object.keys(lambdas)
        })
        .help()
        .alias('help', 'h')
        .parseSync()

    try {
        let selectedLambda: LambdaType
        let rl: ReturnType<typeof createInterface> | undefined

        if (!argv[CliOption.NonInteractive]) {
            // Create a single readline interface for all interactive operations
            rl = createInterface({ input, output })
            selectedLambda = (argv[CliOption.Processor] as LambdaType) ?? (await displayMenu(rl))
        } else {
            if (!argv[CliOption.Processor]) {
                throw new Error('Processor must be specified in non-interactive mode')
            }
            selectedLambda = argv[CliOption.Processor] as LambdaType
        }

        logger.info(`Starting ${chalk.bold(selectedLambda)} processor...`)

        // Import the selected lambda
        const module = await lambdas[selectedLambda]()

        if (!('handler' in module && typeof module.handler === 'function')) {
            throw new Error(`Selected processor does not export a handler function`)
        }

        // In interactive mode, gather options
        if (rl && !argv[CliOption.NonInteractive]) {
            await handleProcessorOptions(selectedLambda, rl)
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
