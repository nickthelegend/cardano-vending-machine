"use client"

import { useState, useCallback } from "react"
import { useWallet } from "@meshsdk/react"
import { BlockfrostProvider, MeshTxBuilder,  } from "@meshsdk/core"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {HydraProvider, HydraInstance} from "@meshsdk/hydra"
const provider = new BlockfrostProvider('preprodFzYIfO6BdUE1PvHWIiekgYE1ixMa9XF9')
const hydraApiUrl = "http://localhost:4001"
const recipientAddress = "addr_test1vpvx0sacufuypa2k4sngk7q40zc5c4npl337uusdh64kv0c7e4cxr"

export default function HydraDemo() {
  const { connected, wallet } = useWallet()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string>("")

  const performHeadTransaction = async (hydraProvider: HydraProvider, wallet: any) => {
    const changeAddr = await wallet.getChangeAddress()
    const headUtxos = await hydraProvider.fetchAddressUTxOs(changeAddr)
    console.log("Head UTxOs:", headUtxos)
    if (headUtxos.length < 1) {
      console.warn("No UTxOs in head yet")
      return
    }

    const txBuilder = new MeshTxBuilder({
      fetcher: hydraProvider,
      submitter: hydraProvider,
      isHydra: true,
      verbose: true,
    })

    const unsignedTx = await txBuilder
      .txOut(recipientAddress, [{ unit: "lovelace", quantity: "2000000" }])
      .changeAddress(changeAddr)
      .selectUtxosFrom(headUtxos)
      .complete()

    console.log("Unsigned head TX:", unsignedTx)
    const signedTx = await wallet.signTx(unsignedTx)
    const txHash = await hydraProvider.submitTx(signedTx)
    console.log("Head TX Hash:", txHash)

    hydraProvider.onMessage((msg) => {
      if ((msg as any).tag === "SnapshotConfirmed") {
        console.log("New snapshot in head:", msg)
      }
    })
  }

  const initHydraHead = useCallback(async () => {
    if (!wallet) return

    setLoading(true)
    setStatus("Initializing Hydra head...")

    try {
      const hydraProvider = new HydraProvider({ httpUrl: hydraApiUrl })
      const hydraInstance = new HydraInstance({
        provider: hydraProvider,
        fetcher: provider,
        submitter: provider,
      })

      await hydraProvider.connect()
      await hydraProvider.init()
      console.log("Hydra head init requested")
      setStatus("Hydra head initialized, waiting for open...")

      hydraProvider.onMessage(async (message) => {
        if ((message as any).headStatus === "HeadIsOpen") {
          console.log("Head is open — ready for transactions.")
          setStatus("Head is open, performing transaction...")
          await performHeadTransaction(hydraProvider, wallet)
        }
      })

      const changeAddr = await wallet.getChangeAddress()
      const utxos = await provider.fetchAddressUTxOs(changeAddr)
      if (utxos.length < 1) {
        console.error("No UTxOs available to commit")
        setStatus("Error: No UTxOs available to commit")
        return
      }
      
      const utxoToCommit = utxos[0]
      const txHash = utxoToCommit.input.txHash
      const outputIndex = utxoToCommit.input.outputIndex
      console.log("Selected UTxO for commit:", txHash, outputIndex)

      const commitTxCbor = await hydraInstance.commitFunds(txHash, outputIndex)
      const signedCommitTx = await wallet.signTx(commitTxCbor, true)
      const commitHash = await wallet.submitTx(signedCommitTx)
      console.log("CommitTx submitted:", commitHash)
      setStatus(`Commit transaction submitted: ${commitHash}`)

    } catch (error) {
      console.error('Hydra operation failed:', error)
      setStatus(`Error: ${error}`)
    }
    setLoading(false)
  }, [wallet])

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Hydra Payment Demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>Initialize Hydra head and send 2 ADA to: {recipientAddress}</p>
          
          <Button 
            onClick={initHydraHead}
            disabled={!connected || loading}
            className="w-full"
          >
            {loading ? "Processing..." : "Initialize Hydra Head & Pay"}
          </Button>

          {status && (
            <div className="bg-blue-100 p-4 rounded">
              <p className="text-blue-800">{status}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}