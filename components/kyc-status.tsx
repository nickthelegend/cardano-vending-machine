"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useWallet } from "@txnlab/use-wallet-react"
import Link from "next/link"
import { CheckCircle2, Clock, AlertCircle } from "lucide-react"

export default function KYCStatus() {
  const { activeAccount } = useWallet()

  // Mock data - in a real app, this would come from your API
  const kycData = {
    walletAddress: activeAccount?.address || "",
    submission: "Submitted",
    level: "Level 2",
    status: "Pending",
    submittedOn: "2024-10-06",
  }

  const getStatusIcon = () => {
    switch (kycData.status) {
      case "Verified":
        return <CheckCircle2 className="h-5 w-5 text-accent" />
      case "Pending":
        return <Clock className="h-5 w-5 text-primary" />
      default:
        return <AlertCircle className="h-5 w-5 text-primary" />
    }
  }

  return (
    <Card className="overflow-hidden border-2">
      <CardContent className="p-0">
        <div className="bg-gradient-to-r from-primary/5 to-accent/5 border-b-2 border-primary/10 p-6">
          <h3 className="text-2xl font-bold mb-6">KYC Verification Status</h3>

          <div className="space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between py-3 px-4 bg-background rounded-lg border border-border">
              <span className="text-muted-foreground font-medium">Connected Wallet</span>
              <span className="font-mono text-sm break-all text-primary font-semibold mt-2 md:mt-0">
                {kycData.walletAddress}
              </span>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between py-3 px-4 bg-background rounded-lg border border-border">
              <span className="text-muted-foreground font-medium">Submission Status</span>
              <span className="font-medium text-accent mt-2 md:mt-0">{kycData.submission}</span>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between py-3 px-4 bg-background rounded-lg border border-border">
              <span className="text-muted-foreground font-medium">KYC Level</span>
              <span className="font-medium text-primary mt-2 md:mt-0">{kycData.level}</span>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between py-3 px-4 bg-background rounded-lg border border-border">
              <span className="text-muted-foreground font-medium">Verification Status</span>
              <div className="flex items-center gap-2 mt-2 md:mt-0">
                {getStatusIcon()}
                <span className="px-3 py-1 rounded-full text-sm font-semibold bg-primary/10 text-primary">
                  {kycData.status}
                </span>
              </div>
            </div>

            <div className="py-3 px-4 bg-background rounded-lg border border-border">
              <p className="text-muted-foreground text-sm">
                Your KYC is under review. We will notify you once it is verified.
              </p>
              <p className="text-xs text-muted-foreground mt-2">Submitted on: {kycData.submittedOn}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button asChild variant="outline" className="flex-1 bg-transparent">
                <Link href="/dashboard/view-details">View Details</Link>
              </Button>
              <Button asChild className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link href="/dashboard/fill-kyc">Update KYC</Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
