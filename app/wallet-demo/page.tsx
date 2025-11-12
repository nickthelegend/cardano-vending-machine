"use client"

import { useState } from "react"
import { useWallet } from "@meshsdk/react"
import { CardanoWallet } from "@meshsdk/react"
import { BlockfrostProvider } from "@meshsdk/core"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const provider = new BlockfrostProvider('preprodFzYIfO6BdUE1PvHWIiekgYE1ixMa9XF9')

export default function WalletDemo() {
  const { connected, wallet } = useWallet()
  const [assets, setAssets] = useState<null | any>(null)
  const [loading, setLoading] = useState<boolean>(false)

  async function getAssets() {
    if (wallet) {
      setLoading(true)
      try {
        const _assets = await wallet.getAssets()
        setAssets(_assets)
      } catch (error) {
        console.error('Error fetching assets:', error)
      }
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Connect Cardano Wallet</CardTitle>
        </CardHeader>
        <CardContent>
          <CardanoWallet 
            persist={true} 
            web3Services={{
              networkId: 0,
              fetcher: provider,
              submitter: provider,
              projectId: "15055c39-31c2-41d4-9c08-17efcd51e948"
            }}
          />
        </CardContent>
      </Card>

      {connected && (
        <Card>
          <CardHeader>
            <CardTitle>Wallet Assets</CardTitle>
          </CardHeader>
          <CardContent>
            {assets ? (
              <pre className="bg-muted p-4 rounded-lg overflow-auto">
                <code>{JSON.stringify(assets, null, 2)}</code>
              </pre>
            ) : (
              <Button
                onClick={getAssets}
                disabled={loading}
                className={loading ? "bg-orange-500" : ""}
              >
                {loading ? "Loading..." : "Get Wallet Assets"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}