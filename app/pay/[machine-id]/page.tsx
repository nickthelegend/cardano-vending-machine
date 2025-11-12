"use client"

import { useEffect, useState } from "react"
import { useWallet } from "@txnlab/use-wallet-react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { motion } from "framer-motion"
import { ChevronLeft, HelpCircle } from "lucide-react"
import Link from "next/link"
import Confetti from "react-confetti"
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { MachineContractClient } from '../../../clients/client'
import algosdk from 'algosdk'
import { supabase } from '@/lib/supabase'
import React from "react"
interface MachineDetails {
  id: string
  machine_contract_address: string
  price: number
  api_key: string
}

export default function MachinePayPage() {
  const { activeAccount, transactionSigner, activeAddress } = useWallet()
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const machineId = params["machine-id"] as string
  const [algorand, setAlgorand] = useState<AlgorandClient | null>(null)

  const [machineDetails, setMachineDetails] = useState<MachineDetails | null>(null)
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [transactionComplete, setTransactionComplete] = useState(false)
  const [isSliding, setIsSliding] = useState(false)
  const [slidePosition, setSlidePosition] = useState(0)

  useEffect(() => {
    if (!activeAccount) {
      setLoading(false)
      return
    }

    // Initialize Algorand client
    const client = AlgorandClient.testNet()
    setAlgorand(client)

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
  }, [activeAccount, machineId])

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

  const handleSlideComplete = async () => {
    if (!activeAddress || !transactionSigner || !algorand || !machineDetails) {
      setError("Wallet not connected or machine not loaded")
      return
    }

    try {
      setProcessing(true)
      setError(null)

      const appId = BigInt(machineDetails.machine_contract_address)
      const appAddress = algosdk.getApplicationAddress(appId)

      const client = algorand.client.getTypedAppClientById(MachineContractClient, {
        appId: appId,
        defaultSigner: transactionSigner,
        defaultSender: activeAddress,
      })

      const paymentTxn = await algorand.createTransaction.payment({
        sender: activeAddress,
        receiver: appAddress,
        amount: (machineDetails.price).algo(),
      })

      const result = await client.send.pay({
        args: [paymentTxn],
        sender: activeAddress,
        signer: transactionSigner
      })

      // Broadcast payment approved
      const channel = supabase.channel(`machine-${machineId}`)
      await channel.send({
        type: 'broadcast',
        event: 'payment_approved',
        payload: { txnId: result.txIds[0], machineId }
      })
      
      setShowConfetti(true)
      setTransactionComplete(true)
      setProcessing(false)

      setTimeout(() => {
        setShowConfetti(false)
      }, 3000)

    } catch (err) {
      console.error('Payment failed:', err)
      setError(`Payment failed: ${err.message}`)
      setProcessing(false)
      setSlidePosition(0)
      setIsSliding(false)
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

  if (!activeAccount) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black flex items-center justify-center px-4">
        <Card className="bg-slate-800 border-orange-500/20 p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
          <p className="text-gray-400 mb-6">
            Please connect your wallet to use this vending machine and make payments in ALGO.
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
        <h1 className="text-xl font-bold text-white">Scan & Pay ALGO</h1>
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
                  Payment of {amount} ALGO completed
                </p>
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
              <div className="text-gray-400 text-sm">ALGO (Fixed Price)</div>
              <p className="text-gray-500 text-xs mt-4">Available Balance: 1000 ALGO</p>
            </div>

            {/* Transaction limit */}
            <div className="bg-slate-900 rounded-lg p-3 mb-6 border border-orange-500/20 flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded flex-shrink-0" />
              <p className="text-gray-300 text-sm">Your Transaction Limit: 500 ALGO</p>
            </div>

            {/* Fixed price info */}
            <div className="bg-slate-900 rounded-lg p-4 mb-6 border border-orange-500/30">
              <p className="text-gray-300 text-sm text-center">
                This machine has a fixed price of <span className="text-orange-400 font-bold">{machineDetails.price} ALGO</span>
              </p>
            </div>

            {/* Slide to Pay */}
            <div className="relative bg-slate-700 rounded-full h-16 mb-4 overflow-hidden slide-container">
              <div className="absolute inset-0 flex items-center justify-center text-white font-semibold">
                {processing ? "Processing..." : transactionComplete ? "Payment Complete ✓" : "Slide to Pay"}
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
