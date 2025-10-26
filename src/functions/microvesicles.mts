import type {
    MicrovesiclesCSVInput,
    MicrovesiclesAlignedType,
    MicrovesiclesCalculatedMeansCSV
} from '@/@types/microvesicles.mjs'
import { getInputFile, getOutputDir, writeCSV } from './csv.mjs'

const microvesiclesAligned: MicrovesiclesAlignedType = {}

export const processVesiclesRow = (row: MicrovesiclesCSVInput) => {
    if (row.Gate === 'All') return // skip iteration`

    const xParam = row['X Parameter']

    if (!(xParam in microvesiclesAligned)) {
        microvesiclesAligned[xParam] = {
            Number: [],
            '%Gated': [],
            'Cells/μL': []
        }
    }

    microvesiclesAligned[xParam].Number.push(parseFloat(row.Number))
    microvesiclesAligned[xParam]['%Gated'].push(parseFloat(row['%Gated']))
    microvesiclesAligned[xParam]['Cells/μL'].push(parseFloat(row['Cells/μL']))
}

export const finalizeMicrovesiclesAlignment = () => {
    const outputCSV: MicrovesiclesCalculatedMeansCSV[] = []

    for (const xParam in microvesiclesAligned) {
        const data = microvesiclesAligned[xParam]
        outputCSV.push({
            'X Parameter': xParam,
            MeanNumber: data.Number.reduce((a, b) => a + b, 0) / data.Number.length,
            'Mean%Gated': data['%Gated'].reduce((a, b) => a + b, 0) / data['%Gated'].length,
            'MeanCells/μL': data['Cells/μL'].reduce((a, b) => a + b, 0) / data['Cells/μL'].length
        })
    }

    writeCSV(`${getOutputDir()}/microvesicles`, `DONE_${getInputFile()}`, outputCSV)
}
