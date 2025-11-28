import { NextRequest, NextResponse } from 'next/server'

const HYDRA_NODE_URL = 'http://209.38.126.165:4001'
const HYDRA_NODE_WS_URL = 'ws://209.38.126.165:4001'

// Handle all HTTP methods and proxy to Hydra node
async function handleRequest(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Check if this is a WebSocket upgrade request
    const upgrade = request.headers.get('upgrade')
    if (upgrade?.toLowerCase() === 'websocket') {
      // WebSocket requests cannot be handled in Next.js API routes
      // Return instructions to connect directly
      console.log('[Hydra Proxy] WebSocket upgrade requested - not supported in API routes')
      return NextResponse.json(
        { 
          error: 'WebSocket connections not supported through proxy',
          message: 'Please connect directly to the Hydra node WebSocket',
          wsUrl: HYDRA_NODE_WS_URL
        },
        { status: 400 }
      )
    }
    
    // Construct the path from the dynamic segments
    const path = params.path ? `/${params.path.join('/')}` : ''
    const search = new URL(request.url).search
    
    // Construct the target URL
    const targetUrl = `${HYDRA_NODE_URL}${path}${search}`
    
    console.log(`[Hydra Proxy] ${request.method} ${targetUrl}`)
    
    // Prepare request options
    const options: RequestInit = {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
      },
    }
    
    // Add body for POST, PUT, PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const body = await request.text()
      if (body) {
        options.body = body
      }
    }
    
    // Make the proxied request
    const response = await fetch(targetUrl, options)
    
    // Get response data
    const contentType = response.headers.get('content-type')
    let data
    
    if (contentType?.includes('application/json')) {
      data = await response.json()
    } else {
      data = await response.text()
    }
    
    console.log(`[Hydra Proxy] Response status: ${response.status}`)
    console.log(`[Hydra Proxy] Response data:`, data)
    
    // Return the response with appropriate status
    return NextResponse.json(data, { status: response.status })
    
  } catch (error: any) {
    console.error('[Hydra Proxy] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Proxy request failed' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  context: { params: { path: string[] } }
) {
  return handleRequest(request, context)
}

export async function POST(
  request: NextRequest,
  context: { params: { path: string[] } }
) {
  return handleRequest(request, context)
}

export async function PUT(
  request: NextRequest,
  context: { params: { path: string[] } }
) {
  return handleRequest(request, context)
}

export async function DELETE(
  request: NextRequest,
  context: { params: { path: string[] } }
) {
  return handleRequest(request, context)
}

export async function PATCH(
  request: NextRequest,
  context: { params: { path: string[] } }
) {
  return handleRequest(request, context)
}
