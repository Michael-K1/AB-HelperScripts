export type MicrovesiclesCSVInput = {
    /**
     * Data set identifier.
     * Format is Sample_Subject
     */
    'Data Set': string
    /** Gate identifier */
    'X Parameter': string
    Gate: string
    Number: string
    /** Percentage of gated cells (as string representation of a number) */
    '%Gated': string
    'Cells/μL': string
}

export type MicrovesiclesAlignedType = {
    [xParam: string]: {
        Number: number[]
        '%Gated': number[]
        'Cells/μL': number[]
        subject: string
    }
}

export type MicrovesiclesCalculatedMeansCSV = {
    Subject: string
    'X Parameter': string
    MeanNumber: number
    'Mean%Gated': number
    'MeanCells/μL': number
}
