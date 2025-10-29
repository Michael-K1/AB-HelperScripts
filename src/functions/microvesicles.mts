import type {
    MicrovesiclesCSVInput,
    MicrovesiclesAlignedType,
    MicrovesiclesCalculatedMeansCSV,
    MicrovesiclesUnionCSV
} from '@/@types/microvesicles.mjs'
import { mean } from 'lodash-es'
import { writeCSV } from '@/functions/csv.mjs'
import { getOutputDir, getInputFile } from '@/functions/utils/options.mjs'
import { parseCommaSeparatedNumber, formatNumberWithComma } from '@/functions/utils/helpers.mjs'

const microvesiclesAligned: MicrovesiclesAlignedType = {}
const unionCSV: MicrovesiclesUnionCSV[] = []

export const processVesiclesRow = (row: MicrovesiclesCSVInput) => {
    if (row.Gate === 'All') return // skip iteration`

    const xParam = row['X Parameter']
    const subject = (row['Data Set'].split('_').pop() ?? 'UNKNOWN').padStart(4, '0')

    if (!(xParam in microvesiclesAligned)) {
        microvesiclesAligned[xParam] = {
            Number: [],
            '%Gated': [],
            'Cells/μL': [],
            subject
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
        const newRow = {
            Subject: data.subject,
            'X Parameter': xParam,
            MeanNumber: formatNumberWithComma(mean(data.Number)),
            'Mean%Gated': formatNumberWithComma(mean(data['%Gated'])),
            'MeanCells/μL': formatNumberWithComma(mean(data['Cells/μL']))
        }
        outputCSV.push(newRow)
        unionCSV.push({ ...newRow, sourceFile: getInputFile() })
    }

    await writeCSV(getOutputDir(), getInputFile(), outputCSV)

    // Clear the data structure for the next file
    Object.keys(microvesiclesAligned).forEach((key) => delete microvesiclesAligned[key])
}

export const mergeSubjects = async () => await writeCSV(getOutputDir(), `merged_subjects.csv`, unionCSV)
