# Hydra Proxy Implementation

## Overview
This document describes how the Hydra integration uses a proxy to avoid CORS issues while maintaining direct access for read operations.

## Problem
The Hydra node at `http://209.38.126.165:4001` doesn't have CORS headers configured, which causes browser errors when trying to make write operations (commit, close, fanout) from the frontend.

## Solution
We use a dual-URL approach:
1. **Direct URL** for read-only operations (GET requests to `/head`)
2. **Proxy URL** for write operations (POST requests for commit, close, fanout)

## Configuration

### URLs
```typescript
// Direct URL for read operations (like /head status)
const HYDRA_NODE_URL = "http://209.38.126.165:4001"

// Proxy URL for write operations (commit, close, fanout)
const HYDRA_PROXY_URL = typeof window !== 'undefined' 
  ? `${window.location.origin}/api/hydra-proxy`
  : "http://localhost:3000/api/hydra-proxy"
```

## Implementation Details

### Read Operations (Direct URL)
These operations use the direct Hydra node URL because they're simple GET requests that don't trigger CORS preflight:

1. **fetchHeadStatus()** - Gets current head state
   ```typescript
   const response = await fetch(`${HYDRA_NODE_URL}/head`)
   ```

2. **fetchHydraBalance()** - Gets UTxO data from head
   ```typescript
   const response = await fetch(`${HYDRA_NODE_URL}/head`)
   ```

### Write Operations (Proxy URL)
These operations use the proxy because they make POST requests that trigger CORS preflight:

1. **HydraProvider initialization** - All HTTP operations go through proxy
   ```typescript
   const hydraProvider = new HydraProvider({ 
     httpUrl: HYDRA_PROXY_URL 
   })
   ```

2. **Commit funds** - POST to `/commit` via proxy
3. **Close head** - POST to `/close` via proxy
4. **Fanout** - POST to `/fanout` via proxy
5. **Submit transactions** - POST to `/tx` via proxy

## Proxy Implementation

The proxy is implemented at `/app/api/hydra-proxy/[...path]/route.ts` and:
- Forwards all HTTP methods (GET, POST, PUT, DELETE, PATCH)
- Adds appropriate headers
- Handles JSON responses
- Provides error handling
- Logs all requests for debugging

**Note**: WebSocket connections cannot be proxied through Next.js API routes. The HydraProvider handles WebSocket connections internally.

## Files Modified

### 1. `/app/pay/[machine-id]/page.tsx`
- Updated to use `HYDRA_PROXY_URL` for HydraProvider
- Updated to use `HYDRA_NODE_URL` for fetchHeadStatus and fetchHydraBalance
- All write operations (commit, close, fanout) now go through proxy

### 2. `/app/hydra-demo/page.tsx`
- Updated to use `HYDRA_PROXY_URL` for HydraProvider
- Updated to use `HYDRA_NODE_URL` for fetchHeadStatus and fetchHydraBalance
- All write operations (commit, close, fanout) now go through proxy

## Benefits

1. **No CORS Errors**: Write operations work without CORS issues
2. **Better Performance**: Read operations are faster (no proxy overhead)
3. **Simplified Debugging**: Proxy logs all requests
4. **Flexibility**: Can add authentication, rate limiting, etc. in proxy
5. **Security**: Proxy can validate requests before forwarding

## Testing

To verify the implementation:

1. **Read Operations**: Check browser console for direct requests to `http://209.38.126.165:4001/head`
2. **Write Operations**: Check browser console for requests to `/api/hydra-proxy/commit`, `/api/hydra-proxy/close`, etc.
3. **No CORS Errors**: Verify no CORS errors in browser console when performing operations

## Future Improvements

1. Add caching for head status requests
2. Add request/response logging in proxy
3. Add authentication to proxy endpoints
4. Add rate limiting to prevent abuse
5. Add WebSocket proxy support (requires separate implementation)
