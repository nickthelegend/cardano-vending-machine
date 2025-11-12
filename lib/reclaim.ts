export type ReclaimProvider = "google" | "x" | "linkedin"

export type ReclaimVerificationRecord = {
  id: string
  provider: ReclaimProvider
  sessionId?: string
  timestamp: number
  claimInfo?: any
}

const STORAGE_KEY_PREFIX = "reclaim:history:"

export function loadReclaimHistory(walletAddress = "anonymous"): ReclaimVerificationRecord[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + walletAddress)
    return raw ? (JSON.parse(raw) as ReclaimVerificationRecord[]) : []
  } catch {
    return []
  }
}

export function saveReclaimHistory(walletAddress = "anonymous", records: ReclaimVerificationRecord[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY_PREFIX + walletAddress, JSON.stringify(records))
}

export function addReclaimVerification(walletAddress = "anonymous", record: ReclaimVerificationRecord) {
  const existing = loadReclaimHistory(walletAddress)
  existing.unshift(record)
  saveReclaimHistory(walletAddress, existing)
}

export function countByProvider(walletAddress = "anonymous"): Record<ReclaimProvider, number> {
  const list = loadReclaimHistory(walletAddress)
  return {
    google: list.filter((r) => r.provider === "google").length,
    x: list.filter((r) => r.provider === "x").length,
    linkedin: list.filter((r) => r.provider === "linkedin").length,
  }
}
