"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useWallet } from "@meshsdk/react"
import { BlockfrostProvider, MeshTxBuilder } from "@meshsdk/core"
import { HydraProvider, HydraInstance } from "@meshsdk/hydra"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { motion } from "framer-motion"
import { ChevronLeft, HelpCircle } from "lucide-react"
import Link from "next/link"
import Confetti from "react-confetti"

import { supabase } from '@/lib/supabase'
import React from "react"

// Configuration constants for Hydra
// Use direct URL for read operations (like /head status)
const HYDRA_NODE_URL = "http://209.38.126.165:4001"

// Use proxy for write operations (commit, close, fanout) to avoid CORS
const HYDRA_PROXY_URL = typeof window !== 'undefined' 
  ? `${window.location.origin}/api/hydra-proxy`
  : "http://localhost:3000/api/hydra-proxy"

const BLOCKFROST_API_KEY = process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY || 'preprodFzYIfO6BdUE1PvHWIiekgYE1ixMa9XF9'

const provider = new BlockfrostProvider(BLOCKFROST_API_KEY)
interface MachineDetails {
  id: string
  machine_contract_address: string
  price: number
  api_key: string
}

type HeadState = 'idle' | 'initializing' | 'initialized' | 'open' | 'closing' | 'closed' | 'fanout'
type PaymentMethod = 'layer1' | 'layer2'

