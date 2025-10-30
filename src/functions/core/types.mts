import type { Row } from '@fast-csv/parse'
import type { Interface as ReadlineInterface } from 'node:readline/promises'

/**
 * Common options that are shared between all processors
 */
export interface CommonOptions {
    inputDir: string
    outputDir: string
    disableRename: boolean
    verbose: boolean
}

/**
 * Processor options that include both common and specific options
 */
export interface ProcessorOptions extends CommonOptions {
    [key: string]: unknown
}

/**
 * Base configuration for processors
 */
export interface ProcessorConfig<T extends Row = Row> {
    name: string
    defaultInputDir: string
    defaultOutputDir: string
    processRow: (row: T) => Promise<void> | void
    finalizeAlignment?: () => Promise<void> | void
    postProcess?: () => Promise<void> | void
    /**
     * Setup any processor-specific options in interactive mode
     */
    setupOptions?: (rl: ReadlineInterface) => Promise<void>
    /**
     * Parse any processor-specific CLI arguments
     */
    parseCliOptions?: (args: Record<string, unknown>) => void
}
