"use client"

import React, { useState, useCallback, useRef, useEffect } from "react"
import { useWallet } from "@meshsdk/react"
import { BlockfrostProvider } from "@meshsdk/core"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { HydraProvider, HydraInstance } from "@meshsdk/hydra"
import { AlertCircle, CheckCircle2, Info, Loader2, Wallet, PlayCircle, Upload, XCircle, Download, Bug, History, Trash2, Clock } from "lucide-react"
import { hydraLogger } from "@/lib/hydra-logger"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

// Configuration constants
const HYDRA_NODE_URL = "http://139.59.24.68:4001"
const BLOCKFROST_API_KEY = process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY

// Validate configuration
const isConfigValid = (): boolean => {
  return !!BLOCKFROST_API_KEY && BLOCKFROST_API_KEY.trim() !== ''
}

// Initialize BlockfrostProvider for Layer 1 operations (only if config is valid)
const blockfrostProvider = isConfigValid() 
  ? new BlockfrostProvider(BLOCKFROST_API_KEY!) 
  : null

type HeadState = 'idle' | 'initializing' | 'initialized' | 'open' | 'closing' | 'closed' | 'fanout'
type StatusType = 'info' | 'success' | 'error' | 'loading'

// Operation status history entry
interface OperationHistoryEntry {
  id: string
  message: string
  type: StatusType
  timestamp: Date
  operation?: string
}

