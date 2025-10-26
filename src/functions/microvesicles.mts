import type {
    MicrovesiclesCSVInput,
    MicrovesiclesAlignedType,
    MicrovesiclesCalculatedMeansCSV
} from '@/@types/microvesicles.mjs'
import { mean } from 'lodash-es'
import { writeCSV } from '@/functions/csv.mjs'
import { getOutputDir, getInputFile } from '@/functions/utils/options.mjs'

const parseCommaSeparatedNumber = (value: string): number => {
    // Replace comma with dot and parse as float
    return parseFloat(value.replace(',', '.'))
}

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

    microvesiclesAligned[xParam].Number.push(parseCommaSeparatedNumber(row.Number))
    microvesiclesAligned[xParam]['%Gated'].push(parseCommaSeparatedNumber(row['%Gated']))
    microvesiclesAligned[xParam]['Cells/μL'].push(parseCommaSeparatedNumber(row['Cells/μL']))
}

export const finalizeMicrovesiclesAlignment = async () => {
    const outputCSV: MicrovesiclesCalculatedMeansCSV[] = []

    for (const xParam in microvesiclesAligned) {
        const data = microvesiclesAligned[xParam]
        outputCSV.push({
            'X Parameter': xParam,
            MeanNumber: mean(data.Number),
            'Mean%Gated': mean(data['%Gated']),
            'MeanCells/μL': mean(data['Cells/μL'])
        })
    }

    await writeCSV(getOutputDir(), getInputFile(), outputCSV)

    // Clear the data structure for the next file
    Object.keys(microvesiclesAligned).forEach((key) => delete microvesiclesAligned[key])
}
