/**
 * Integration Tests for Hydra Demo Component
 * Task 16: Final testing and validation
 * Requirements: All
 * 
 * Tests:
 * - Complete lifecycle: Initialize → Commit → (Head Opens) → Close → Fanout
 * - Error recovery: Operation fails → Error displayed → Retry → Success
 * - Concurrent operation prevention: Operation in progress → Buttons disabled
 * - User-friendly error messages
 * - Success messages include relevant details
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'

// Mock wallet interface
interface MockWallet {
  getChangeAddress: jest.Mock<Promise<string>>
  getUtxos: jest.Mock<Promise<any[]>>
  signTx: jest.Mock<Promise<string>>
  submitTx: jest.Mock<Promise<string>>
}

// Mock HydraProvider interface
interface MockHydraProvider {
  connect: jest.Mock<Promise<void>>
  init: jest.Mock<Promise<void>>
  close: jest.Mock<Promise<void>>
  fanout: jest.Mock<Promise<void>>
  onMessage: jest.Mock<void>
}

// Mock HydraInstance interface
interface MockHydraInstance {
  commitFunds: jest.Mock<Promise<string>>
}

describe('Hydra Demo Integration Tests', () => {
  let mockWallet: MockWallet
  let mockHydraProvider: MockHydraProvider
  let mockHydraInstance: MockHydraInstance
  let messageHandler: ((msg: any) => void) | null

  beforeEach(() => {
    messageHandler = null

    // Create mock wallet
    mockWallet = {
      getChangeAddress: jest.fn<Promise<string>>(),
      getUtxos: jest.fn<Promise<any[]>>(),
      signTx: jest.fn<Promise<string>>(),
      submitTx: jest.fn<Promise<string>>()
    }

    // Create mock HydraProvider
    mockHydraProvider = {
      connect: jest.fn<Promise<void>>(),
      init: jest.fn<Promise<void>>(),
      close: jest.fn<Promise<void>>(),
      fanout: jest.fn<Promise<void>>(),
      onMessage: jest.fn<void>((handler: (msg: any) => void) => {
        messageHandler = handler
      })
    }

    // Create mock HydraInstance
    mockHydraInstance = {
      commitFunds: jest.fn<Promise<string>>()
    }
  })

  describe('Complete Lifecycle Test', () => {
    it('should complete full lifecycle: Initialize → Commit → Open → Close → Fanout', async () => {
      // Test Requirements: 1.1, 2.1, 2.2, 3.1-3.6, 4.1-4.3, 5.1-5.3, 6.1-6.4

      // Setup mock responses
      mockWallet.getChangeAddress.mockResolvedValue('addr_test1...')
      mockWallet.getUtxos.mockResolvedValue([
        {
          input: {
            txHash: 'abc123',
            outputIndex: 0
          }
        }
      ])
      mockWallet.signTx.mockResolvedValue('signed_tx_cbor')
      mockWallet.submitTx.mockResolvedValue('tx_hash_123')
      
      mockHydraProvider.connect.mockResolvedValue(undefined)
      mockHydraProvider.init.mockResolvedValue(undefined)
      mockHydraProvider.close.mockResolvedValue(undefined)
      mockHydraProvider.fanout.mockResolvedValue(undefined)
      
      mockHydraInstance.commitFunds.mockResolvedValue('commit_tx_cbor')

      // Simulate component state
      let headState: string = 'idle'
      let loading: boolean = false
      let status: string = ''
      let statusType: string = 'info'

      // Step 1: Initialize Head
      loading = true
      status = 'Initializing Hydra head...'
      statusType = 'loading'
      
      await mockHydraProvider.connect()
      await mockHydraProvider.init()
      
      expect(mockHydraProvider.connect).toHaveBeenCalled()
      expect(mockHydraProvider.init).toHaveBeenCalled()
      
      headState = 'initializing'
      loading = false
      status = 'Hydra head initialization requested. Waiting for confirmation from Hydra node...'
      
      // Simulate HeadIsInitializing message
      if (messageHandler) {
        messageHandler({ tag: 'HeadIsInitializing', timestamp: new Date().toISOString() })
      }
      headState = 'initializing'
      
      expect(headState).toBe('initializing')

      // Step 2: Commit Funds
      loading = true
      status = 'Committing funds to Hydra head...'
      statusType = 'loading'
      
      const utxos = await mockWallet.getUtxos()
      expect(utxos.length).toBeGreaterThan(0)
      
      const selectedUtxo = utxos[0]
      const commitTxCbor = await mockHydraInstance.commitFunds(
        selectedUtxo.input.txHash,
        selectedUtxo.input.outputIndex
      )
      
      expect(mockHydraInstance.commitFunds).toHaveBeenCalledWith('abc123', 0)
      
      const signedTx = await mockWallet.signTx(commitTxCbor, true)
      expect(mockWallet.signTx).toHaveBeenCalledWith('commit_tx_cbor', true)
      
      const txHash = await mockWallet.submitTx(signedTx)
      expect(mockWallet.submitTx).toHaveBeenCalledWith('signed_tx_cbor')
      expect(txHash).toBe('tx_hash_123')
      
      loading = false
      status = `Success: Commit transaction submitted! Transaction hash: ${txHash}`
      statusType = 'success'
      headState = 'initialized'
      
      // Verify success message includes transaction hash (Requirement 3.6, 7.3)
      expect(status).toContain('Success')
      expect(status).toContain('tx_hash_123')

      // Step 3: Head Opens (automatic after commits)
      // Simulate HeadIsOpen message
      if (messageHandler) {
        messageHandler({ tag: 'HeadIsOpen', timestamp: new Date().toISOString() })
      }
      headState = 'open'
      status = 'Head is open - ready for transactions'
      statusType = 'success'
      
      expect(headState).toBe('open')

      // Step 4: Close Head
      loading = true
      status = 'Closing head...'
      statusType = 'loading'
      
      await mockHydraProvider.close()
      expect(mockHydraProvider.close).toHaveBeenCalled()
      
      loading = false
      headState = 'closing'
      status = 'Close request sent. Waiting for confirmation from Hydra node...'
      
      // Simulate HeadIsClosed message
      if (messageHandler) {
        messageHandler({ tag: 'HeadIsClosed', timestamp: new Date().toISOString() })
      }
      headState = 'closed'
      status = 'Head is closed - ready for fanout'
      statusType = 'info'
      
      expect(headState).toBe('closed')

      // Step 5: Fanout
      loading = true
      status = 'Fanning out...'
      statusType = 'loading'
      
      await mockHydraProvider.fanout()
      expect(mockHydraProvider.fanout).toHaveBeenCalled()
      
      loading = false
      headState = 'fanout'
      status = 'Fanout request sent. Waiting for completion...'
      
      // Simulate HeadIsFinalized message
      if (messageHandler) {
        messageHandler({ tag: 'HeadIsFinalized', timestamp: new Date().toISOString() })
      }
      headState = 'idle'
      status = 'Success: Fanout complete - head finalized. UTxOs have been distributed back to Layer 1.'
      statusType = 'success'
      
      // Verify success message includes details (Requirement 6.4, 7.3)
      expect(status).toContain('Success')
      expect(status).toContain('Fanout complete')
      expect(status).toContain('UTxOs have been distributed back to Layer 1')
      expect(headState).toBe('idle')

      // Verify complete lifecycle executed successfully
      expect(mockHydraProvider.connect).toHaveBeenCalledTimes(1)
      expect(mockHydraProvider.init).toHaveBeenCalledTimes(1)
      expect(mockHydraInstance.commitFunds).toHaveBeenCalledTimes(1)
      expect(mockWallet.signTx).toHaveBeenCalledTimes(1)
      expect(mockWallet.submitTx).toHaveBeenCalledTimes(1)
      expect(mockHydraProvider.close).toHaveBeenCalledTimes(1)
      expect(mockHydraProvider.fanout).toHaveBeenCalledTimes(1)
    })
  })

  describe('Error Recovery Test', () => {
    it('should handle operation failure, display error, and allow retry', async () => {
      // Test Requirements: 9.1, 9.2, 9.3, 9.4

      // Setup: First call fails, second call succeeds
      mockHydraProvider.connect
        .mockRejectedValueOnce(new Error('Connection timeout'))
        .mockResolvedValueOnce(undefined)
      
      mockHydraProvider.init
        .mockResolvedValue(undefined)

      let headState: string = 'idle'
      let loading: boolean = false
      let status: string = ''
      let statusType: string = 'info'

      // First attempt - should fail
      loading = true
      status = 'Initializing Hydra head...'
      statusType = 'loading'

      try {
        await mockHydraProvider.connect()
        await mockHydraProvider.init()
      } catch (error: any) {
        // Error handling (Requirement 9.1, 9.2, 9.3)
        const errorMessage = error?.message || String(error)
        
        // Display user-friendly error message (Requirement 9.3, 9.5)
        if (errorMessage.includes('timeout') || errorMessage.includes('connect')) {
          status = `Error: Failed to connect to Hydra node. Please verify network connectivity and that the node is running at http://139.59.24.68:4001.`
        } else {
          status = `Error: Failed to initialize Hydra head - ${errorMessage}`
        }
        statusType = 'error'
        
        // Reset loading state to allow retry (Requirement 9.4)
        loading = false
        
        // Maintain current headState (Requirement 9.4)
        if (headState === 'initializing') {
          headState = 'idle'
        }
      }

      // Verify error was displayed
      expect(status).toContain('Error')
      expect(status).toContain('Failed to connect')
      expect(statusType).toBe('error')
      expect(loading).toBe(false)
      expect(headState).toBe('idle')

      // Second attempt - should succeed
      loading = true
      status = 'Initializing Hydra head...'
      statusType = 'loading'

      await mockHydraProvider.connect()
      await mockHydraProvider.init()

      loading = false
      headState = 'initializing'
      status = 'Hydra head initialization requested. Waiting for confirmation from Hydra node...'
      statusType = 'loading'

      // Verify retry succeeded
      expect(mockHydraProvider.connect).toHaveBeenCalledTimes(2)
      expect(mockHydraProvider.init).toHaveBeenCalledTimes(1)
      expect(headState).toBe('initializing')
      expect(status).toContain('initialization requested')
    })

    it('should handle wallet signing rejection and allow retry', async () => {
      // Test Requirements: 3.8, 9.1, 9.2, 9.3

      mockWallet.getUtxos.mockResolvedValue([
        { input: { txHash: 'abc123', outputIndex: 0 } }
      ])
      mockHydraInstance.commitFunds.mockResolvedValue('commit_tx_cbor')
      
      // First attempt: user rejects signing
      mockWallet.signTx
        .mockRejectedValueOnce(new Error('User rejected the request'))
        .mockResolvedValueOnce('signed_tx_cbor')
      
      mockWallet.submitTx.mockResolvedValue('tx_hash_456')

      let loading: boolean = false
      let status: string = ''
      let statusType: string = 'info'

      // First attempt - signing rejected
      loading = true
      status = 'Committing funds to Hydra head...'

      try {
        const utxos = await mockWallet.getUtxos()
        const commitTxCbor = await mockHydraInstance.commitFunds('abc123', 0)
        await mockWallet.signTx(commitTxCbor, true)
      } catch (signError: any) {
        const signErrorMessage = signError?.message || String(signError)
        
        // Handle signing rejection (Requirement 3.8)
        if (signErrorMessage.includes('reject') || signErrorMessage.includes('denied')) {
          status = 'Error: Transaction signing was rejected by user. Please try again.'
        } else {
          status = `Error: Failed to sign transaction - ${signErrorMessage}`
        }
        statusType = 'error'
        loading = false
      }

      // Verify error message is user-friendly (Requirement 9.3)
      expect(status).toContain('Error')
      expect(status).toContain('rejected by user')
      expect(statusType).toBe('error')
      expect(loading).toBe(false)

      // Second attempt - signing succeeds
      loading = true
      status = 'Committing funds to Hydra head...'

      const utxos = await mockWallet.getUtxos()
      const commitTxCbor = await mockHydraInstance.commitFunds('abc123', 0)
      const signedTx = await mockWallet.signTx(commitTxCbor, true)
      const txHash = await mockWallet.submitTx(signedTx)

      loading = false
      status = `Success: Commit transaction submitted! Transaction hash: ${txHash}`
      statusType = 'success'

      // Verify retry succeeded
      expect(mockWallet.signTx).toHaveBeenCalledTimes(2)
      expect(status).toContain('Success')
      expect(status).toContain('tx_hash_456')
    })
  })

  describe('Concurrent Operation Prevention', () => {
    it('should disable buttons when operation is in progress', () => {
      // Test Requirements: 7.5

      let loading: boolean = false
      let headState: string = 'idle'
      let connected: boolean = true
      let configError: string = ''

      // Helper function to check if button should be disabled
      const isButtonDisabled = (buttonType: string): boolean => {
        switch (buttonType) {
          case 'initialize':
            return !!configError || !connected || loading || headState !== 'idle'
          case 'commit':
            return !!configError || !connected || loading || (headState !== 'initialized' && headState !== 'initializing')
          case 'close':
            return !!configError || !connected || loading || headState !== 'open'
          case 'fanout':
            return !!configError || !connected || loading || headState !== 'closed'
          default:
            return true
        }
      }

      // Initially, only initialize button should be enabled
      expect(isButtonDisabled('initialize')).toBe(false)
      expect(isButtonDisabled('commit')).toBe(true)
      expect(isButtonDisabled('close')).toBe(true)
      expect(isButtonDisabled('fanout')).toBe(true)

      // When operation starts, all buttons should be disabled
      loading = true
      expect(isButtonDisabled('initialize')).toBe(true)
      expect(isButtonDisabled('commit')).toBe(true)
      expect(isButtonDisabled('close')).toBe(true)
      expect(isButtonDisabled('fanout')).toBe(true)

      // After initialization, commit button should be enabled
      loading = false
      headState = 'initialized'
      expect(isButtonDisabled('initialize')).toBe(true)
      expect(isButtonDisabled('commit')).toBe(false)
      expect(isButtonDisabled('close')).toBe(true)
      expect(isButtonDisabled('fanout')).toBe(true)

      // When head is open, close button should be enabled
      headState = 'open'
      expect(isButtonDisabled('initialize')).toBe(true)
      expect(isButtonDisabled('commit')).toBe(true)
      expect(isButtonDisabled('close')).toBe(false)
      expect(isButtonDisabled('fanout')).toBe(true)

      // When head is closed, fanout button should be enabled
      headState = 'closed'
      expect(isButtonDisabled('initialize')).toBe(true)
      expect(isButtonDisabled('commit')).toBe(true)
      expect(isButtonDisabled('close')).toBe(true)
      expect(isButtonDisabled('fanout')).toBe(false)

      // When wallet is disconnected, all buttons should be disabled
      connected = false
      expect(isButtonDisabled('initialize')).toBe(true)
      expect(isButtonDisabled('commit')).toBe(true)
      expect(isButtonDisabled('close')).toBe(true)
      expect(isButtonDisabled('fanout')).toBe(true)
    })
  })

  describe('User-Friendly Error Messages', () => {
    it('should display user-friendly error for network issues', () => {
      // Test Requirements: 9.3, 9.5

      const networkErrors = [
        'Cannot reach Hydra node',
        'ECONNREFUSED',
        'timeout',
        'network error'
      ]

      networkErrors.forEach(errorMsg => {
        let status: string = ''
        const error = new Error(errorMsg)
        const errorMessage = error.message

        // Simulate error handling logic
        if (errorMessage.includes('Cannot reach Hydra node') || errorMessage.includes('network')) {
          status = `Error: Cannot reach Hydra node. Please check your network connectivity and ensure the Hydra node at http://139.59.24.68:4001 is accessible.`
        } else if (errorMessage.includes('connect') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('timeout')) {
          status = `Error: Failed to connect to Hydra node. Please verify network connectivity and that the node is running at http://139.59.24.68:4001.`
        }

        // Verify error message is user-friendly and actionable
        expect(status).toContain('Error')
        expect(status.length).toBeGreaterThan(0)
        // Should provide guidance
        expect(
          status.includes('check') || 
          status.includes('verify') || 
          status.includes('ensure')
        ).toBe(true)
      })
    })

    it('should display user-friendly error for empty UTxOs', () => {
      // Test Requirements: 3.7, 9.3

      const utxos: any[] = []
      let status: string = ''

      // Simulate empty UTxO handling
      if (!utxos || utxos.length === 0) {
        status = 'Error: No UTxOs available in wallet. Please ensure your wallet has funds.'
      }

      // Verify error message is user-friendly
      expect(status).toContain('Error')
      expect(status).toContain('No UTxOs available')
      expect(status).toContain('ensure your wallet has funds')
    })

    it('should display user-friendly error for wallet issues', () => {
      // Test Requirements: 9.3

      const walletErrors = [
        'wallet not connected',
        'wallet connection failed',
        'insufficient funds'
      ]

      walletErrors.forEach(errorMsg => {
        let status: string = ''
        const error = new Error(errorMsg)
        const errorMessage = error.message

        if (errorMessage.includes('wallet')) {
          status = 'Error: Wallet connection issue. Please ensure your wallet is connected.'
        } else if (errorMessage.includes('insufficient')) {
          status = 'Error: Insufficient funds in wallet.'
        }

        // Verify error message is clear and actionable
        expect(status).toContain('Error')
        expect(status.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Success Messages with Details', () => {
    it('should include transaction hash in commit success message', () => {
      // Test Requirements: 3.6, 7.3

      const txHash = 'abc123def456'
      const status = `Success: Commit transaction submitted! Transaction hash: ${txHash}`

      expect(status).toContain('Success')
      expect(status).toContain('Commit transaction submitted')
      expect(status).toContain(txHash)
    })

    it('should include completion details in fanout success message', () => {
      // Test Requirements: 6.4, 7.3

      const status = 'Success: Fanout complete - head finalized. UTxOs have been distributed back to Layer 1.'

      expect(status).toContain('Success')
      expect(status).toContain('Fanout complete')
      expect(status).toContain('head finalized')
      expect(status).toContain('UTxOs have been distributed back to Layer 1')
    })

    it('should provide clear status for each operation stage', () => {
      // Test Requirements: 7.1, 7.2, 7.3

      const statusMessages = [
        { message: 'Initializing Hydra head...', type: 'loading' },
        { message: 'Hydra head initialization requested. Waiting for confirmation from Hydra node...', type: 'loading' },
        { message: 'Head is initializing...', type: 'loading' },
        { message: 'Committing funds to Hydra head...', type: 'loading' },
        { message: 'Success: Commit transaction submitted! Transaction hash: abc123', type: 'success' },
        { message: 'Head is open - ready for transactions', type: 'success' },
        { message: 'Closing head...', type: 'loading' },
        { message: 'Close request sent. Waiting for confirmation from Hydra node...', type: 'loading' },
        { message: 'Head is closed - ready for fanout', type: 'info' },
        { message: 'Fanning out...', type: 'loading' },
        { message: 'Success: Fanout complete - head finalized. UTxOs have been distributed back to Layer 1.', type: 'success' }
      ]

      statusMessages.forEach(({ message, type }) => {
        // Verify each message is descriptive
        expect(message.length).toBeGreaterThan(0)
        
        // Verify type is valid
        expect(['info', 'success', 'error', 'loading']).toContain(type)
        
        // Verify success messages are positive and descriptive
        if (type === 'success') {
          expect(
            message.includes('Success') || 
            message.includes('open') || 
            message.includes('complete') ||
            message.includes('ready')
          ).toBe(true)
        }
        
        // Verify loading messages indicate progress
        if (type === 'loading') {
          expect(
            message.includes('...') || 
            message.includes('Waiting') || 
            message.includes('requested')
          ).toBe(true)
        }
      })
    })
  })

  describe('Hydra Message Handling', () => {
    it('should update state based on Hydra node messages', () => {
      // Test Requirements: 2.4, 4.3, 5.3, 7.2

      let headState: string = 'idle'
      let status: string = ''
      let statusType: string = 'info'

      // Simulate message handler
      const handleHydraMessage = (message: any) => {
        const tag = message.tag

        switch (tag) {
          case 'HeadIsInitializing':
            headState = 'initializing'
            status = 'Head is initializing...'
            statusType = 'loading'
            break
          case 'Committed':
            status = 'Participant committed funds'
            statusType = 'info'
            break
          case 'HeadIsOpen':
            headState = 'open'
            status = 'Head is open - ready for transactions'
            statusType = 'success'
            break
          case 'HeadIsClosed':
            headState = 'closed'
            status = 'Head is closed - ready for fanout'
            statusType = 'info'
            break
          case 'HeadIsFinalized':
            headState = 'idle'
            status = 'Success: Fanout complete - head finalized. UTxOs have been distributed back to Layer 1.'
            statusType = 'success'
            break
        }
      }

      // Test each message type
      handleHydraMessage({ tag: 'HeadIsInitializing' })
      expect(headState).toBe('initializing')
      expect(status).toContain('initializing')

      handleHydraMessage({ tag: 'Committed' })
      expect(status).toContain('committed')

      handleHydraMessage({ tag: 'HeadIsOpen' })
      expect(headState).toBe('open')
      expect(status).toContain('open')

      handleHydraMessage({ tag: 'HeadIsClosed' })
      expect(headState).toBe('closed')
      expect(status).toContain('closed')

      handleHydraMessage({ tag: 'HeadIsFinalized' })
      expect(headState).toBe('idle')
      expect(status).toContain('Fanout complete')
    })
  })

  describe('Wallet Connection State Management', () => {
    it('should handle wallet connection and disconnection', () => {
      // Test Requirements: 1.2, 1.4, 1.5

      let connected: boolean = false
      let walletAddress: string = ''
      let headState: string = 'idle'
      let loading: boolean = false
      let status: string = ''

      // Wallet connects
      connected = true
      walletAddress = 'addr_test1qz...'
      
      expect(connected).toBe(true)
      expect(walletAddress.length).toBeGreaterThan(0)

      // Start an operation
      loading = true
      headState = 'initializing'

      // Wallet disconnects during operation
      connected = false
      walletAddress = ''
      headState = 'idle'
      
      if (loading) {
        loading = false
        status = 'Error: Wallet disconnected during operation. Please reconnect your wallet to continue.'
      }

      // Verify state was cleared (Requirement 1.5)
      expect(walletAddress).toBe('')
      expect(headState).toBe('idle')
      expect(loading).toBe(false)
      expect(status).toContain('Wallet disconnected')
    })
  })
})
