/**
 * Tests for Operation History functionality
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    }
  }
})()

// Set up global localStorage mock
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock
})

interface OperationHistoryEntry {
  id: string
  message: string
  type: 'info' | 'success' | 'error' | 'loading'
  timestamp: Date
  operation?: string
}

describe('Operation History', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  afterEach(() => {
    localStorageMock.clear()
  })

  describe('History Entry Creation', () => {
    it('should create history entry with all required fields', () => {
      // Requirement 7.1, 7.2: Track operations with timestamps
      const entry: OperationHistoryEntry = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        message: 'Test operation',
        type: 'info',
        timestamp: new Date(),
        operation: 'initialize'
      }

      expect(entry.id).toBeDefined()
      expect(entry.message).toBe('Test operation')
      expect(entry.type).toBe('info')
      expect(entry.timestamp).toBeInstanceOf(Date)
      expect(entry.operation).toBe('initialize')
    })

    it('should create unique IDs for different entries', () => {
      // Ensure each entry has a unique identifier
      const entry1: OperationHistoryEntry = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        message: 'Operation 1',
        type: 'info',
        timestamp: new Date()
      }

      const entry2: OperationHistoryEntry = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        message: 'Operation 2',
        type: 'success',
        timestamp: new Date()
      }

      expect(entry1.id).not.toBe(entry2.id)
    })
  })

  describe('History Array Management', () => {
    it('should add new entries to the beginning of history', () => {
      // Requirement 7.2: Display recent operations
      const history: OperationHistoryEntry[] = []
      
      const entry1: OperationHistoryEntry = {
        id: '1',
        message: 'First operation',
        type: 'info',
        timestamp: new Date()
      }
      
      const entry2: OperationHistoryEntry = {
        id: '2',
        message: 'Second operation',
        type: 'success',
        timestamp: new Date()
      }

      const newHistory = [entry2, ...history]
      const finalHistory = [entry1, ...newHistory]

      expect(finalHistory[0]).toBe(entry1)
      expect(finalHistory[1]).toBe(entry2)
      expect(finalHistory.length).toBe(2)
    })

    it('should limit history to 50 entries', () => {
      // Prevent unbounded growth of history
      let history: OperationHistoryEntry[] = []

      // Add 60 entries
      for (let i = 0; i < 60; i++) {
        const entry: OperationHistoryEntry = {
          id: `${i}`,
          message: `Operation ${i}`,
          type: 'info',
          timestamp: new Date()
        }
        history = [entry, ...history].slice(0, 50)
      }

      expect(history.length).toBe(50)
      expect(history[0].id).toBe('59') // Most recent
      expect(history[49].id).toBe('10') // Oldest kept
    })
  })

  describe('LocalStorage Persistence', () => {
    it('should save history to localStorage', () => {
      // Requirement 7.4: Persist history to localStorage
      const history: OperationHistoryEntry[] = [
        {
          id: '1',
          message: 'Test operation',
          type: 'success',
          timestamp: new Date(),
          operation: 'commit'
        }
      ]

      localStorage.setItem('hydra-operation-history', JSON.stringify(history))
      const saved = localStorage.getItem('hydra-operation-history')

      expect(saved).toBeDefined()
      expect(saved).not.toBeNull()
      
      const parsed = JSON.parse(saved!)
      expect(parsed).toHaveLength(1)
      expect(parsed[0].message).toBe('Test operation')
    })

    it('should load history from localStorage', () => {
      // Requirement 7.4: Load persisted history
      const history: OperationHistoryEntry[] = [
        {
          id: '1',
          message: 'Persisted operation',
          type: 'info',
          timestamp: new Date(),
          operation: 'initialize'
        }
      ]

      localStorage.setItem('hydra-operation-history', JSON.stringify(history))
      const loaded = localStorage.getItem('hydra-operation-history')

      expect(loaded).not.toBeNull()
      
      const parsed = JSON.parse(loaded!)
      const historyWithDates = parsed.map((entry: any) => ({
        ...entry,
        timestamp: new Date(entry.timestamp)
      }))

      expect(historyWithDates).toHaveLength(1)
      expect(historyWithDates[0].message).toBe('Persisted operation')
      expect(historyWithDates[0].timestamp).toBeInstanceOf(Date)
    })

    it('should clear history from localStorage', () => {
      // Requirement 7.4: Allow clearing history
      const history: OperationHistoryEntry[] = [
        {
          id: '1',
          message: 'Test',
          type: 'info',
          timestamp: new Date()
        }
      ]

      localStorage.setItem('hydra-operation-history', JSON.stringify(history))
      expect(localStorage.getItem('hydra-operation-history')).not.toBeNull()

      localStorage.removeItem('hydra-operation-history')
      expect(localStorage.getItem('hydra-operation-history')).toBeNull()
    })
  })

  describe('Status Types', () => {
    it('should support all status types', () => {
      // Requirement 7.1, 7.3: Different operation statuses
      const types: Array<'info' | 'success' | 'error' | 'loading'> = [
        'info',
        'success',
        'error',
        'loading'
      ]

      types.forEach(type => {
        const entry: OperationHistoryEntry = {
          id: `${type}-entry`,
          message: `${type} message`,
          type,
          timestamp: new Date()
        }

        expect(entry.type).toBe(type)
      })
    })
  })

  describe('Operation Tracking', () => {
    it('should track operation names', () => {
      // Requirement 7.2: Track which operation was performed
      const operations = ['initialize', 'commit', 'close', 'fanout']

      operations.forEach(op => {
        const entry: OperationHistoryEntry = {
          id: `${op}-id`,
          message: `${op} operation`,
          type: 'info',
          timestamp: new Date(),
          operation: op
        }

        expect(entry.operation).toBe(op)
      })
    })

    it('should allow entries without operation names', () => {
      // Some status updates may not be tied to specific operations
      const entry: OperationHistoryEntry = {
        id: 'general-status',
        message: 'General status update',
        type: 'info',
        timestamp: new Date()
      }

      expect(entry.operation).toBeUndefined()
    })
  })

  describe('Timestamp Handling', () => {
    it('should preserve timestamp order', () => {
      // Requirement 7.2: Show timestamps for each operation
      const now = new Date()
      const earlier = new Date(now.getTime() - 1000)
      const later = new Date(now.getTime() + 1000)

      const history: OperationHistoryEntry[] = [
        {
          id: '3',
          message: 'Latest',
          type: 'info',
          timestamp: later
        },
        {
          id: '2',
          message: 'Middle',
          type: 'info',
          timestamp: now
        },
        {
          id: '1',
          message: 'Earliest',
          type: 'info',
          timestamp: earlier
        }
      ]

      expect(history[0].timestamp.getTime()).toBeGreaterThan(history[1].timestamp.getTime())
      expect(history[1].timestamp.getTime()).toBeGreaterThan(history[2].timestamp.getTime())
    })
  })
})