export default function HydraDemo() {
  const { connected, wallet } = useWallet()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string>("")
  const [statusType, setStatusType] = useState<StatusType>('info')
  const [headState, setHeadState] = useState<HeadState>('idle')
  const [walletAddress, setWalletAddress] = useState<string>("")
  const [configError, setConfigError] = useState<string>("")
  const [debugMode, setDebugMode] = useState<boolean>(false)
  const [operationHistory, setOperationHistory] = useState<OperationHistoryEntry[]>([])
  const [historyOpen, setHistoryOpen] = useState<boolean>(false)
  
  // Singleton pattern for HydraProvider and HydraInstance
  const hydraProviderRef = useRef<HydraProvider | null>(null)
  const hydraInstanceRef = useRef<HydraInstance | null>(null)
  const messageHandlerRegistered = useRef<boolean>(false)

  // Validate configuration on component mount
  useEffect(() => {
    hydraLogger.info('HydraDemo component mounted')
    
    if (!isConfigValid()) {
      const errorMsg = 'Configuration Error: NEXT_PUBLIC_BLOCKFROST_API_KEY environment variable is missing or empty. Please add it to your .env file.'
      setConfigError(errorMsg)
      updateStatus(errorMsg, 'error')
      hydraLogger.logOperationError('general', new Error(errorMsg), 'Configuration validation')
    } else {
      setConfigError("")
      hydraLogger.info('Configuration validated successfully')
    }
  }, [])

  // Sync debug mode with logger
  useEffect(() => {
    hydraLogger.setDebugMode(debugMode)
  }, [debugMode])

  // Load operation history from localStorage on mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('hydra-operation-history')
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory)
        // Convert timestamp strings back to Date objects
        const historyWithDates = parsed.map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp)
        }))
        setOperationHistory(historyWithDates)
        hydraLogger.debug('general', `Loaded ${historyWithDates.length} history entries from localStorage`)
      }
    } catch (error) {
      hydraLogger.logOperationError('general', error, 'Failed to load operation history from localStorage')
    }
  }, [])

  // Save operation history to localStorage whenever it changes
  useEffect(() => {
    try {
      if (operationHistory.length > 0) {
        localStorage.setItem('hydra-operation-history', JSON.stringify(operationHistory))
        hydraLogger.debug('general', `Saved ${operationHistory.length} history entries to localStorage`)
      }
    } catch (error) {
      hydraLogger.logOperationError('general', error, 'Failed to save operation history to localStorage')
    }
  }, [operationHistory])

  // Fetch wallet address when wallet connects
  useEffect(() => {
    const fetchWalletAddress = async () => {
      if (connected && wallet) {
        try {
          hydraLogger.logOperationStart('general', { action: 'fetch_wallet_address' })
          const address = await wallet.getChangeAddress()
          setWalletAddress(address)
          hydraLogger.logOperationComplete('general', { address })
        } catch (error) {
          hydraLogger.logOperationError('general', error, 'Failed to fetch wallet address')
        }
      } else {
        setWalletAddress("")
        if (!connected) {
          hydraLogger.info('Wallet disconnected')
        }
      }
    }
    fetchWalletAddress()
  }, [connected, wallet])

  // Helper function to update status with type and add to history
  const updateStatus = useCallback((message: string, type: StatusType, operation?: string) => {
    setStatus(message)
    setStatusType(type)
    
    // Add to operation history
    const historyEntry: OperationHistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message,
      type,
      timestamp: new Date(),
      operation
    }
    
    setOperationHistory(prev => [historyEntry, ...prev].slice(0, 50)) // Keep last 50 entries
  }, [])

  // Clear operation history
  const clearHistory = useCallback(() => {
    setOperationHistory([])
    localStorage.removeItem('hydra-operation-history')
    hydraLogger.info('Operation history cleared')
  }, [])

  // Handle wallet disconnection - clear all state and show reconnection prompt
  // Requirements: 1.4, 1.5
  useEffect(() => {
    // Only handle disconnection if we previously had a wallet connected
    if (!connected && walletAddress) {
      hydraLogger.info('Wallet disconnected - clearing all state')
      
      // Clear all state when wallet disconnects (Requirement 1.5)
      setWalletAddress("")
      setHeadState('idle')
      
      // Show reconnection prompt if wallet disconnects during operation (Requirement 1.4)
      if (loading) {
        setLoading(false)
        updateStatus('Error: Wallet disconnected during operation. Please reconnect your wallet to continue.', 'error')
      } else {
        updateStatus('Wallet disconnected. Please reconnect to perform Hydra operations.', 'info')
      }
      
      // Clear Hydra provider instances to ensure clean state
      hydraProviderRef.current = null
      hydraInstanceRef.current = null
      messageHandlerRegistered.current = false
    }
  }, [connected, walletAddress, loading, updateStatus])

  /**
   * Handle messages received from the Hydra node
   * Updates application state based on message tags
   */
  const handleHydraMessage = useCallback((message: any) => {
    // Log all Hydra node messages with timestamps (Requirement 9.2)
    hydraLogger.logHydraMessage(message)
    
    const tag = message.tag
    
    // Update head state based on message tags
    switch (tag) {
      case 'HeadIsInitializing':
        setHeadState('initializing')
        updateStatus('Head is initializing...', 'loading')
        break
      case 'Committed':
        updateStatus('Participant committed funds', 'info')
        break
      case 'HeadIsOpen':
        setHeadState('open')
        updateStatus('Head is open - ready for transactions', 'success')
        break
      case 'HeadIsClosed':
        setHeadState('closed')
        updateStatus('Head is closed - ready for fanout', 'info')
        break
      case 'HeadIsFinalized':
        setHeadState('idle')
        updateStatus('Success: Fanout complete - head finalized. UTxOs have been distributed back to Layer 1.', 'success')
        break
      case 'SnapshotConfirmed':
        console.log('Snapshot confirmed in head:', message)
        break
      default:
        console.log('Unhandled message tag:', tag)
    }
  }, [updateStatus])

  /**
   * Setup and configure HydraProvider with singleton pattern
   * Initializes provider with configured URL and registers message handler
   * @returns Configured HydraProvider instance
   * @throws Error if provider cannot be created or connection fails
   */
  const setupHydraProvider = useCallback(async (): Promise<HydraProvider> => {
    try {
      // Return existing instance if already created (singleton pattern)
      if (hydraProviderRef.current) {
        hydraLogger.debug('connection', 'Reusing existing HydraProvider instance')
        return hydraProviderRef.current
      }

      hydraLogger.logConnection('connecting', { url: HYDRA_NODE_URL })
      
      // Create new HydraProvider instance
      const hydraProvider = new HydraProvider({ 
        httpUrl: HYDRA_NODE_URL 
      })
      
      // Store in ref for singleton pattern
      hydraProviderRef.current = hydraProvider
      
      // Register message handler only once
      if (!messageHandlerRegistered.current) {
        hydraLogger.debug('connection', 'Registering Hydra message handler')
        hydraProvider.onMessage(handleHydraMessage)
        messageHandlerRegistered.current = true
      }
      
      // Test connection to Hydra node
      try {
        await hydraProvider.connect()
        hydraLogger.logConnection('connected', { url: HYDRA_NODE_URL })
        updateStatus('Connected to Hydra node', 'success')
      } catch (connectionError: any) {
        hydraLogger.logConnection('error', { 
          url: HYDRA_NODE_URL, 
          error: hydraLogger.formatErrorMessage(connectionError) 
        })
        const connErrorMsg = connectionError?.message || String(connectionError)
        throw new Error(`Cannot reach Hydra node at ${HYDRA_NODE_URL}. Please check network connectivity. Details: ${connErrorMsg}`)
      }
      
      return hydraProvider
      
    } catch (error: any) {
      hydraLogger.logOperationError('connection', error, 'Error setting up HydraProvider')
      // Clear the ref if setup failed
      hydraProviderRef.current = null
      messageHandlerRegistered.current = false
      throw error
    }
  }, [handleHydraMessage, updateStatus])

  /**
   * Get or create HydraInstance with BlockfrostProvider for Layer 1 operations
   * Uses singleton pattern to ensure single instance throughout lifecycle
   * @returns Configured HydraInstance
   */
  const getHydraInstance = useCallback(async (): Promise<HydraInstance> => {
    try {
      // Validate configuration before creating instance
      if (!isConfigValid() || !blockfrostProvider) {
        throw new Error('Configuration Error: Blockfrost API key is not configured. Please check your environment variables.')
      }

      // Return existing instance if already created (singleton pattern)
      if (hydraInstanceRef.current) {
        hydraLogger.debug('general', 'Reusing existing HydraInstance')
        return hydraInstanceRef.current
      }

      hydraLogger.logOperationProgress('general', 'Creating HydraInstance with BlockfrostProvider')
      
      // Ensure HydraProvider is set up first
      const hydraProvider = await setupHydraProvider()
      
      // Create HydraInstance with BlockfrostProvider for Layer 1 operations
      const hydraInstance = new HydraInstance({
        provider: hydraProvider,
        fetcher: blockfrostProvider,
        submitter: blockfrostProvider,
      })
      
      // Store in ref for singleton pattern
      hydraInstanceRef.current = hydraInstance
      
      hydraLogger.logOperationComplete('general', { message: 'HydraInstance created successfully' })
      return hydraInstance
      
    } catch (error) {
      hydraLogger.logOperationError('general', error, 'Error creating HydraInstance')
      // Clear the ref if creation failed
      hydraInstanceRef.current = null
      throw error
    }
  }, [setupHydraProvider])

  /**
   * Initialize a new Hydra head
   * Connects to the Hydra provider and sends initialization request to the Hydra node
   * Requirements: 2.1, 2.2, 2.3, 2.5
   */
  const initializeHead = useCallback(async () => {
    // Validate configuration
    if (configError) {
      updateStatus(configError, 'error')
      return
    }

    // Validate wallet connection
    if (!wallet) {
      updateStatus("Error: Please connect your wallet first", 'error')
      return
    }

    setLoading(true)
    updateStatus("Initializing Hydra head...", 'loading')
    
    // Log operation start (Requirement 9.2)
    hydraLogger.logOperationStart('initialize', { walletConnected: true })
    
    try {
      // Connect to Hydra provider (Requirement 2.1)
      hydraLogger.logOperationProgress('initialize', 'Connecting to Hydra provider')
      const hydraProvider = await setupHydraProvider()
      
      // Send initialization request to Hydra node (Requirement 2.2)
      hydraLogger.logOperationProgress('initialize', 'Sending init request to Hydra node')
      await hydraProvider.init()
      
      hydraLogger.logOperationProgress('initialize', 'Init request sent successfully')
      
      // Update UI to show initialized state (Requirement 2.4)
      updateStatus('Hydra head initialization requested. Waiting for confirmation from Hydra node...', 'loading', 'initialize')
      setHeadState('initializing')
      
      // Log operation completion (Requirement 9.2)
      hydraLogger.logOperationComplete('initialize', { state: 'initializing' })
      
    } catch (error: any) {
      // Error handling with user-friendly messages (Requirement 2.5, 9.1, 9.2, 9.3, 9.4, 9.5)
      hydraLogger.logOperationError('initialize', error, 'Hydra head initialization failed')
      const errorMessage = error?.message || String(error)
      
      // Provide specific error messages for common issues (Requirement 9.5)
      if (errorMessage.includes('Cannot reach Hydra node') || errorMessage.includes('network')) {
        updateStatus(`Error: Cannot reach Hydra node. Please check your network connectivity and ensure the Hydra node at ${HYDRA_NODE_URL} is accessible.`, 'error', 'initialize')
      } else if (errorMessage.includes('connect') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('timeout')) {
        updateStatus(`Error: Failed to connect to Hydra node. Please verify network connectivity and that the node is running at ${HYDRA_NODE_URL}.`, 'error', 'initialize')
      } else if (errorMessage.includes('wallet')) {
        updateStatus('Error: Wallet connection issue. Please ensure your wallet is connected.', 'error', 'initialize')
      } else {
        updateStatus(`Error: Failed to initialize Hydra head - ${errorMessage}`, 'error', 'initialize')
      }
      
      // Maintain current headState on error (don't reset unless necessary) - Requirement 9.4
      // Only reset to idle if we're not already in a valid state
      if (headState === 'initializing') {
        setHeadState('idle')
      }
    } finally {
      // Reset loading state to allow retry (Requirement 2.3, 9.4)
      setLoading(false)
    }
  }, [wallet, setupHydraProvider, headState, updateStatus])

  /**
   * Commit funds to the Hydra head
   * Fetches UTxOs from wallet, selects first available, builds commit transaction,
   * requests signature with partialSign flag, and submits to Layer 1
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
   */
  const commitFunds = useCallback(async () => {
    // Validate configuration
    if (configError) {
      updateStatus(configError, 'error')
      return
    }

    // Validate wallet connection
    if (!wallet) {
      updateStatus("Error: Please connect your wallet first", 'error')
      return
    }

    setLoading(true)
    updateStatus("Committing funds to Hydra head...", 'loading')
    
    // Log operation start (Requirement 9.2)
    hydraLogger.logOperationStart('commit', { walletConnected: true })
    
    try {
      // Fetch available UTxOs from connected wallet (Requirement 3.1)
      hydraLogger.logOperationProgress('commit', 'Fetching UTxOs from wallet')
      const utxos = await wallet.getUtxos()
      
      hydraLogger.logOperationProgress('commit', `Found ${utxos.length} UTxOs in wallet`, { count: utxos.length })
      
      // Handle empty UTxO case (Requirement 3.7)
      if (!utxos || utxos.length === 0) {
        updateStatus('Error: No UTxOs available in wallet. Please ensure your wallet has funds.', 'error', 'commit')
        return
      }
      
      // Select first available UTxO (Requirement 3.2)
      const selectedUtxo = utxos[0]
      
      // Parse UTxO to extract transaction hash and output index
      const txHash = selectedUtxo.input.txHash
      const outputIndex = selectedUtxo.input.outputIndex
      
      hydraLogger.logOperationProgress('commit', `Selected UTxO: ${txHash}#${outputIndex}`, { txHash, outputIndex })
      
      // Get HydraInstance for building commit transaction
      const hydraInstance = await getHydraInstance()
      
      // Build commit transaction using HydraInstance (Requirement 3.3)
      hydraLogger.logOperationProgress('commit', 'Building commit transaction')
      const commitTxCbor = await hydraInstance.commitFunds(txHash, outputIndex)
      
      hydraLogger.logOperationProgress('commit', 'Commit transaction built successfully')
      
      // Request wallet signature with partialSign flag set to true (Requirement 3.4)
      hydraLogger.logOperationProgress('commit', 'Requesting wallet signature with partialSign=true')
      let signedTx: string
      
      try {
        signedTx = await wallet.signTx(commitTxCbor, true)
        hydraLogger.logOperationProgress('commit', 'Transaction signed successfully')
      } catch (signError: any) {
        // Handle signing rejection (Requirement 3.8, 9.1, 9.2, 9.3)
        hydraLogger.logOperationError('commit', signError, 'Transaction signing failed')
        const signErrorMessage = signError?.message || String(signError)
        
        if (signErrorMessage.includes('cancel') || signErrorMessage.includes('reject') || signErrorMessage.includes('denied')) {
          updateStatus('Error: Transaction signing was rejected by user. Please try again.', 'error', 'commit')
        } else {
          updateStatus(`Error: Failed to sign transaction - ${signErrorMessage}`, 'error', 'commit')
        }
        return
      }
      
      // Submit signed transaction to Layer 1 (Requirement 3.5)
      hydraLogger.logOperationProgress('commit', 'Submitting signed transaction to Layer 1')
      const txHashResult = await wallet.submitTx(signedTx)
      
      hydraLogger.logOperationComplete('commit', { txHash: txHashResult })
      
      // Display transaction hash on successful submission (Requirement 3.6)
      updateStatus(`Success: Commit transaction submitted! Transaction hash: ${txHashResult}`, 'success', 'commit')
      setHeadState('initialized')
      
    } catch (error: any) {
      // Error handling with user-friendly messages (Requirement 9.1, 9.2, 9.3, 9.4, 9.5)
      hydraLogger.logOperationError('commit', error, 'Commit funds operation failed')
      const errorMessage = error?.message || String(error)
      
      // Provide specific error messages for common issues (Requirement 9.5)
      if (errorMessage.includes('Cannot reach Hydra node') || errorMessage.includes('network')) {
        updateStatus(`Error: Cannot reach Hydra node. Please check your network connectivity and ensure the Hydra node at ${HYDRA_NODE_URL} is accessible.`, 'error', 'commit')
      } else if (errorMessage.includes('connect') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('timeout')) {
        updateStatus(`Error: Failed to connect to Hydra node. Please verify network connectivity and that the node is running at ${HYDRA_NODE_URL}.`, 'error', 'commit')
      } else if (errorMessage.includes('wallet')) {
        updateStatus('Error: Wallet connection issue. Please ensure your wallet is connected.', 'error', 'commit')
      } else if (errorMessage.includes('insufficient')) {
        updateStatus('Error: Insufficient funds in wallet.', 'error', 'commit')
      } else if (errorMessage.includes('UTxO') || errorMessage.includes('utxo')) {
        updateStatus(`Error: UTxO operation failed - ${errorMessage}`, 'error', 'commit')
      } else {
        updateStatus(`Error: Failed to commit funds - ${errorMessage}`, 'error', 'commit')
      }
      
      // Maintain current headState on error (don't reset unless necessary) - Requirement 9.4
      // headState remains as is to allow retry
    } finally {
      // Reset loading state to allow retry (Requirement 9.4)
      setLoading(false)
    }
  }, [wallet, getHydraInstance, updateStatus])

  /**
   * Close the Hydra head
   * Sends close request to Hydra node to finalize the head state
   * Requirements: 5.1, 5.2, 5.3, 5.5
   */
  const closeHead = useCallback(async () => {
    // Validate configuration
    if (configError) {
      updateStatus(configError, 'error')
      return
    }

    // Validate wallet connection
    if (!wallet) {
      updateStatus("Error: Please connect your wallet first", 'error')
      return
    }

    setLoading(true)
    updateStatus("Closing head...", 'loading')
    
    // Log operation start (Requirement 9.2)
    hydraLogger.logOperationStart('close', { walletConnected: true })
    
    try {
      // Get HydraProvider instance
      const hydraProvider = await setupHydraProvider()
      
      // Send close request to Hydra node (Requirement 5.1)
      hydraLogger.logOperationProgress('close', 'Sending close request to Hydra node')
      await hydraProvider.close()
      
      hydraLogger.logOperationProgress('close', 'Close request sent successfully')
      
      // Update UI status (Requirement 5.2)
      updateStatus('Close request sent. Waiting for confirmation from Hydra node...', 'loading', 'close')
      setHeadState('closing')
      
      // Log operation completion (Requirement 9.2)
      hydraLogger.logOperationComplete('close', { state: 'closing' })
      
    } catch (error: any) {
      // Error handling with user-friendly messages (Requirement 5.5, 9.1, 9.2, 9.3, 9.4, 9.5)
      hydraLogger.logOperationError('close', error, 'Close head operation failed')
      const errorMessage = error?.message || String(error)
      
      // Provide specific error messages for common issues (Requirement 9.5)
      if (errorMessage.includes('Cannot reach Hydra node') || errorMessage.includes('network')) {
        updateStatus(`Error: Cannot reach Hydra node. Please check your network connectivity and ensure the Hydra node at ${HYDRA_NODE_URL} is accessible.`, 'error', 'close')
      } else if (errorMessage.includes('connect') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('timeout')) {
        updateStatus(`Error: Failed to connect to Hydra node. Please verify network connectivity and that the node is running at ${HYDRA_NODE_URL}.`, 'error', 'close')
      } else {
        updateStatus(`Error: Failed to close head - ${errorMessage}`, 'error', 'close')
      }
      
      // Maintain current headState on error (don't reset unless necessary) - Requirement 9.4
      // headState remains as is to allow retry
    } finally {
      // Reset loading state to allow retry (Requirement 9.4)
      setLoading(false)
    }
  }, [wallet, setupHydraProvider, updateStatus])

  /**
   * Fanout the closed Hydra head
   * Distributes final UTxOs from closed head back to Layer 1
   * Requirements: 6.1, 6.2, 6.4, 6.5
   */
  const fanoutHead = useCallback(async () => {
    // Validate configuration
    if (configError) {
      updateStatus(configError, 'error')
      return
    }

    // Validate wallet connection
    if (!wallet) {
      updateStatus("Error: Please connect your wallet first", 'error')
      return
    }

    setLoading(true)
    updateStatus("Fanning out...", 'loading')
    
    // Log operation start (Requirement 9.2)
    hydraLogger.logOperationStart('fanout', { walletConnected: true })
    
    try {
      // Get HydraProvider instance
      const hydraProvider = await setupHydraProvider()
      
      // Send fanout request to Hydra node (Requirement 6.1)
      hydraLogger.logOperationProgress('fanout', 'Sending fanout request to Hydra node')
      await hydraProvider.fanout()
      
      hydraLogger.logOperationProgress('fanout', 'Fanout request sent successfully')
      
      // Update UI status (Requirement 6.2)
      updateStatus('Fanout request sent. Waiting for completion...', 'loading', 'fanout')
      setHeadState('fanout')
      
      // Log operation completion (Requirement 9.2)
      hydraLogger.logOperationComplete('fanout', { state: 'fanout' })
      
    } catch (error: any) {
      // Error handling with user-friendly messages (Requirement 6.5, 9.1, 9.2, 9.3, 9.4, 9.5)
      hydraLogger.logOperationError('fanout', error, 'Fanout operation failed')
      const errorMessage = error?.message || String(error)
      
      // Provide specific error messages for common issues (Requirement 9.5)
      if (errorMessage.includes('Cannot reach Hydra node') || errorMessage.includes('network')) {
        updateStatus(`Error: Cannot reach Hydra node. Please check your network connectivity and ensure the Hydra node at ${HYDRA_NODE_URL} is accessible.`, 'error', 'fanout')
      } else if (errorMessage.includes('connect') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('timeout')) {
        updateStatus(`Error: Failed to connect to Hydra node. Please verify network connectivity and that the node is running at ${HYDRA_NODE_URL}.`, 'error', 'fanout')
      } else {
        updateStatus(`Error: Failed to fanout - ${errorMessage}`, 'error', 'fanout')
      }
      
      // Maintain current headState on error (don't reset unless necessary) - Requirement 9.4
      // headState remains as is to allow retry
    } finally {
      // Reset loading state to allow retry (Requirement 9.4)
      setLoading(false)
    }
  }, [wallet, setupHydraProvider, updateStatus])

  // Helper function to get head state badge variant and color
  const getHeadStateBadge = () => {
    switch (headState) {
      case 'idle':
        return { variant: 'outline' as const, color: 'text-gray-600', label: 'Idle' }
      case 'initializing':
        return { variant: 'default' as const, color: 'text-blue-600', label: 'Initializing' }
      case 'initialized':
        return { variant: 'default' as const, color: 'text-blue-600', label: 'Initialized' }
      case 'open':
        return { variant: 'default' as const, color: 'text-green-600', label: 'Open' }
      case 'closing':
        return { variant: 'default' as const, color: 'text-yellow-600', label: 'Closing' }
      case 'closed':
        return { variant: 'default' as const, color: 'text-orange-600', label: 'Closed' }
      case 'fanout':
        return { variant: 'default' as const, color: 'text-purple-600', label: 'Fanout' }
      default:
        return { variant: 'outline' as const, color: 'text-gray-600', label: headState }
    }
  }

  // Helper function to get status display styling
  const getStatusDisplay = () => {
    switch (statusType) {
      case 'info':
        return {
          bgColor: 'bg-blue-50 dark:bg-blue-950',
          textColor: 'text-blue-800 dark:text-blue-200',
          borderColor: 'border-blue-200 dark:border-blue-800',
          icon: <Info className="h-5 w-5" />
        }
      case 'success':
        return {
          bgColor: 'bg-green-50 dark:bg-green-950',
          textColor: 'text-green-800 dark:text-green-200',
          borderColor: 'border-green-200 dark:border-green-800',
          icon: <CheckCircle2 className="h-5 w-5" />
        }
      case 'error':
        return {
          bgColor: 'bg-red-50 dark:bg-red-950',
          textColor: 'text-red-800 dark:text-red-200',
          borderColor: 'border-red-200 dark:border-red-800',
          icon: <AlertCircle className="h-5 w-5" />
        }
      case 'loading':
        return {
          bgColor: 'bg-yellow-50 dark:bg-yellow-950',
          textColor: 'text-yellow-800 dark:text-yellow-200',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
          icon: <Loader2 className="h-5 w-5 animate-spin" />
        }
    }
  }

  const headStateBadge = getHeadStateBadge()
  const statusDisplay = getStatusDisplay()

  return (
    <TooltipProvider>
      <div className="container mx-auto p-4 md:p-6 max-w-4xl">
        <Card className="shadow-lg">
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-2xl md:text-3xl">Hydra Head Operations</CardTitle>
              <Badge variant={headStateBadge.variant} className={`${headStateBadge.color} text-sm px-3 py-1`}>
                {headStateBadge.label}
              </Badge>
            </div>
            <CardDescription>
              Manage the complete lifecycle of a Hydra head on Cardano Layer 2
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Configuration Error Display */}
            {configError && (
              <div className="p-4 rounded-lg border bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 text-red-800 dark:text-red-200">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-800 dark:text-red-200 mb-1">Configuration Error</h3>
                    <p className="text-sm text-red-800 dark:text-red-200 break-words">
                      {configError}
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300 mt-2">
                      All operations are disabled until this is resolved.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Wallet Connection Status */}
            <div className="p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="h-5 w-5" />
                <h3 className="font-semibold">Wallet Status</h3>
              </div>
              {connected && walletAddress ? (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Connected</p>
                  <p className="text-xs font-mono bg-background p-2 rounded border break-all">
                    {walletAddress}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No wallet connected. Please connect your wallet to begin.
                </p>
              )}
            </div>

            {/* Operation Buttons */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Operations</h3>
              
              {/* Initialize Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button 
                      onClick={initializeHead}
                      disabled={!!configError || !connected || loading || headState !== 'idle'}
                      className="w-full justify-start gap-2 h-auto py-3"
                      variant={headState === 'idle' && connected && !configError ? 'default' : 'outline'}
                    >
                      <PlayCircle className="h-5 w-5" />
                      <div className="flex-1 text-left">
                        <div className="font-semibold">Initialize Head</div>
                        <div className="text-xs opacity-80">Start a new Hydra head</div>
                      </div>
                      {loading && headState === 'idle' && <Spinner className="h-4 w-4" />}
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p>Initialize a new Hydra head to prepare a Layer 2 channel. Available when head is idle.</p>
                </TooltipContent>
              </Tooltip>

              {/* Commit Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button 
                      onClick={commitFunds}
                      disabled={!!configError || !connected || loading || (headState !== 'initialized' && headState !== 'initializing')}
                      className="w-full justify-start gap-2 h-auto py-3"
                      variant={(headState === 'initialized' || headState === 'initializing') && connected && !configError ? 'default' : 'outline'}
                    >
                      <Upload className="h-5 w-5" />
                      <div className="flex-1 text-left">
                        <div className="font-semibold">Commit Funds</div>
                        <div className="text-xs opacity-80">Lock UTxOs into the head</div>
                      </div>
                      {loading && (headState === 'initialized' || headState === 'initializing') && <Spinner className="h-4 w-4" />}
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p>Commit UTxOs from your wallet to the Hydra head. Available after initialization.</p>
                </TooltipContent>
              </Tooltip>

              {/* Close Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button 
                      onClick={closeHead}
                      disabled={!!configError || !connected || loading || headState !== 'open'}
                      className="w-full justify-start gap-2 h-auto py-3"
                      variant={headState === 'open' && connected && !configError ? 'default' : 'outline'}
                    >
                      <XCircle className="h-5 w-5" />
                      <div className="flex-1 text-left">
                        <div className="font-semibold">Close Head</div>
                        <div className="text-xs opacity-80">Finalize the head state</div>
                      </div>
                      {loading && headState === 'open' && <Spinner className="h-4 w-4" />}
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p>Close the Hydra head to finalize the state. Available when head is open.</p>
                </TooltipContent>
              </Tooltip>

              {/* Fanout Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button 
                      onClick={fanoutHead}
                      disabled={!!configError || !connected || loading || headState !== 'closed'}
                      className="w-full justify-start gap-2 h-auto py-3"
                      variant={headState === 'closed' && connected && !configError ? 'default' : 'outline'}
                    >
                      <Download className="h-5 w-5" />
                      <div className="flex-1 text-left">
                        <div className="font-semibold">Fanout</div>
                        <div className="text-xs opacity-80">Distribute UTxOs back to Layer 1</div>
                      </div>
                      {loading && headState === 'closed' && <Spinner className="h-4 w-4" />}
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p>Fanout the closed head to retrieve your final UTxOs back to Layer 1. Available when head is closed.</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Status Display */}
            {status && (
              <div className={`p-4 rounded-lg border ${statusDisplay.bgColor} ${statusDisplay.borderColor}`}>
                <div className="flex gap-3">
                  <div className={`flex-shrink-0 ${statusDisplay.textColor}`}>
                    {statusDisplay.icon}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm ${statusDisplay.textColor} break-words`}>
                      {status}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Operation History */}
            <div className="pt-4 border-t">
              <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
                <div className="flex items-center justify-between">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 p-0 hover:bg-transparent">
                      <History className="h-4 w-4" />
                      <h3 className="font-semibold text-sm">Operation History</h3>
                      <span className="text-xs text-muted-foreground">
                        ({operationHistory.length} {operationHistory.length === 1 ? 'entry' : 'entries'})
                      </span>
                    </Button>
                  </CollapsibleTrigger>
                  {operationHistory.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearHistory}
                      className="h-8 gap-1 text-xs text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                      Clear
                    </Button>
                  )}
                </div>
                
                <CollapsibleContent className="mt-3">
                  {operationHistory.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-4 border rounded-lg bg-muted/20">
                      No operations recorded yet
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {operationHistory.map((entry) => {
                        const entryDisplay = (() => {
                          switch (entry.type) {
                            case 'info':
                              return {
                                bgColor: 'bg-blue-50 dark:bg-blue-950/30',
                                textColor: 'text-blue-800 dark:text-blue-200',
                                borderColor: 'border-blue-200 dark:border-blue-800',
                                icon: <Info className="h-3 w-3" />
                              }
                            case 'success':
                              return {
                                bgColor: 'bg-green-50 dark:bg-green-950/30',
                                textColor: 'text-green-800 dark:text-green-200',
                                borderColor: 'border-green-200 dark:border-green-800',
                                icon: <CheckCircle2 className="h-3 w-3" />
                              }
                            case 'error':
                              return {
                                bgColor: 'bg-red-50 dark:bg-red-950/30',
                                textColor: 'text-red-800 dark:text-red-200',
                                borderColor: 'border-red-200 dark:border-red-800',
                                icon: <AlertCircle className="h-3 w-3" />
                              }
                            case 'loading':
                              return {
                                bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
                                textColor: 'text-yellow-800 dark:text-yellow-200',
                                borderColor: 'border-yellow-200 dark:border-yellow-800',
                                icon: <Loader2 className="h-3 w-3" />
                              }
                          }
                        })()

                        return (
                          <div
                            key={entry.id}
                            className={`p-3 rounded-lg border ${entryDisplay.bgColor} ${entryDisplay.borderColor}`}
                          >
                            <div className="flex gap-2">
                              <div className={`flex-shrink-0 ${entryDisplay.textColor} mt-0.5`}>
                                {entryDisplay.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  {entry.operation && (
                                    <Badge 
                                      variant="outline" 
                                      className={`text-xs ${entryDisplay.textColor} border-current`}
                                    >
                                      {entry.operation}
                                    </Badge>
                                  )}
                                  <div className={`flex items-center gap-1 text-xs ${entryDisplay.textColor} opacity-70`}>
                                    <Clock className="h-3 w-3" />
                                    <span className="whitespace-nowrap">
                                      {entry.timestamp.toLocaleTimeString()}
                                    </span>
                                  </div>
                                </div>
                                <p className={`text-xs ${entryDisplay.textColor} break-words`}>
                                  {entry.message}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Debug Mode Toggle */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <Bug className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <h4 className="text-sm font-medium">Debug Mode</h4>
                    <p className="text-xs text-muted-foreground">Enable verbose logging to console</p>
                  </div>
                </div>
                <Button
                  variant={debugMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDebugMode(!debugMode)}
                >
                  {debugMode ? "Enabled" : "Disabled"}
                </Button>
              </div>
            </div>

            {/* Info Section */}
            <div className="pt-4 border-t">
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  About Hydra Heads
                </summary>
                <div className="mt-3 text-sm text-muted-foreground space-y-2">
                  <p>
                    Hydra heads are Layer 2 state channels on Cardano that enable fast, low-cost transactions.
                  </p>
                  <p className="text-xs">
                    <strong>Lifecycle:</strong> Initialize → Commit → Open → Transact → Close → Fanout
                  </p>
                </div>
              </details>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}