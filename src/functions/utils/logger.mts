import chalk from 'chalk'
import { DateTime } from 'luxon'

// Define constants for timing logic
const IMPORTANT_TIMERS = ['Total', 'Main execution']
const isImportantTimer = (label: string): boolean =>
    IMPORTANT_TIMERS.some((timer) => label.includes(timer) || label === timer)

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
            return {
                label,
                startTime: DateTime.now()
            }
        },
        end: (timer: { label: string; startTime: DateTime }) => {
            const isProcessingTimer = timer.label.startsWith('Processing')

            if (verbose || isImportantTimer(timer.label)) {
                console.timeEnd(chalk.cyan(`⏱️ [TIMING] ${timer.label}`))
            } else if (isProcessingTimer) {
                // For non-verbose mode, collect timing data without displaying
                const elapsed = DateTime.now().diff(timer.startTime).milliseconds
                // Use verbose since this is only for verbose mode
                if (verbose) {
                    console.log(chalk.gray(`[VERBOSE] ${timer.label} completed in ${elapsed.toFixed(0)}ms`))
                }
            }
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
