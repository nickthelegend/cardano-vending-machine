"use client"

import { useState } from "react"
import { useWallet } from "@meshsdk/react"
import { BlockfrostProvider, MeshTxBuilder } from "@meshsdk/core"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const provider = new BlockfrostProvider('preprodFzYIfO6BdUE1PvHWIiekgYE1ixMa9XF9')

export default function PayDemo() {
  const { connected, wallet } = useWallet()
  const [loading, setLoading] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)

  const handlePayment = async () => {
    if (!wallet || !connected) return

    setLoading(true)
    try {
      const utxos = await wallet.getUtxos()
      const changeAddress = await wallet.getChangeAddress()
      
      const txBuilder = new MeshTxBuilder({
        fetcher: provider,
        verbose: true,
      })

      const unsignedTx = await txBuilder
        .txOut('addr_test1vpvx0sacufuypa2k4sngk7q40zc5c4npl337uusdh64kv0c7e4cxr', [{ unit: "lovelace", quantity: '1000000' }])
        .changeAddress(changeAddress)
        .selectUtxosFrom(utxos)
        .complete()

      const signedTx = await wallet.signTx(unsignedTx)
      const hash = await wallet.submitTx(signedTx)
      setTxHash(hash)
    } catch (error) {
      console.error('Payment failed:', error)
    }
    setLoading(false)
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Payment Demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>Send 1 ADA to: addr_test1vpvx0sacufuypa2k4sngk7q40zc5c4npl337uusdh64kv0c7e4cxr</p>
          
          <Button 
            onClick={handlePayment}
            disabled={!connected || loading}
            className="w-full"
          >
            {loading ? "Processing..." : "Pay 1 ADA"}
          </Button>

          {txHash && (
            <div className="bg-green-100 p-4 rounded">
              <p className="text-green-800">Payment successful!</p>
              <p className="text-sm break-all">Tx Hash: {txHash}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}