import chalk from 'chalk'
import { DateTime } from 'luxon'

// Define constants for timing logic
const IMPORTANT_TIMERS = ['Total', 'Main execution']
const isImportantTimer = (label: string): boolean =>
    IMPORTANT_TIMERS.some((timer) => label.includes(timer) || label === timer)

const TIMERS: Record<string, DateTime> = {}
/**
 * Creates a logger with configurable verbosity
 *
 * @param verbose Whether to show verbose logs
 * @returns Logger object with various logging methods
 */
export const createLogger = (verbose: boolean = false) => ({
    info: (message: string) => console.log(chalk.blue(`[INFO] ${message}`)),
    success: (message: string) => console.log(chalk.green(`[SUCCESS] ${message}`)),
    warn: (message: string) => console.log(chalk.yellow(`[WARNING] ${message}`)),
    error: (message: string, error?: unknown) =>
        console.error(
            chalk.red(`[ERROR] ${message}`),
            error ? chalk.red(error instanceof Error ? error.message : String(error)) : ''
        ),
    verbose: (message: string) => {
        if (verbose) {
            console.log(chalk.gray(`[VERBOSE] ${message}`))
        }
    },
    timing: {
        start: (label: string) => {
            if (verbose || isImportantTimer(label)) {
                console.time(chalk.cyan(`⏱️ [TIMING] ${label}`))
            }
            TIMERS[label] = DateTime.now()
        },
        end: (label: string) => {
            const startTime = TIMERS[label]
            const isProcessingTimer = label.startsWith('Processing')

            if (verbose || isImportantTimer(label)) {
                console.timeEnd(chalk.cyan(`⏱️ [TIMING] ${label}`))
            } else if (isProcessingTimer && startTime) {
                // For non-verbose mode, collect timing data without displaying
                const elapsed = DateTime.now().diff(startTime).milliseconds
                if (verbose) {
                    console.log(chalk.gray(`[VERBOSE] ${label} completed in ${elapsed.toFixed(0)}ms`))
                }
            }
            // Optionally clean up timer
            delete TIMERS[label]
        }
    }
})

// Initialize with default (non-verbose)
export let logger = createLogger(false)

/**
 * Update logger verbosity
 *
 * @param verbose Whether to enable verbose logging
 */
export const configureLogger = (verbose: boolean) => {
    logger = createLogger(verbose)
}
