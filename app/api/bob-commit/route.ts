import { NextRequest, NextResponse } from 'next/server'

const BOB_SERVICE_URL = process.env.BOB_SERVICE_URL || 'http://209.38.126.165:8001'

/**
 * POST /api/bob-commit
 * Triggers Bob's automatic commit operation using fire-and-forget pattern
 * Returns immediately without waiting for the operation to complete
 * 
 * This endpoint is designed to avoid Vercel timeout limits by not waiting
 * for the Bob service to complete the commit operation.
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Bob Commit API] Initiating Bob commit operation')
    
    const bobCommitUrl = `${BOB_SERVICE_URL}/commit-bob`
    console.log(`[Bob Commit API] Calling Bob service at: ${bobCommitUrl}`)
    
    // Fire-and-forget: initiate the request but don't wait for completion
    // We use fetch without await to start the operation in the background
    fetch(bobCommitUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then(response => {
        if (response.ok) {
          console.log('[Bob Commit API] Bob commit operation completed successfully')
        } else {
          console.error(`[Bob Commit API] Bob service returned ${response.status}: ${response.statusText}`)
        }
      })
      .catch(error => {
        // Log error but don't block the response
        console.error('[Bob Commit API] Error calling Bob service:', error.message)
      })
    
    // Return immediately with success
    console.log('[Bob Commit API] Returning immediate success response')
    return NextResponse.json({
      success: true,
      message: 'Bob commit initiated'
    })
    
  } catch (error: any) {
    // Handle any synchronous errors (e.g., invalid request parsing)
    console.error('[Bob Commit API] Synchronous error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Internal server error',
        details: 'Failed to initiate Bob commit'
      },
      { status: 500 }
    )
  }
}
