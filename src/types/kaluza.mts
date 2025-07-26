/**
 * Type representing the structure of CSV input data from Kaluza.
 */
export type kaluzaCSVInput = {
    /**
     * Data set identifier.
     * Format is Antibody|Stimulation|Subject
     */
    'Data Set': string
    /** Gate identifier */
    Gate: string
    /** Percentage of gated cells (as string representation of a number) */
    '%Gated': string
    /** Median of X values (as string representation of a number) */
    'X-Med': string
    /** Arithmetic mean of X values (as string representation of a number) */
    'X-AMean': string
    /** Geometric mean of X values (as string representation of a number) */
    'X-GMean': string
}

export type kaluzaAlignment = {
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

export type kaluzaFinalAnalysis = Record<string, string | null> //{
//     'Data Set': string
//     Gate: string | null
//     'BAS-%Gated': string | null //number

//     'BAS-X-Med': string | null //number
//     'BAS-X-AMean': string | null //number
//     'BAS-X-GMean': string | null //number

//     'BAS-X-Med-all': string | null //number
//     'BAS-X-AMean-all': string | null //number
//     'BAS-X-GMean-all': string | null //number

//     'ADP-%Gated': string | null //number

//     'ADP-X-Med': string | null //number
//     'ADP-X-AMean': string | null //number
//     'ADP-X-GMean': string | null //number

//     'ADP-X-Med-all': string | null //number
//     'ADP-X-AMean-all': string | null //number
//     'ADP-X-GMean-all': string | null //number

//     'BAS-timestamp': string
//     'ADP-timestamp': string
// }
