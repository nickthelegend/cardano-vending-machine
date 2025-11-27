/**
 * Hydra Logger Utility
 * Provides structured logging for all Hydra operations with debug mode support
 * Requirements: 9.2
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'
type OperationType = 'initialize' | 'commit' | 'close' | 'fanout' | 'message' | 'connection' | 'general'

interface LogEntry {
  timestamp: string
  level: LogLevel
  operation: OperationType
  message: string
  data?: any
}

class HydraLogger {
  private debugMode: boolean = false
  private logHistory: LogEntry[] = []
  private readonly MAX_HISTORY = 100

  /**
   * Enable or disable debug mode for verbose logging
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled
    console.log(`[HydraLogger] Debug mode ${enabled ? 'enabled' : 'disabled'}`)
  }

  /**
   * Get current debug mode status
   */
  isDebugMode(): boolean {
    return this.debugMode
  }

  /**
   * Get the log history
   */
  getHistory(): LogEntry[] {
    return [...this.logHistory]
  }

  /**
   * Clear the log history
   */
  clearHistory(): void {
    this.logHistory = []
    console.log('[HydraLogger] Log history cleared')
  }

  /**
   * Create a log entry and add to history
   */
  private createLogEntry(level: LogLevel, operation: OperationType, message: string, data?: any): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      operation,
      message,
      data
    }

    // Add to history (keep only last MAX_HISTORY entries)
    this.logHistory.push(entry)
    if (this.logHistory.length > this.MAX_HISTORY) {
      this.logHistory.shift()
    }

    return entry
  }

  /**
   * Format log message with timestamp and operation context
   */
  private formatMessage(operation: OperationType, phase: string, message: string): string {
    const timestamp = new Date().toISOString()
    return `[${timestamp}] [${operation.toUpperCase()}] [${phase}] ${message}`
  }

  /**
   * Log operation start
   */
  logOperationStart(operation: OperationType, details?: any): void {
    const message = this.formatMessage(operation, 'START', `Operation started`)
    const entry = this.createLogEntry('info', operation, message, details)
    
    console.log(message)
    if (this.debugMode && details) {
      console.log('Details:', details)
    }
  }

  /**
   * Log operation progress
   */
  logOperationProgress(operation: OperationType, step: string, details?: any): void {
    const message = this.formatMessage(operation, 'PROGRESS', step)
    const entry = this.createLogEntry('info', operation, message, details)
    
    console.log(message)
    if (this.debugMode && details) {
      console.log('Details:', details)
    }
  }

  /**
   * Log operation completion
   */
  logOperationComplete(operation: OperationType, result?: any): void {
    const message = this.formatMessage(operation, 'COMPLETE', `Operation completed successfully`)
    const entry = this.createLogEntry('info', operation, message, result)
    
    console.log(message)
    if (this.debugMode && result) {
      console.log('Result:', result)
    }
  }

  /**
   * Log operation error
   */
  logOperationError(operation: OperationType, error: any, context?: string): void {
    const errorMessage = this.formatErrorMessage(error)
    const message = this.formatMessage(
      operation, 
      'ERROR', 
      context ? `${context}: ${errorMessage}` : errorMessage
    )
    const entry = this.createLogEntry('error', operation, message, error)
    
    console.error(message)
    if (this.debugMode) {
      console.error('Error details:', error)
      if (error?.stack) {
        console.error('Stack trace:', error.stack)
      }
    }
  }

  /**
   * Log Hydra node message with timestamp
   */
  logHydraMessage(message: any): void {
    const timestamp = new Date().toISOString()
    const tag = message?.tag || 'UNKNOWN'
    const formattedMessage = `[${timestamp}] [HYDRA_MESSAGE] Received: ${tag}`
    
    const entry = this.createLogEntry('info', 'message', formattedMessage, message)
    
    console.log(formattedMessage)
    if (this.debugMode) {
      console.log('Full message:', JSON.stringify(message, null, 2))
    }
  }

  /**
   * Log connection events
   */
  logConnection(event: 'connecting' | 'connected' | 'disconnected' | 'error', details?: any): void {
    const message = this.formatMessage('connection', event.toUpperCase(), `Connection ${event}`)
    const entry = this.createLogEntry(event === 'error' ? 'error' : 'info', 'connection', message, details)
    
    if (event === 'error') {
      console.error(message)
    } else {
      console.log(message)
    }
    
    if (this.debugMode && details) {
      console.log('Details:', details)
    }
  }

  /**
   * Log debug information (only when debug mode is enabled)
   */
  debug(operation: OperationType, message: string, data?: any): void {
    if (!this.debugMode) return
    
    const formattedMessage = this.formatMessage(operation, 'DEBUG', message)
    const entry = this.createLogEntry('debug', operation, formattedMessage, data)
    
    console.log(formattedMessage)
    if (data) {
      console.log('Data:', data)
    }
  }

  /**
   * Log general information
   */
  info(message: string, data?: any): void {
    const timestamp = new Date().toISOString()
    const formattedMessage = `[${timestamp}] [INFO] ${message}`
    const entry = this.createLogEntry('info', 'general', formattedMessage, data)
    
    console.log(formattedMessage)
    if (this.debugMode && data) {
      console.log('Data:', data)
    }
  }

  /**
   * Log warning
   */
  warn(message: string, data?: any): void {
    const timestamp = new Date().toISOString()
    const formattedMessage = `[${timestamp}] [WARN] ${message}`
    const entry = this.createLogEntry('warn', 'general', formattedMessage, data)
    
    console.warn(formattedMessage)
    if (this.debugMode && data) {
      console.warn('Data:', data)
    }
  }

  /**
   * Format error messages in a user-friendly way
   * Utility function for formatting error messages
   */
  formatErrorMessage(error: any): string {
    if (!error) return 'Unknown error'
    
    // If error is a string, return it
    if (typeof error === 'string') return error
    
    // If error has a message property, use it
    if (error.message) return error.message
    
    // If error has a toString method, use it
    if (error.toString && typeof error.toString === 'function') {
      const str = error.toString()
      if (str !== '[object Object]') return str
    }
    
    // Fallback to JSON stringify
    try {
      return JSON.stringify(error)
    } catch {
      return 'Error could not be formatted'
    }
  }

  /**
   * Export logs as JSON string
   */
  exportLogs(): string {
    return JSON.stringify(this.logHistory, null, 2)
  }

  /**
   * Get logs filtered by operation type
   */
  getLogsByOperation(operation: OperationType): LogEntry[] {
    return this.logHistory.filter(entry => entry.operation === operation)
  }

  /**
   * Get logs filtered by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logHistory.filter(entry => entry.level === level)
  }

  /**
   * Get error logs only
   */
  getErrors(): LogEntry[] {
    return this.getLogsByLevel('error')
  }
}

// Export singleton instance
export const hydraLogger = new HydraLogger()

// Export types for use in other modules
export type { LogLevel, OperationType, LogEntry }
