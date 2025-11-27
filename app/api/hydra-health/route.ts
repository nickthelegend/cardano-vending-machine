import { NextResponse } from 'next/server'

const HYDRA_NODE_URL = 'http://209.38.126.165:4001'

export async function GET() {
  try {
    console.log(`[Hydra Health Check] Testing connection to ${HYDRA_NODE_URL}`)
    
    const response = await fetch(HYDRA_NODE_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    const isHealthy = response.ok
    
    return NextResponse.json({
      healthy: isHealthy,
      status: response.status,
      url: HYDRA_NODE_URL,
      message: isHealthy 
        ? 'Hydra node is accessible' 
        : `Hydra node returned status ${response.status}`
    })
  } catch (error: any) {
    console.error('[Hydra Health Check] Error:', error)
    return NextResponse.json({
      healthy: false,
      url: HYDRA_NODE_URL,
      error: error.message || 'Failed to connect to Hydra node',
      message: 'Cannot reach Hydra node. Please verify the node is running and accessible.'
    }, { status: 500 })
  }
}
