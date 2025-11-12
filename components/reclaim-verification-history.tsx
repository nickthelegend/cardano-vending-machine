"use client"

import useSWR from "swr"
import { loadReclaimHistory, countByProvider, type ReclaimVerificationRecord } from "@/lib/reclaim"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

const fetcher = (key: string) => {
  const [, address] = key.split(":")
  return {
    list: loadReclaimHistory(address || "anonymous"),
    counts: countByProvider(address || "anonymous"),
  }
}

export function ReclaimVerificationHistory({ walletAddress = "anonymous" }: { walletAddress?: string }) {
  const { data } = useSWR(`reclaim-history:${walletAddress}`, fetcher, { revalidateOnFocus: true })

  const list: ReclaimVerificationRecord[] = data?.list || []
  const counts = data?.counts || { google: 0, x: 0, linkedin: 0 }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reclaim Verification History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary">Google: {counts.google}</Badge>
          <Badge variant="secondary">X: {counts.x}</Badge>
          <Badge variant="secondary">LinkedIn: {counts.linkedin}</Badge>
        </div>

        <Separator />

        <div className="space-y-3">
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">No verifications yet.</p>
          ) : (
            list.slice(0, 10).map((r) => (
              <div key={r.id} className="flex items-start justify-between rounded-md border p-3">
                <div>
                  <div className="font-medium">{r.provider.toUpperCase()}</div>
                  <div className="text-xs text-muted-foreground">{new Date(r.timestamp).toLocaleString()}</div>
                </div>
                <Badge variant="outline">Session {r.sessionId ? r.sessionId.slice(0, 8) : "—"}</Badge>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
