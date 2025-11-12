"use client"

import { useState } from "react"
import { useWallet } from "@meshsdk/react"
import { Button } from "@/components/ui/button"
import { CardanoWallet } from "@meshsdk/react"
import { BlockfrostProvider } from "@meshsdk/core"

const provider = new BlockfrostProvider('preprodFzYIfO6BdUE1PvHWIiekgYE1ixMa9XF9')

export function ConnectWalletButton() {
  const { connected, wallet } = useWallet()
  const [walletAddress, setWalletAddress] = useState<string | null>(null)

  const getWalletAddress = async () => {
    if (wallet && connected) {
      try {
        const addresses = await wallet.getUsedAddresses()
        if (addresses.length > 0) {
          setWalletAddress(addresses[0])
        }
      } catch (error) {
        console.error('Error getting wallet address:', error)
      }
    }
  }

  if (connected && !walletAddress) {
    getWalletAddress()
  }

  return (
    <div className="flex items-center gap-2">
      {/* {connected && walletAddress ? (
        <Button className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground">
          {`${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`}
        </Button>
      ) : null} */}
      
      <CardanoWallet 
        persist={true} 
        web3Services={{
          networkId: 0,
          fetcher: provider,
          submitter: provider,
          projectId: "15055c39-31c2-41d4-9c08-17efcd51e948"
        }}
        isDark={true}
        showDownload={false}
      />
    </div>
  )
}
