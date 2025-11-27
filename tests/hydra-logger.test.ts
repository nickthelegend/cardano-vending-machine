/**
 * Tests for Hydra Logger Utility
 * Validates structured logging functionality
 */

import { hydraLogger } from '@/lib/hydra-logger'

describe('HydraLogger', () => {
  beforeEach(() => {
    // Clear history before each test
    hydraLogger.clearHistory()
    hydraLogger.setDebugMode(false)
  })

  describe('Debug Mode', () => {
    it('should enable and disable debug mode', () => {
      expect(hydraLogger.isDebugMode()).toBe(false)
      
      hydraLogger.setDebugMode(true)
      expect(hydraLogger.isDebugMode()).toBe(true)
      
      hydraLogger.setDebugMode(false)
      expect(hydraLogger.isDebugMode()).toBe(false)
    })
  })

  describe('Operation Logging', () => {
    it('should log operation start', () => {
      hydraLogger.logOperationStart('initialize', { test: 'data' })
      
      const history = hydraLogger.getHistory()
      expect(history).toHaveLength(1)
      expect(history[0].operation).toBe('initialize')
      expect(history[0].level).toBe('info')
      expect(history[0].message).toContain('START')
      expect(history[0].message).toContain('INITIALIZE')
    })

    it('should log operation progress', () => {
      hydraLogger.logOperationProgress('commit', 'Building transaction')
      
      const history = hydraLogger.getHistory()
      expect(history).toHaveLength(1)
      expect(history[0].operation).toBe('commit')
      expect(history[0].message).toContain('PROGRESS')
      expect(history[0].message).toContain('Building transaction')
    })

    it('should log operation completion', () => {
      hydraLogger.logOperationComplete('close', { result: 'success' })
      
      const history = hydraLogger.getHistory()
      expect(history).toHaveLength(1)
      expect(history[0].operation).toBe('close')
      expect(history[0].message).toContain('COMPLETE')
    })

    it('should log operation errors', () => {
      const error = new Error('Test error')
      hydraLogger.logOperationError('fanout', error, 'Test context')
      
      const history = hydraLogger.getHistory()
      expect(history).toHaveLength(1)
      expect(history[0].operation).toBe('fanout')
      expect(history[0].level).toBe('error')
      expect(history[0].message).toContain('ERROR')
      expect(history[0].message).toContain('Test context')
    })
  })

  describe('Hydra Message Logging', () => {
    it('should log Hydra messages with timestamps', () => {
      const message = { tag: 'HeadIsOpen', timestamp: '2024-01-01T00:00:00Z' }
      hydraLogger.logHydraMessage(message)
      
      const history = hydraLogger.getHistory()
      expect(history).toHaveLength(1)
      expect(history[0].operation).toBe('message')
      expect(history[0].message).toContain('HYDRA_MESSAGE')
      expect(history[0].message).toContain('HeadIsOpen')
      expect(history[0].data).toEqual(message)
    })

    it('should handle messages without tag', () => {
      const message = { data: 'test' }
      hydraLogger.logHydraMessage(message)
      
      const history = hydraLogger.getHistory()
      expect(history).toHaveLength(1)
      expect(history[0].message).toContain('UNKNOWN')
    })
  })

  describe('Connection Logging', () => {
    it('should log connection events', () => {
      hydraLogger.logConnection('connecting', { url: 'http://test.com' })
      hydraLogger.logConnection('connected', { url: 'http://test.com' })
      hydraLogger.logConnection('disconnected')
      
      const history = hydraLogger.getHistory()
      expect(history).toHaveLength(3)
      expect(history[0].message).toContain('connecting')
      expect(history[1].message).toContain('connected')
      expect(history[2].message).toContain('disconnected')
    })

    it('should log connection errors', () => {
      hydraLogger.logConnection('error', { error: 'Connection failed' })
      
      const history = hydraLogger.getHistory()
      expect(history).toHaveLength(1)
      expect(history[0].level).toBe('error')
    })
  })

  describe('Error Message Formatting', () => {
    it('should format string errors', () => {
      const result = hydraLogger.formatErrorMessage('Simple error')
      expect(result).toBe('Simple error')
    })

    it('should format Error objects', () => {
      const error = new Error('Test error message')
      const result = hydraLogger.formatErrorMessage(error)
      expect(result).toBe('Test error message')
    })

    it('should handle null/undefined errors', () => {
      expect(hydraLogger.formatErrorMessage(null)).toBe('Unknown error')
      expect(hydraLogger.formatErrorMessage(undefined)).toBe('Unknown error')
    })

    it('should format objects without message property', () => {
      const error = { code: 500, status: 'failed' }
      const result = hydraLogger.formatErrorMessage(error)
      expect(result).toContain('500')
    })
  })

  describe('Log History Management', () => {
    it('should maintain log history', () => {
      hydraLogger.logOperationStart('initialize')
      hydraLogger.logOperationProgress('initialize', 'Step 1')
      hydraLogger.logOperationComplete('initialize')
      
      const history = hydraLogger.getHistory()
      expect(history).toHaveLength(3)
    })

    it('should clear log history', () => {
      hydraLogger.logOperationStart('initialize')
      hydraLogger.logOperationStart('commit')
      
      expect(hydraLogger.getHistory()).toHaveLength(2)
      
      hydraLogger.clearHistory()
      expect(hydraLogger.getHistory()).toHaveLength(0)
    })

    it('should limit history to MAX_HISTORY entries', () => {
      // Log more than MAX_HISTORY (100) entries
      for (let i = 0; i < 150; i++) {
        hydraLogger.info(`Log entry ${i}`)
      }
      
      const history = hydraLogger.getHistory()
      expect(history.length).toBeLessThanOrEqual(100)
    })
  })

  describe('Log Filtering', () => {
    beforeEach(() => {
      hydraLogger.logOperationStart('initialize')
      hydraLogger.logOperationStart('commit')
      hydraLogger.logOperationError('commit', new Error('Test'), 'Context')
      hydraLogger.logOperationComplete('initialize')
    })

    it('should filter logs by operation', () => {
      const initLogs = hydraLogger.getLogsByOperation('initialize')
      expect(initLogs).toHaveLength(2)
      expect(initLogs.every(log => log.operation === 'initialize')).toBe(true)
      
      const commitLogs = hydraLogger.getLogsByOperation('commit')
      expect(commitLogs).toHaveLength(2)
    })

    it('should filter logs by level', () => {
      const infoLogs = hydraLogger.getLogsByLevel('info')
      expect(infoLogs.length).toBeGreaterThan(0)
      expect(infoLogs.every(log => log.level === 'info')).toBe(true)
      
      const errorLogs = hydraLogger.getLogsByLevel('error')
      expect(errorLogs).toHaveLength(1)
    })

    it('should get error logs only', () => {
      const errors = hydraLogger.getErrors()
      expect(errors).toHaveLength(1)
      expect(errors[0].level).toBe('error')
      expect(errors[0].operation).toBe('commit')
    })
  })

  describe('Log Export', () => {
    it('should export logs as JSON', () => {
      hydraLogger.logOperationStart('initialize')
      hydraLogger.logOperationComplete('initialize')
      
      const exported = hydraLogger.exportLogs()
      const parsed = JSON.parse(exported)
      
      expect(Array.isArray(parsed)).toBe(true)
      expect(parsed).toHaveLength(2)
      expect(parsed[0]).toHaveProperty('timestamp')
      expect(parsed[0]).toHaveProperty('level')
      expect(parsed[0]).toHaveProperty('operation')
      expect(parsed[0]).toHaveProperty('message')
    })
  })

  describe('General Logging Methods', () => {
    it('should log info messages', () => {
      hydraLogger.info('Test info message')
      
      const history = hydraLogger.getHistory()
      expect(history).toHaveLength(1)
      expect(history[0].level).toBe('info')
      expect(history[0].message).toContain('Test info message')
    })

    it('should log warning messages', () => {
      hydraLogger.warn('Test warning message')
      
      const history = hydraLogger.getHistory()
      expect(history).toHaveLength(1)
      expect(history[0].level).toBe('warn')
      expect(history[0].message).toContain('Test warning message')
    })

    it('should log debug messages only in debug mode', () => {
      hydraLogger.debug('general', 'Debug message')
      expect(hydraLogger.getHistory()).toHaveLength(0)
      
      hydraLogger.setDebugMode(true)
      hydraLogger.debug('general', 'Debug message')
      expect(hydraLogger.getHistory()).toHaveLength(1)
    })
  })

  describe('Timestamp Validation', () => {
    it('should include valid ISO timestamps in all log entries', () => {
      hydraLogger.logOperationStart('initialize')
      
      const history = hydraLogger.getHistory()
      const timestamp = history[0].timestamp
      
      // Validate ISO 8601 format
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      
      // Validate it's a valid date
      const date = new Date(timestamp)
      expect(date.toString()).not.toBe('Invalid Date')
    })
  })
})
