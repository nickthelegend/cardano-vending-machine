"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { v4 as uuidv4 } from "uuid"
import { addReclaimVerification, type ReclaimProvider } from "@/lib/reclaim"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, Loader2 } from "lucide-react"

// import Reclaim SDK lazily to avoid SSR issues
const loadReclaim = async () => {
  const mod = await import("@reclaimprotocol/js-sdk")
  return mod.ReclaimProofRequest
}

// react-qr-code renders an SVG QR—safe to SSR false
const QRCode = dynamic(() => import("react-qr-code"), { ssr: false })

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  walletAddress?: string
}

type ProviderPreset = {
  key: ReclaimProvider
  label: string
  providerId: string
}

const PROVIDERS: ProviderPreset[] = [
  { key: "google", label: "Google", providerId: "http-get-google-login" },
  { key: "x", label: "X (Twitter)", providerId: "http-get-x-login" },
  { key: "linkedin", label: "LinkedIn", providerId: "http-get-linkedin-login" },
]

export function ReclaimQRModal({ open, onOpenChange, walletAddress = "anonymous" }: Props) {
  const [provider, setProvider] = React.useState<ReclaimProvider>("google")
  const [requestUrl, setRequestUrl] = React.useState<string | null>(null)
  const [sessionActive, setSessionActive] = React.useState(false)
  const [statusMsg, setStatusMsg] = React.useState<string>("")
  const [errorMsg, setErrorMsg] = React.useState<string>("")
  const [isLoading, setIsLoading] = React.useState(false)

  const startVerification = async () => {
    setErrorMsg("")
    setStatusMsg("")
    setIsLoading(true)
    setRequestUrl(null)

    try {
      const selectedProvider = PROVIDERS.find((p) => p.key === provider)
      if (!selectedProvider) {
        setErrorMsg("Invalid provider selected.")
        setIsLoading(false)
        return
      }

      const res = await fetch(
        `/api/reclaim/generate-config?providerId=${encodeURIComponent(selectedProvider.providerId)}`,
      )
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error || "Failed to generate Reclaim config")
      }

      const data = await res.json()
      const config = data?.reclaimProofRequestConfig

      if (!config) {
        setErrorMsg("Failed to generate verification config. Check your environment variables.")
        setIsLoading(false)
        return
      }

      const ReclaimProofRequest = await loadReclaim()
      const reclaim = ReclaimProofRequest.fromJsonString(config)

      const url = await reclaim.getRequestUrl()
      setRequestUrl(url)
      setStatusMsg("Scan the QR with your phone to verify.")

      setSessionActive(true)
      await reclaim.startSession({
        onSuccess: async (proofs: any) => {
          setStatusMsg("Verification successful. Saving proof...")
          addReclaimVerification(walletAddress, {
            id: uuidv4(),
            provider,
            sessionId: proofs?.sessionId || undefined,
            timestamp: Date.now(),
            claimInfo: proofs,
          })
          setStatusMsg("Verification complete. You can now close this modal.")
          setSessionActive(false)
        },
        onError: (err: Error) => {
          console.error("[v0] Reclaim session error:", err)
          setErrorMsg("Verification failed or canceled. Please try again.")
          setSessionActive(false)
        },
      })
    } catch (e: any) {
      console.error("[v0] startVerification error:", e)
      setErrorMsg(e?.message || "Unexpected error starting verification.")
      setSessionActive(false)
    } finally {
      setIsLoading(false)
    }
  }

  const selected = PROVIDERS.find((p) => p.key === provider)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add ZKP Verification</DialogTitle>
          <DialogDescription className="text-pretty">
            Verify your account using Reclaim Protocol. Use your phone to scan the QR and complete verification for
            higher limits.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Tabs value={provider} onValueChange={(v) => setProvider(v as ReclaimProvider)}>
            <TabsList className="grid grid-cols-3 w-full">
              {PROVIDERS.map((p) => (
                <TabsTrigger key={p.key} value={p.key} className="text-sm">
                  {p.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {errorMsg && (
            <div className="flex gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{errorMsg}</p>
            </div>
          )}

          <Separator />

          <div className="w-full flex flex-col items-center justify-center p-6 bg-secondary/5 rounded-lg border-2 border-dashed border-border">
            {requestUrl ? (
              <div className="flex flex-col items-center gap-4">
                <QRCode value={requestUrl} size={200} level="H" includeMargin={true} />
                <div className="text-center">
                  <p className="text-sm font-medium">Scan with your phone</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {sessionActive ? "Waiting for verification..." : "Complete verification on your device"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">QR code will appear here</p>
                <p className="text-xs text-muted-foreground mt-1">Click "Start Verification" to begin</p>
              </div>
            )}
          </div>

          {statusMsg && <p className="text-sm text-muted-foreground text-center">{statusMsg}</p>}

          <Button
            onClick={startVerification}
            disabled={sessionActive || isLoading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating QR...
              </>
            ) : sessionActive ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Waiting for verification...
              </>
            ) : (
              "Start Verification"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
