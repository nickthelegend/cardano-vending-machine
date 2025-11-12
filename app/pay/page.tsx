"use client"

import { useEffect, useState } from "react"
import { useWallet } from "@txnlab/use-wallet-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Scanner } from "@yudiel/react-qr-scanner"
import { motion } from "framer-motion"

export default function PayPage() {
  const { activeAccount } = useWallet()
  const router = useRouter()
  const [scannedData, setScannedData] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!activeAccount) {
      router.push("/")
    }
  }, [activeAccount, router])

  const handleScan = (result: any) => {
    if (result && result.length > 0) {
      const scannedText = result[0].rawValue
      console.log("[v0] QR Code scanned:", scannedText)
      setScannedData(scannedText)
      setIsScanning(false)
    }
  }

  const handleError = (err: Error) => {
    console.log("[v0] QR Reader error:", err.message)
    setError(err.message)
  }

  const resetScanner = () => {
    setScannedData(null)
    setError(null)
    setIsScanning(true)
  }

  if (!activeAccount) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black py-12 px-4">
      <div className="container max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-4xl font-bold text-white mb-2">VendChain Payment</h1>
          <p className="text-gray-400 mb-8">
            Connected as:{" "}
            <span className="text-orange-500">
              {activeAccount.address.slice(0, 10)}...{activeAccount.address.slice(-10)}
            </span>
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="bg-slate-800 border-orange-500/20 p-8">
            <h2 className="text-2xl font-semibold text-white mb-6">Scan QR Code</h2>

            {isScanning && !scannedData && (
              <div className="space-y-4">
                <div className="bg-slate-900 rounded-lg overflow-hidden border border-orange-500/30">
                  <Scanner onResult={handleScan} onError={handleError} />
                </div>
                <p className="text-gray-400 text-sm text-center">
                  Point your camera at a vending machine QR code to proceed with payment
                </p>
              </div>
            )}

            {scannedData && (
              <div className="space-y-4">
                <div className="bg-slate-900 rounded-lg p-6 border border-orange-500/30">
                  <h3 className="text-orange-500 font-semibold mb-2">Scanned Data:</h3>
                  <p className="text-white break-all font-mono text-sm">{scannedData}</p>
                  <p className="text-gray-400 text-xs mt-4">
                    Debug: This data would be processed for payment verification
                  </p>
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={resetScanner}
                    variant="outline"
                    className="flex-1 border-orange-500/50 text-orange-400 hover:bg-orange-500/10 bg-transparent"
                  >
                    Scan Another
                  </Button>
                  <Button className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white">
                    Confirm Payment
                  </Button>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-400">Error: {error}</p>
                <Button
                  onClick={resetScanner}
                  variant="outline"
                  className="mt-4 border-red-500/50 text-red-400 hover:bg-red-500/10 bg-transparent"
                >
                  Try Again
                </Button>
              </div>
            )}
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8"
        >
          <Card className="bg-slate-800 border-orange-500/20 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">How to Use</h3>
            <ol className="space-y-2 text-gray-400 text-sm">
              <li>1. Find a VendChain vending machine near you</li>
              <li>2. Select the items you want to purchase</li>
              <li>3. Scan the QR code displayed on the machine</li>
              <li>4. Confirm the payment from your wallet</li>
              <li>5. Collect your items instantly</li>
            </ol>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
