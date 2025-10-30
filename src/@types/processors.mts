// Define all available processors
export const Processors = {
    kaluza: () => import('@/functions/processors/kaluzaParser.mjs'),
    microvesicles: () => import('@/functions/processors/microvesicles.mjs')
} as const

export type ProcessorType = keyof typeof Processors
