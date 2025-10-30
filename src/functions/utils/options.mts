import { createInterface } from 'node:readline/promises'
import { DateTime } from 'luxon'
import chalk from 'chalk'
import { Processors, ProcessorType } from '@/@types/processors.mjs'
import { logger } from '@/functions/utils/logger.mjs'

export enum CliOption {
    InputDir = 'input-dir',
    OutputDir = 'output-dir',
    DisableRename = 'disable-rename',
    Verbose = 'verbose',
    DecimalPrecision = 'decimal-precision',
    NonInteractive = 'non-interactive',
    Processor = 'processor',
    Filter = 'filter'
}

let _dataSetFilter: string[] = []
export const setDataSetFilter = (filter?: string) => {
    _dataSetFilter = filter ? filter.split(',').map((item) => item.trim()) : []
}
export const getDataSetFilter = (): string[] => _dataSetFilter

let _inputDir = 'input'
export const setInputDir = (dir?: string) => {
    _inputDir = dir ?? 'input'
}
export const getInputDir = (): string => _inputDir

let _outputDir = 'output'
export const setOutputDir = (dir?: string) => {
    _outputDir = `${dir ?? 'output'}`
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

let _decimalPrecision = 3
export const setDecimalPrecision = (value?: number) => {
    _decimalPrecision = value ?? 3
}
export const getDecimalPrecision = (): number => _decimalPrecision

let _verbose = false
export const setVerbose = (value?: boolean) => {
    _verbose = value ?? false
}
export const getVerbose = (): boolean => _verbose

export interface CommonOptions {
    [CliOption.InputDir]?: string
    [CliOption.OutputDir]?: string
    [CliOption.DisableRename]?: boolean
    [CliOption.Verbose]?: boolean
}

export const getBooleanInput = async (
    rl: ReturnType<typeof createInterface>,
    question: string,
    defaultValue: boolean = false
) => {
    const answer = await rl.question(chalk.blue(`${question} (y/n)${chalk.gray(` (${defaultValue ? 'y' : 'n'})`)}: `))
    if (!answer) return defaultValue
    return answer.toLowerCase().startsWith('y')
}

export const interactivePrompt = async (
    rl: ReturnType<typeof createInterface>,
    question: string,
    defaultValue?: string
) => {
    const defaultText = defaultValue ? chalk.gray(` (${defaultValue})`) : ''
    const answer = await rl.question(chalk.blue(`${question}${defaultText}: `))
    return answer.trim() || defaultValue || ''
}

export const displayMainMenu = async (rl: ReturnType<typeof createInterface>): Promise<ProcessorType> => {
    console.clear()

    // Header
    const title = ' 🧬 AB Helper Scripts '
    const padding = '─'.repeat(Math.max(0, (50 - title.length) / 2))
    logger.info('\n' + chalk.dim(padding) + chalk.bold.magenta(title) + chalk.dim(padding))

    // Menu
    logger.info(chalk.bold('\nAvailable Processors:'))
    logger.info(chalk.dim('─'.repeat(50)))

    // Display available Processors with colors and descriptions
    Object.keys(Processors).forEach((processor, index) => {
        const description = processor === 'kaluza' ? 'Process Kaluza data files' : 'Process microvesicles data'
        logger.info(`  ${chalk.green(index + 1)}) ${chalk.yellow(processor.padEnd(15))} ${chalk.dim(description)}`)
    })

    logger.info(chalk.dim('─'.repeat(50)))

    const answer = await rl.question(chalk.blue('\nSelect a processor (number or name): '))
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
