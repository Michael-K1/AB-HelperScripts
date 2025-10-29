import { getDecimalPrecision } from './options.mjs'

// Replace comma with dot and parse as float
export const parseCommaSeparatedNumber = (value?: string): number => parseFloat(value?.replace(',', '.') ?? '0')

// Convert number to string with configured decimal places and replace dot with comma
export const formatNumberWithComma = (value: number): string => value.toFixed(getDecimalPrecision()).replace('.', ',')
