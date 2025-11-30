import { NextRequest, NextResponse } from 'next/server'

const BOB_SERVICE_URL = process.env.BOB_SERVICE_URL || 'http://209.38.126.165:8001'

/**
 * Validates a Cardano wallet address
 * Basic validation: checks if it starts with 'addr' and has reasonable length
 */
function isValidCardanoAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false
  }
  
  // Cardano addresses typically start with 'addr' (mainnet) or 'addr_test' (testnet)
  // and are between 58-108 characters long
  const trimmedAddress = address.trim()
  
  if (trimmedAddress.length < 58 || trimmedAddress.length > 108) {
    return false
  }
  
  // Check if it starts with valid prefixes
  const validPrefixes = ['addr1', 'addr_test1']
  const hasValidPrefix = validPrefixes.some(prefix => trimmedAddress.startsWith(prefix))
  
  if (!hasValidPrefix) {
    return false
  }
  
  // Check if it contains only valid characters (alphanumeric)
  const validCharacters = /^[a-zA-Z0-9]+$/
  if (!validCharacters.test(trimmedAddress)) {
    return false
  }
  
  return true
}

/**
 * POST /api/dispense-token
 * Triggers token dispensing operation using fire-and-forget pattern
 * Returns immediately without waiting for the operation to complete
 * 
 * This endpoint is designed to avoid Vercel timeout limits by not waiting
 * for the Bob service to complete the token dispensing operation.
 * 
 * Request body:
 * {
 *   "walletAddress": "addr1..."
 * }
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Token Dispense API] Received token dispense request')
    
    // Parse request body
    const body = await request.json()
    const { walletAddress } = body
    
    // Validate wallet address
    if (!walletAddress) {
      console.error('[Token Dispense API] Missing wallet address')
      return NextResponse.json(
        { 
          success: false,
          error: 'Wallet address is required',
          details: 'Please provide a valid Cardano wallet address'
        },
        { status: 400 }
      )
    }
    
    if (!isValidCardanoAddress(walletAddress)) {
      console.error('[Token Dispense API] Invalid wallet address format:', walletAddress)
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid wallet address format',
          details: 'Please provide a valid Cardano wallet address (addr1... or addr_test1...)'
        },
        { status: 400 }
      )
    }
    
    console.log('[Token Dispense API] Initiating token dispense for address:', walletAddress)
    
    const dispenseUrl = `${BOB_SERVICE_URL}/send/${walletAddress}`
    console.log(`[Token Dispense API] Calling Bob service at: ${dispenseUrl}`)
    
    // Fire-and-forget: initiate the request but don't wait for completion
    // We use fetch without await to start the operation in the background
    fetch(dispenseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then(response => {
        if (response.ok) {
          console.log('[Token Dispense API] Token dispensing operation completed successfully')
        } else {
          console.error(`[Token Dispense API] Bob service returned ${response.status}: ${response.statusText}`)
        }
      })
      .catch(error => {
        // Log error but don't block the response
        console.error('[Token Dispense API] Error calling Bob service:', error.message)
      })
    
    // Return immediately with success
    console.log('[Token Dispense API] Returning immediate success response')
    return NextResponse.json({
      success: true,
      message: 'Token dispensing initiated'
    })
    
  } catch (error: any) {
    // Handle any synchronous errors (e.g., invalid request parsing)
    console.error('[Token Dispense API] Synchronous error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Internal server error',
        details: 'Failed to initiate token dispensing'
      },
      { status: 500 }
    )
  }
}
