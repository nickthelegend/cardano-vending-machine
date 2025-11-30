import { NextRequest, NextResponse } from 'next/server'

const HYDRA_NODE_URL = process.env.HYDRA_NODE_URL || 'http://209.38.126.165:4001'

// Simple in-memory cache with TTL
interface CacheEntry {
  data: any
  timestamp: number
}

const cache = new Map<string, CacheEntry>()
const CACHE_TTL = 5000 // 5 seconds

/**
 * Get cached data if still valid
 */
function getCachedData(key: string): any | null {
  const entry = cache.get(key)
  if (!entry) return null
  
  const now = Date.now()
  if (now - entry.timestamp > CACHE_TTL) {
    cache.delete(key)
    return null
  }
  
  return entry.data
}

/**
 * Store data in cache
 */
function setCachedData(key: string, data: any): void {
  cache.set(key, {
    data,
    timestamp: Date.now()
  })
}

/**
 * GET /api/hydra-status
 * Returns current head status or balance for a specific address
 * 
 * Query params:
 * - address: (optional) Cardano address to get balance for
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')
    
    // Create cache key based on request
    const cacheKey = address ? `balance:${address}` : 'head-status'
    
    // Check cache first
    const cachedData = getCachedData(cacheKey)
    if (cachedData) {
      console.log(`[Hydra Status API] Cache hit for ${cacheKey}`)
      return NextResponse.json(cachedData)
    }
    
    console.log(`[Hydra Status API] Fetching from Hydra node: ${HYDRA_NODE_URL}/head`)
    
    // Fetch head status from Hydra node
    const response = await fetch(`${HYDRA_NODE_URL}/head`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      console.error(`[Hydra Status API] Hydra node returned ${response.status}`)
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to fetch head status from Hydra node',
          details: `HTTP ${response.status}: ${response.statusText}`
        },
        { status: response.status }
      )
    }
    
    const headData = await response.json()
    console.log(`[Hydra Status API] Head data received, tag: ${headData?.tag}`)
    
    // If address is provided, calculate balance for that address
    if (address) {
      console.log(`[Hydra Status API] Calculating balance for address: ${address}`)
      
      // Get localUTxO from coordinatedHeadState
      const localUTxO = headData?.contents?.coordinatedHeadState?.localUTxO || {}
      const utxoEntries = Object.entries(localUTxO)
      
      // Filter and calculate balance for the requested address
      let totalLovelace = 0
      let myUtxoCount = 0
      const utxos: Array<{ ref: string; lovelace: number }> = []
      
      for (const [utxoRef, utxo] of utxoEntries) {
        const utxoData = utxo as any
        
        if (utxoData.address === address) {
          const lovelace = utxoData.value?.lovelace || 0
          totalLovelace += Number(lovelace)
          myUtxoCount++
          utxos.push({
            ref: utxoRef,
            lovelace: Number(lovelace)
          })
        }
      }
      
      // Convert to ADA
      const balanceAda = totalLovelace / 1_000_000
      
      const balanceResponse = {
        balance: balanceAda,
        utxoCount: myUtxoCount,
        utxos
      }
      
      console.log(`[Hydra Status API] Balance: ${balanceAda} ADA (${myUtxoCount} UTxOs)`)
      
      // Cache the response
      setCachedData(cacheKey, balanceResponse)
      
      return NextResponse.json(balanceResponse)
    }
    
    // Return head status
    const statusResponse = {
      tag: headData.tag,
      contents: headData.contents
    }
    
    // Cache the response
    setCachedData(cacheKey, statusResponse)
    
    return NextResponse.json(statusResponse)
    
  } catch (error: any) {
    console.error('[Hydra Status API] Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Internal server error',
        details: 'Failed to process request'
      },
      { status: 500 }
    )
  }
}
