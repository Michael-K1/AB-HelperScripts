import type { Options } from 'yargs'

export interface ProcessorCliConfig {
    name: string
    inputDirDefault: string
    outputDirDefault: string
    additionalOptions?: Record<string, Options>
}

export interface ProcessorOptions {
    inputDir: string
    outputDir: string
    disableRename: boolean
    verbose: boolean
    [key: string]: unknown
}

export interface ProcessorConfig<T = unknown> extends ProcessorCliConfig {
    processRow: (row: T) => Promise<void> | void
    finalizeAlignment?: () => Promise<void> | void
    postProcess?: () => Promise<void> | void
}
