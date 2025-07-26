export type kaluzaCSVHeader = {
    'Data Set': string
    Gate: string
    '%Gated': string //number
    'X-Med': string //number
    'X-AMean': string //number
    'X-GMean': string //number
}

export type kaluzaAnalysis = {
    'Data Set': string
    Gate: string | null
    '%Gated': string | null //number

    'X-Med': string | null //number
    'X-AMean': string | null //number
    'X-GMean': string | null //number

    'X-Med-all': string | null //number
    'X-AMean-all': string | null //number
    'X-GMean-all': string | null //number
    timestamp: string
}
