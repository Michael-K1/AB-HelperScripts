import type { kaluzaAlignment, kaluzaCSVInput, kaluzaFinalAnalysis } from '@/@types/kaluza.mjs'
import chalk from 'chalk'
import { writeCSV } from '@/functions/csv.mjs'
import { logger } from '@/functions/utils/logger.mjs'
import { getDataSetFilter, getInputFile, getOutputDir } from '@/functions/utils/options.mjs'

const kaluzaAligned: Record<string, kaluzaAlignment> = {}

export const processKaluzaRow = (row: kaluzaCSVInput) => {
    const dataSetFilter = getDataSetFilter()
    for (const element of dataSetFilter) if (row['Data Set'].includes(element)) return // skip iteration

    const [dataSet, ...timestamp] = row['Data Set'].split('-')
    const isAllRow = row['Gate'] === 'All'

    // Create the base entry if it doesn't exist yet
    if (!(dataSet in kaluzaAligned)) {
        kaluzaAligned[dataSet] = {
            'Data Set': dataSet,
            Gate: null,
            '%Gated': null,
            'X-Med': null,
            'X-AMean': null,
            'X-GMean': null,
            'X-Med-all': null,
            'X-AMean-all': null,
            'X-GMean-all': null,
            timestamp: timestamp.join('-')
        }
    }

    // Update with values based on row type (All or not)
    if (isAllRow) {
        // Update "All" metrics
        kaluzaAligned[dataSet]['X-Med-all'] = row['X-Med']
        kaluzaAligned[dataSet]['X-AMean-all'] = row['X-AMean']
        kaluzaAligned[dataSet]['X-GMean-all'] = row['X-GMean']
        return
    }
    // Only update regular metrics if they haven't been set yet
    kaluzaAligned[dataSet]['Gate'] = kaluzaAligned[dataSet]['Gate'] ?? row['%Gated']
    kaluzaAligned[dataSet]['%Gated'] = kaluzaAligned[dataSet]['%Gated'] ?? row['%Gated']
    kaluzaAligned[dataSet]['X-Med'] = kaluzaAligned[dataSet]['X-Med'] ?? row['X-Med']
    kaluzaAligned[dataSet]['X-AMean'] = kaluzaAligned[dataSet]['X-AMean'] ?? row['X-AMean']
    kaluzaAligned[dataSet]['X-GMean'] = kaluzaAligned[dataSet]['X-GMean'] ?? row['X-GMean']
}

export const finalizeKaluzaAlignment = async () => {
    // First write the aligned data
    const alignedRows = Object.values(kaluzaAligned)
    const inputFile = getInputFile()
    const outputDir = getOutputDir()

    await writeCSV(outputDir, `aligned_${inputFile}`, alignedRows)
    logger.info(`Processing merged data for ${chalk.bold(inputFile)}...`)

    // Process the merged data
    const analysisMap: Record<string, kaluzaFinalAnalysis> = {}

    for (const e of alignedRows) {
        // Merge logic for BAS and ADP rows
        const [antibody, stimulation, subject] = e['Data Set'].split('_')
        const key = `${antibody}_${subject}`

        const tmp: kaluzaFinalAnalysis = {
            [`${stimulation}-%Gated`]: e['%Gated'],
            [`${stimulation}-X-Med`]: e['X-Med'],
            [`${stimulation}-X-AMean`]: e['X-AMean'],
            [`${stimulation}-X-GMean`]: e['X-GMean'],
            [`${stimulation}-X-Med-all`]: e['X-Med-all'],
            [`${stimulation}-X-AMean-all`]: e['X-AMean-all'],
            [`${stimulation}-X-GMean-all`]: e['X-GMean-all']
        }

        if (!(key in analysisMap)) {
            analysisMap[key] = {
                'Data Set': key,
                ...tmp
            }
            continue
        }
        analysisMap[key] = {
            ...analysisMap[key],
            ...tmp
        }
    }

    // Write the merged data to CSV
    const finalRows = Object.values(analysisMap)
    if (finalRows.length === 0) {
        logger.warn(`No merged data to write for ${chalk.bold(inputFile)}`)
        return
    }
    writeCSV(outputDir, `merged_${inputFile}`, finalRows)

    // Clear the aligned data for the next file
    Object.keys(kaluzaAligned).forEach((key) => delete kaluzaAligned[key])
}