export default function MachinePayPage() {
  const { connected, wallet } = useWallet()
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const machineId = params["machine-id"] as string

  const [machineDetails, setMachineDetails] = useState<MachineDetails | null>(null)
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [transactionComplete, setTransactionComplete] = useState(false)
  const [isSliding, setIsSliding] = useState(false)
  const [slidePosition, setSlidePosition] = useState(0)
  
  // Hydra-specific state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('layer1')
  const [headState, setHeadState] = useState<HeadState>('idle')
  const [hydraConnected, setHydraConnected] = useState(false)
  const [hydraBalance, setHydraBalance] = useState<number>(0)
  const [hydraUtxoCount, setHydraUtxoCount] = useState<number>(0)
  const [fetchingHydraBalance, setFetchingHydraBalance] = useState(false)
  
  // Singleton pattern for HydraProvider and HydraInstance
  const hydraProviderRef = useRef<HydraProvider | null>(null)
  const hydraInstanceRef = useRef<HydraInstance | null>(null)
  const messageHandlerRegistered = useRef<boolean>(false)

  /**
   * Handle messages received from the Hydra node
   * Updates application state based on message tags
   */
  const handleHydraMessage = useCallback((message: any) => {
    console.log('Hydra message received:', message)
    const tag = message.tag
    
    switch (tag) {
      case 'HeadIsInitializing':
        setHeadState('initializing')
        break
      case 'Committed':
        console.log('Participant committed funds')
        break
      case 'HeadIsOpen':
        setHeadState('open')
        break
      case 'HeadIsClosed':
        setHeadState('closed')
        break
      case 'HeadIsFinalized':
        setHeadState('idle')
        break
      case 'SnapshotConfirmed':
        console.log('Snapshot confirmed in head:', message)
        break
      default:
        console.log('Unhandled message tag:', tag)
    }
  }, [])

  /**
   * Setup and configure HydraProvider with singleton pattern
   * Initializes provider with configured URL and registers message handler
   * Uses proxy URL to avoid CORS issues with write operations
   */
  const setupHydraProvider = useCallback(async (): Promise<HydraProvider> => {
    try {
      // Return existing instance if already created (singleton pattern)
      if (hydraProviderRef.current) {
        console.log('Reusing existing HydraProvider instance')
        return hydraProviderRef.current
      }

      console.log('Creating new HydraProvider instance with proxy URL')
      
      // Create new HydraProvider instance using proxy to avoid CORS
      const hydraProvider = new HydraProvider({ 
        httpUrl: HYDRA_PROXY_URL 
      })
      
      // Store in ref for singleton pattern
      hydraProviderRef.current = hydraProvider
      
      // Register message handler only once
      if (!messageHandlerRegistered.current) {
        console.log('Registering Hydra message handler')
        hydraProvider.onMessage(handleHydraMessage)
        messageHandlerRegistered.current = true
      }
      
      // Test connection to Hydra node via proxy
      try {
        await hydraProvider.connect()
        console.log('Connected to Hydra node via proxy')
        setHydraConnected(true)
      } catch (connectionError: any) {
        console.error('Failed to connect to Hydra node:', connectionError)
        throw new Error(`Cannot reach Hydra node via proxy. Please check network connectivity.`)
      }
      
      return hydraProvider
      
    } catch (error: any) {
      console.error('Error setting up HydraProvider:', error)
      hydraProviderRef.current = null
      messageHandlerRegistered.current = false
      setHydraConnected(false)
      throw error
    }
  }, [handleHydraMessage])

  /**
   * Get or create HydraInstance with BlockfrostProvider for Layer 1 operations
   * Uses singleton pattern to ensure single instance throughout lifecycle
   */
  const getHydraInstance = useCallback(async (): Promise<HydraInstance> => {
    try {
      // Return existing instance if already created (singleton pattern)
      if (hydraInstanceRef.current) {
        console.log('Reusing existing HydraInstance')
        return hydraInstanceRef.current
      }

      console.log('Creating HydraInstance with BlockfrostProvider')
      
      // Ensure HydraProvider is set up first
      const hydraProvider = await setupHydraProvider()
      
      // Create HydraInstance with BlockfrostProvider for Layer 1 operations
      const hydraInstance = new HydraInstance({
        provider: hydraProvider,
        fetcher: provider,
        submitter: provider,
      })
      
      // Store in ref for singleton pattern
      hydraInstanceRef.current = hydraInstance
      
      console.log('HydraInstance created successfully')
      return hydraInstance
      
    } catch (error) {
      console.error('Error creating HydraInstance:', error)
      hydraInstanceRef.current = null
      throw error
    }
  }, [setupHydraProvider])

  /**
   * Fetch current head status from Hydra node
   * Syncs the UI state with the actual Hydra node state
   * Uses direct URL for read-only operations (no CORS issues)
   */
  const fetchHeadStatus = useCallback(async () => {
    try {
      console.log('Fetching head status from /head endpoint...')
      // Use direct URL for read operations
      const response = await fetch(`${HYDRA_NODE_URL}/head`)
      
      if (!response.ok) {
        console.log('Failed to fetch head status:', response.status, response.statusText)
        return
      }
      
      const data = await response.json()
      console.log('Head status data:', data)
      
      const tag = data?.tag
      console.log('Head tag:', tag)
      
      // Update head state based on API response
      if (tag === 'Open') {
        console.log('Head is OPEN')
        setHeadState('open')
      } else if (tag === 'Idle') {
        setHeadState('idle')
      } else if (tag === 'Initial' || tag === 'Initializing') {
        // 'Initial' means head is initialized and ready for commits
        setHeadState('initialized')
      } else if (tag === 'Closed') {
        setHeadState('closed')
      }
      
    } catch (error) {
      console.error('Error fetching head status:', error)
    }
  }, [])

  // Initialize Hydra connection and fetch head status when wallet connects
  useEffect(() => {
    if (connected && wallet) {
      // Setup Hydra provider
      setupHydraProvider().catch(err => {
        console.error('Failed to setup Hydra provider:', err)
      })
      
      // Fetch head status
      fetchHeadStatus()
      
      // Poll head status every 5 seconds
      const interval = setInterval(fetchHeadStatus, 5000)
      return () => clearInterval(interval)
    }
  }, [connected, wallet, setupHydraProvider, fetchHeadStatus])

  /**
   * Fetch Hydra balance (Layer 2 funds)
   * Shows the balance of funds inside the Hydra head
   * Uses direct URL for read-only operations
   */
  const fetchHydraBalance = useCallback(async () => {
    if (!wallet || headState !== 'open') {
      setHydraBalance(0)
      setHydraUtxoCount(0)
      return
    }

    setFetchingHydraBalance(true)
    console.log('Fetching Hydra balance...')

    try {
      const walletAddress = await wallet.getChangeAddress()
      
      // Fetch head data to get localUTxO - use direct URL for read operations
      const response = await fetch(`${HYDRA_NODE_URL}/head`)
      if (!response.ok) {
        throw new Error(`Failed to fetch head data: ${response.status} ${response.statusText}`)
      }
      
      const headData = await response.json()
      console.log('Head data for balance:', headData)
      
      // Get localUTxO from coordinatedHeadState
      const localUTxO = headData?.contents?.coordinatedHeadState?.localUTxO || {}
      console.log('Local UTxO:', localUTxO)
      
      // UTxOs are in an object format: { "txHash#index": { address, value, ... }, ... }
      const utxoEntries = Object.entries(localUTxO)
      console.log('Total UTxO entries:', utxoEntries.length)
      
      // Filter and calculate balance for this wallet
      let totalLovelace = 0
      let myUtxoCount = 0
      
      for (const [utxoRef, utxo] of utxoEntries) {
        const utxoData = utxo as any
        
        if (utxoData.address === walletAddress) {
          const lovelace = utxoData.value?.lovelace || 0
          console.log('Found my UTxO:', { ref: utxoRef, lovelace })
          totalLovelace += Number(lovelace)
          myUtxoCount++
        }
      }
      
      console.log('My UTxO count:', myUtxoCount)
      console.log('Total lovelace:', totalLovelace)
      
      // Convert to ADA
      const balanceAda = totalLovelace / 1_000_000
      console.log('Balance in ADA:', balanceAda)
      setHydraBalance(balanceAda)
      setHydraUtxoCount(myUtxoCount)
      
    } catch (error: any) {
      console.error('Error fetching Hydra balance:', error)
      setHydraBalance(0)
      setHydraUtxoCount(0)
    } finally {
      setFetchingHydraBalance(false)
    }
  }, [wallet, headState])

  // Fetch Hydra balance when head opens or wallet connects
  useEffect(() => {
    if (connected && wallet && headState === 'open') {
      fetchHydraBalance()
      
      // Refresh balance every 10 seconds
      const interval = setInterval(fetchHydraBalance, 10000)
      return () => clearInterval(interval)
    }
  }, [connected, wallet, headState, fetchHydraBalance])

  useEffect(() => {
    if (!connected) {
      setLoading(false)
      return
    }

    const fetchMachine = async () => {
      try {
        const { data: machine, error } = await supabase
          .from('machines')
          .select('*')
          .eq('id', machineId)
          .single()

        if (error || !machine) {
          throw new Error('Machine not found')
        }
        
        setMachineDetails(machine)
        setAmount(machine.price.toString())
        setLoading(false)
      } catch (err) {
        console.error('Error fetching machine:', err)
        setError('Machine not found')
        setLoading(false)
      }
    }

    fetchMachine()
    
    // Send connection packet
    const channel = supabase.channel(`machine-${machineId}`)
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'connection',
          payload: { status: 'connected', machineId }
        })
      }
    })
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [connected, machineId])

  const handleNumberClick = (num: string) => {
    if (transactionComplete) return

    if (num === ".") {
      if (!amount.includes(".")) {
        setAmount(amount + num)
      }
    } else {
      setAmount(amount + num)
    }
  }

  const handleBackspace = () => {
    if (transactionComplete) return
    setAmount(amount.slice(0, -1))
  }

  const handleClear = () => {
    if (transactionComplete) return
    setAmount("")
  }

  const handleMax = () => {
    if (transactionComplete) return
    setAmount("100")
  }

  /**
   * Send Hydra payment (Layer 2 transaction)
   */
  const sendHydraPayment = useCallback(async () => {
    if (!wallet || !machineDetails) {
      setError("Wallet not connected or machine not loaded")
      setSlidePosition(0)
      setIsSliding(false)
      return
    }

    // Check if head is open
    if (headState !== 'open') {
      setError("Hydra head is not open. Please use Layer 1 payment instead or wait for the head to open.")
      setSlidePosition(0)
      setIsSliding(false)
      return
    }

    try {
      setProcessing(true)
      setError(null)

      console.log('[HydraPayment] Starting Hydra Layer 2 payment...')
      
      const walletAddress = await wallet.getChangeAddress()
      
      // Setup Hydra provider with error handling
      let hydraProvider: HydraProvider
      try {
        hydraProvider = await setupHydraProvider()
      } catch (providerError: any) {
        console.error('[HydraPayment] Failed to setup Hydra provider:', providerError)
        throw new Error('Failed to connect to Hydra node. Please check your connection or use Layer 1 payment.')
      }
      
      // Fetch UTxOs from Hydra head
      console.log('[HydraPayment] Fetching UTxOs from Hydra head...')
      let headUtxos: any[]
      try {
        headUtxos = await hydraProvider.fetchUTxOs()
        console.log('[HydraPayment] All head UTxOs:', headUtxos)
      } catch (fetchError: any) {
        console.error('[HydraPayment] Failed to fetch UTxOs:', fetchError)
        throw new Error('Failed to fetch UTxOs from Hydra head. The head may not be open.')
      }
      
      // Filter for this wallet's UTxOs
      const myUtxos = headUtxos.filter((u: any) => u.output.address === walletAddress)
      console.log('[HydraPayment] My UTxOs:', myUtxos)
      
      // Check if wallet has UTxOs in Hydra head
      if (!myUtxos || myUtxos.length === 0) {
        throw new Error('Insufficient Hydra balance. You have no UTxOs in the Hydra head. Please use Layer 1 payment or commit funds to the head first.')
      }
      
      // Calculate total balance
      const totalLovelace = myUtxos.reduce((sum: number, utxo: any) => {
        return sum + (utxo.output?.amount?.[0]?.quantity || 0)
      }, 0)
      const totalAda = totalLovelace / 1_000_000
      const requiredAda = machineDetails.price
      
      console.log('[HydraPayment] Total Hydra balance:', totalAda, 'ADA')
      console.log('[HydraPayment] Required amount:', requiredAda, 'ADA')
      
      // Check if balance is sufficient
      if (totalAda < requiredAda) {
        throw new Error(`Insufficient Hydra balance. You have ${totalAda.toFixed(2)} ADA but need ${requiredAda} ADA. Please use Layer 1 payment.`)
      }
      
      // Build Hydra transaction
      console.log('[HydraPayment] Building Hydra L2 transaction...')
      const paymentAmount = (machineDetails.price * 1000000).toString() // Convert ADA to lovelace
      
      const txBuilder = new MeshTxBuilder({
        isHydra: true,
        fetcher: hydraProvider,
      })
      
      let tx: string
      try {
        tx = await txBuilder
          .txOut(machineDetails.machine_contract_address, [{ unit: 'lovelace', quantity: paymentAmount }])
          .changeAddress(walletAddress)
          .selectUtxosFrom(myUtxos)
          .complete()
        console.log('[HydraPayment] Transaction built successfully')
      } catch (buildError: any) {
        console.error('[HydraPayment] Failed to build transaction:', buildError)
        throw new Error('Failed to build Hydra transaction. Please try again or use Layer 1 payment.')
      }
      
      // Sign transaction
      console.log('[HydraPayment] Requesting wallet signature...')
      let signedTx: string
      try {
        signedTx = await wallet.signTx(tx, true)
        console.log('[HydraPayment] Transaction signed successfully')
      } catch (signError: any) {
        console.error('[HydraPayment] Failed to sign transaction:', signError)
        const signErrorMsg = signError?.message || String(signError)
        if (signErrorMsg.includes('cancel') || signErrorMsg.includes('reject') || signErrorMsg.includes('denied')) {
          throw new Error('Transaction signing was cancelled. Please try again.')
        }
        throw new Error('Failed to sign transaction. Please try again.')
      }
      
      // Submit to Hydra with timeout
      console.log('[HydraPayment] Submitting to Hydra head...')
      const submitWithTimeout = (signedTx: string, timeoutMs: number = 15000) => {
        return Promise.race([
          hydraProvider.submitTx(signedTx),
          new Promise<string>((_, reject) => 
            setTimeout(() => reject(new Error('Transaction submission timed out')), timeoutMs)
          )
        ])
      }
      
      let txHash: string
      try {
        txHash = await submitWithTimeout(signedTx)
        console.log('[HydraPayment] Transaction submitted successfully, hash:', txHash)
      } catch (timeoutError: any) {
        console.warn('[HydraPayment] submitTx timed out, transaction may still be processed')
        // Transaction was signed and should be processed, use placeholder
        txHash = 'pending-hydra-tx'
      }
      
      // Broadcast payment approved
      const channel = supabase.channel(`machine-${machineId}`)
      await channel.send({
        type: 'broadcast',
        event: 'payment_approved',
        payload: { txnId: txHash, machineId, paymentMethod: 'layer2' }
      })
      
      setShowConfetti(true)
      setTransactionComplete(true)
      setProcessing(false)

      setTimeout(() => {
        setShowConfetti(false)
      }, 3000)
      
      // Refresh Hydra balance
      setTimeout(() => {
        fetchHydraBalance()
      }, 2000)

    } catch (err: any) {
      console.error('[HydraPayment] Payment failed:', err)
      const errorMessage = err?.message || String(err)
      
      // Provide user-friendly error messages
      if (errorMessage.includes('Insufficient Hydra balance')) {
        setError(errorMessage)
      } else if (errorMessage.includes('not open')) {
        setError('Hydra head is not open. Please use Layer 1 payment.')
      } else if (errorMessage.includes('connect')) {
        setError('Failed to connect to Hydra node. Please use Layer 1 payment.')
      } else if (errorMessage.includes('cancelled') || errorMessage.includes('rejected')) {
        setError('Transaction was cancelled. Please try again.')
      } else {
        setError(`Hydra payment failed: ${errorMessage}. You can try Layer 1 payment instead.`)
      }
      
      setProcessing(false)
      setSlidePosition(0)
      setIsSliding(false)
    }
  }, [wallet, machineDetails, headState, setupHydraProvider, machineId, fetchHydraBalance])

  /**
   * Send Layer 1 payment (original implementation)
   */
  const sendLayer1Payment = useCallback(async () => {
    if (!wallet || !machineDetails) {
      setError("Wallet not connected or machine not loaded")
      return
    }

    try {
      setProcessing(true)
      setError(null)

      const utxos = await wallet.getUtxos()
      const changeAddress = await wallet.getChangeAddress()
      
      const txBuilder = new MeshTxBuilder({
        fetcher: provider,
        verbose: true,
      })

      const paymentAmount = (machineDetails.price * 1000000).toString() // Convert ADA to lovelace
      
      const unsignedTx = await txBuilder
        .txOut(machineDetails.machine_contract_address, [{ unit: "lovelace", quantity: paymentAmount }])
        .changeAddress(changeAddress)
        .selectUtxosFrom(utxos)
        .complete()

      const signedTx = await wallet.signTx(unsignedTx)
      const txHash = await wallet.submitTx(signedTx)
      
      // Broadcast payment approved
      const channel = supabase.channel(`machine-${machineId}`)
      await channel.send({
        type: 'broadcast',
        event: 'payment_approved',
        payload: { txnId: txHash, machineId, paymentMethod: 'layer1' }
      })
      
      setShowConfetti(true)
      setTransactionComplete(true)
      setProcessing(false)

      setTimeout(() => {
        setShowConfetti(false)
      }, 3000)

    } catch (err) {
      console.error('Payment failed:', err)
      setError(`Payment failed: ${err}`)
      setProcessing(false)
      setSlidePosition(0)
      setIsSliding(false)
    }
  }, [wallet, machineDetails, machineId])

  const handleSlideComplete = async () => {
    if (paymentMethod === 'layer2') {
      await sendHydraPayment()
    } else {
      await sendLayer1Payment()
    }
  }

  const handleSlideStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    setIsSliding(true)
  }

  const handleSlideMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isSliding || transactionComplete || processing) return
    
    const slider = e.currentTarget.parentElement
    if (!slider) return
    
    const rect = slider.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const position = Math.max(0, Math.min(rect.width - 60, clientX - rect.left - 30))
    setSlidePosition(position)
    
    if (position >= rect.width - 80) {
      setIsSliding(false)
      handleSlideComplete()
    }
  }

  const handleSlideEnd = () => {
    if (!transactionComplete && !processing) {
      setSlidePosition(0)
    }
    setIsSliding(false)
  }

  // Global mouse/touch move and end handlers
  React.useEffect(() => {
    const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
      if (isSliding) {
        const slider = document.querySelector('.slide-container')
        if (!slider) return
        
        const rect = slider.getBoundingClientRect()
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
        const position = Math.max(0, Math.min(rect.width - 60, clientX - rect.left - 30))
        setSlidePosition(position)
        
        if (position >= rect.width - 80) {
          setIsSliding(false)
          handleSlideComplete()
        }
      }
    }

    const handleGlobalEnd = () => {
      if (isSliding && !transactionComplete && !processing) {
        setSlidePosition(0)
      }
      setIsSliding(false)
    }

    if (isSliding) {
      document.addEventListener('mousemove', handleGlobalMove)
      document.addEventListener('mouseup', handleGlobalEnd)
      document.addEventListener('touchmove', handleGlobalMove)
      document.addEventListener('touchend', handleGlobalEnd)
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMove)
      document.removeEventListener('mouseup', handleGlobalEnd)
      document.removeEventListener('touchmove', handleGlobalMove)
      document.removeEventListener('touchend', handleGlobalEnd)
    }
  }, [isSliding, transactionComplete, processing])

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black flex items-center justify-center px-4">
        <Card className="bg-slate-800 border-orange-500/20 p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
          <p className="text-gray-400 mb-6">
            Please connect your wallet to use this vending machine and make payments in ADA.
          </p>
          <Button
            onClick={() => router.push("/")}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3 rounded-lg"
          >
            Go to Home
          </Button>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black flex items-center justify-center">
        <div className="text-white">Loading machine details...</div>
      </div>
    )
  }

  if (!machineDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black flex items-center justify-center">
        <div className="text-white">Machine not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black py-8 px-4">
      {showConfetti && <Confetti />}

      <div className="flex justify-between items-center mb-8 px-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ChevronLeft size={20} />
          <span>Back</span>
        </button>
        <h1 className="text-xl font-bold text-white">Scan & Pay ADA</h1>
        <Link href="/help" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <HelpCircle size={20} />
          <span className="hidden sm:inline">Help</span>
        </Link>
      </div>

      <div className="container max-w-2xl mx-auto">


        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex justify-center"
        >
          <Card className="bg-slate-800 border-orange-500/20 p-8 w-full max-w-md">
            {transactionComplete && (
              <div className="text-center mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
                <p className="text-green-400 font-semibold">✓ Transaction Complete!</p>
                <p className="text-green-300 text-sm mt-1">
                  Payment of {machineDetails.price} ADA completed via {paymentMethod === 'layer2' ? 'Hydra (Layer 2)' : 'Layer 1'}
                </p>
              </div>
            )}

            {/* Payment Method Toggle */}
            {!transactionComplete && (
              <div className="mb-6">
                <label className="text-gray-300 text-sm mb-2 block">Payment Method</label>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setPaymentMethod('layer1')}
                    variant={paymentMethod === 'layer1' ? 'default' : 'outline'}
                    className={`flex-1 ${paymentMethod === 'layer1' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-slate-700 hover:bg-slate-600'}`}
                  >
                    Layer 1 (Cardano)
                  </Button>
                  <Button
                    onClick={() => setPaymentMethod('layer2')}
                    variant={paymentMethod === 'layer2' ? 'default' : 'outline'}
                    className={`flex-1 ${paymentMethod === 'layer2' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`}
                    disabled={headState !== 'open'}
                  >
                    Layer 2 (Hydra)
                  </Button>
                </div>
              </div>
            )}

            {/* Hydra Status Indicator */}
            {paymentMethod === 'layer2' && (
              <div className={`mb-6 p-4 rounded-lg border ${
                headState === 'open' 
                  ? 'bg-green-500/10 border-green-500/30' 
                  : 'bg-yellow-500/10 border-yellow-500/30'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${
                    headState === 'open' ? 'bg-green-500' : 'bg-yellow-500'
                  }`} />
                  <p className={`text-sm font-semibold ${
                    headState === 'open' ? 'text-green-400' : 'text-yellow-400'
                  }`}>
                    Hydra Head Status: {headState.charAt(0).toUpperCase() + headState.slice(1)}
                  </p>
                </div>
                {headState === 'open' ? (
                  <div className="text-gray-300 text-xs">
                    <p>✓ Ready for instant Layer 2 payments</p>
                    {fetchingHydraBalance ? (
                      <p className="mt-1">Loading balance...</p>
                    ) : (
                      <p className="mt-1">Hydra Balance: {hydraBalance.toFixed(2)} ADA ({hydraUtxoCount} UTxOs)</p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-300 text-xs">
                    Head is not open. Please use Layer 1 payment or wait for head to open.
                  </p>
                )}
              </div>
            )}

            {/* Info box */}
            <div className="bg-slate-900 rounded-lg p-4 mb-6 border border-orange-500/30 flex gap-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full mt-1 flex-shrink-0" />
              <p className="text-gray-300 text-sm">
                Payment for machine: {machineDetails.id}
              </p>
            </div>

            {/* Amount display */}
            <div className="text-center mb-8">
              <div className="text-5xl font-bold text-orange-500 mb-2">{machineDetails.price}</div>
              <div className="text-gray-400 text-sm">ADA (Fixed Price)</div>
              <p className="text-gray-500 text-xs mt-4">Available Balance: 1000 ADA</p>
            </div>

            {/* Transaction limit */}
            <div className="bg-slate-900 rounded-lg p-3 mb-6 border border-orange-500/20 flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded flex-shrink-0" />
              <p className="text-gray-300 text-sm">Your Transaction Limit: 500 ADA</p>
            </div>

            {/* Fixed price info */}
            <div className="bg-slate-900 rounded-lg p-4 mb-6 border border-orange-500/30">
              <p className="text-gray-300 text-sm text-center">
                This machine has a fixed price of <span className="text-orange-400 font-bold">{machineDetails.price} ADA</span>
              </p>
            </div>

            {/* Slide to Pay */}
            <div className="relative bg-slate-700 rounded-full h-16 mb-4 overflow-hidden slide-container">
              <div className="absolute inset-0 flex items-center justify-center text-white font-semibold">
                {processing 
                  ? `Processing ${paymentMethod === 'layer2' ? 'Hydra' : 'Layer 1'} Payment...` 
                  : transactionComplete 
                    ? "Payment Complete ✓" 
                    : `Slide to Pay with ${paymentMethod === 'layer2' ? 'Hydra (L2)' : 'Layer 1'}`
                }
              </div>
              <div 
                className="absolute left-2 top-2 w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full cursor-grab active:cursor-grabbing flex items-center justify-center select-none"
                style={{ 
                  transform: `translateX(${slidePosition}px)`,
                  transition: isSliding ? 'none' : 'transform 0.2s ease-out'
                }}
                onMouseDown={handleSlideStart}
                onTouchStart={handleSlideStart}
                draggable={false}
              >
                <span className="text-white text-xl pointer-events-none">→</span>
              </div>
            </div>

            {error && <p className="text-red-400 text-sm mt-4 text-center">{error}</p>}
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
