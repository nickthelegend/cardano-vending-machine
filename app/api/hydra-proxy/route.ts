import { NextRequest, NextResponse } from 'next/server'

const HYDRA_NODE_URL = process.env.HYDRA_NODE_URL || 'http://209.38.126.165:4001'

// Handle all HTTP methods and proxy to Hydra node
async function handleRequest(request: NextRequest) {
  try {
    // Get the path from the URL - everything after /api/hydra-proxy
    const url = new URL(request.url)
    const pathname = url.pathname.replace('/api/hydra-proxy', '')
    const search = url.search
    
    // Construct the target URL
    const targetUrl = `${HYDRA_NODE_URL}${pathname}${search}`
    
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

export async function GET(request: NextRequest) {
  return handleRequest(request)
}

export async function POST(request: NextRequest) {
  return handleRequest(request)
}

export async function PUT(request: NextRequest) {
  return handleRequest(request)
}

export async function DELETE(request: NextRequest) {
  return handleRequest(request)
}

export async function PATCH(request: NextRequest) {
  return handleRequest(request)
}
