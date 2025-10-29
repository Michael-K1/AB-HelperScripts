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

export interface ProcessorConfig extends ProcessorCliConfig {
    processRow: <T>(row: T) => Promise<unknown>
    finalizeAlignment?: () => Promise<void>
    postProcess?: () => Promise<void>
}
