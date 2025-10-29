import { DateTime } from 'luxon'

let _dataSetFilter: string[] = []
export const setDataSetFilter = (filter?: string) => {
    _dataSetFilter = filter ? filter.split(',').map((item) => item.trim()) : []
}
export const getDataSetFilter = (): string[] => _dataSetFilter

let _inputDir = 'input'
export const setInputDir = (dir?: string) => {
    _inputDir = dir ?? 'input'
}
export const getInputDir = (): string => _inputDir

let _outputDir = 'output'
export const setOutputDir = (dir?: string) => {
    _outputDir = `${dir ?? 'output'}/${DateTime.now().toISO()}`
}
export const getOutputDir = (): string => _outputDir

let _inputFile = `${DateTime.now().toISO()}`
export const setInputFile = (file: string) => {
    _inputFile = file
}
export const getInputFile = (): string => _inputFile

let _shouldRename = true
export const setShouldRename = (value: boolean) => {
    _shouldRename = value
}
export const getShouldRename = (): boolean => _shouldRename

let _decimalPrecision = 3
export const setDecimalPrecision = (value?: number) => {
    _decimalPrecision = value ?? 3
}
export const getDecimalPrecision = (): number => _decimalPrecision
