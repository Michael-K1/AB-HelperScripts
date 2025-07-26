import { createWriteStream, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import chalk from 'chalk'
import { format } from 'fast-csv'

export const writeCSV = (outputDir: string, file: string, analisys: unknown[], info: (message: string) => void) => {
    // Check if output directory exists, create it if it doesn't
    if (!existsSync(outputDir)) {
        info(`Creating output directory: ${chalk.cyan(outputDir)}`)
        mkdirSync(outputDir, { recursive: true })
    }

    const csvStream = format({
        headers: true,
        delimiter: ';'
    })
    const outputFilePath = join(outputDir, `processed_${file}`)
    const writeStream = createWriteStream(outputFilePath)
    csvStream.pipe(writeStream)

    const entriesCount = Object.values(analisys).length
    info(`Writing ${chalk.bold(entriesCount)} entries to ${chalk.bold(`processed_${file}`)}`)

    for (const element of Object.values(analisys)) csvStream.write(element)

    csvStream.end()
}
