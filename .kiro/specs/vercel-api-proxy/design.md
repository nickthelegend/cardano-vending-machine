# Design Document

## Overview

This design implements a comprehensive API proxy layer for the Cardano vending machine application to solve mixed content issues and Vercel timeout constraints. The solution creates Next.js API routes that proxy all external HTTP calls, enabling HTTPS-to-HTTP communication server-side and implementing fire-and-forget patterns for long-running operations.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (HTTPS)                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         React Payment Page                            │   │
│  │  - Hydra operations                                   │   │
│  │  - Payment processing                                 │   │
│  │  - Balance fetching                                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                   │
│                          │ HTTPS                             │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Next.js API Routes (Serverless)               │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │  /api/hydra-status                              │  │   │
│  │  │  - GET head status                              │  │   │
│  │  │  - GET balance                                  │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │  /api/bob-commit                                │  │   │
│  │  │  - POST trigger commit (fire-and-forget)        │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │  /api/dispense-token                            │  │   │
│  │  │  - POST send token (fire-and-forget)            │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                   │
│                          │ HTTP (server-side)                │
│                          ▼                                   │
└─────────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
        ▼                                     ▼
┌───────────────────┐              ┌──────────────────┐
│   Hydra Node      │              │   Bob Service    │
│   :4001           │              │   :8001          │
│   - /head         │              │   - /commit-bob  │
│   - /snapshot     │              │   - /send/:addr  │
└───────────────────┘              └──────────────────┘
```

### Request Flow

1. **Synchronous Operations** (head status, balance):
   - Client → API Route → External Service → API Route → Client
   - Full response returned to client

2. **Asynchronous Operations** (Bob commit, token dispense):
   - Client → API Route → Immediate Response to Client
   - API Route → External Service (background, no wait)

## Components and Interfaces

### 1. Hydra Status API Route

**File**: `app/api/hydra-status/route.ts`

**Purpose**: Proxy read-only Hydra operations (head status, balance queries)

**Interface**:
```typescript
// GET /api/hydra-status
// Returns current head status
Response: {
  tag: 'Open' | 'Idle' | 'Initial' | 'Closed',
  contents?: {
    coordinatedHeadState?: {
      localUTxO?: Record<string, any>
    }
  }
}

// GET /api/hydra-status?address=addr1...
// Returns balance for specific address
Response: {
  balance: number,  // in ADA
  utxoCount: number,
  utxos: Array<{
    ref: string,
    lovelace: number
  }>
}
```

**Responsibilities**:
- Fetch data from Hydra node at http://209.38.126.165:4001
- Parse and transform responses
- Handle errors gracefully
- Cache responses briefly (5 seconds) to reduce load

### 2. Bob Commit API Route

**File**: `app/api/bob-commit/route.ts`

**Purpose**: Trigger Bob's automatic commit without waiting for completion

**Interface**:
```typescript
// POST /api/bob-commit
Request: {} // Empty body

Response: {
  success: true,
  message: 'Bob commit initiated'
}
```

**Responsibilities**:
- Initiate POST to http://209.38.126.165:8001/commit-bob
- Return immediately without waiting
- Log success/failure for debugging
- Handle network errors gracefully

### 3. Token Dispense API Route

**File**: `app/api/dispense-token/route.ts`

**Purpose**: Trigger token dispensing without waiting for completion

**Interface**:
```typescript
// POST /api/dispense-token
Request: {
  walletAddress: string
}

Response: {
  success: true,
  message: 'Token dispensing initiated'
}
```

**Responsibilities**:
- Validate wallet address format
- Initiate POST to http://209.38.126.165:8001/send/{address}
- Return immediately without waiting
- Log success/failure for debugging
- Handle network errors gracefully

### 4. Updated Payment Page Component

**File**: `app/pay/[machine-id]/page.tsx`

**Changes**:
- Replace direct HTTP calls with API route calls
- Update `fetchHeadStatus()` to use `/api/hydra-status`
- Update `fetchHydraBalance()` to use `/api/hydra-status?address=...`
- Update Bob commit call to use `/api/bob-commit`
- Update token dispense call to use `/api/dispense-token`
- Improve error messaging for async operations

## Data Models

### API Response Types

```typescript
// Hydra Status Response
interface HydraStatusResponse {
  tag: HeadState
  contents?: {
    coordinatedHeadState?: {
      localUTxO?: Record<string, UTxO>
    }
  }
}

// Balance Response
interface BalanceResponse {
  balance: number
  utxoCount: number
  utxos: Array<{
    ref: string
    lovelace: number
  }>
}

// Async Operation Response
interface AsyncOperationResponse {
  success: boolean
  message: string
  error?: string
}

// UTxO Type
interface UTxO {
  address: string
  value: {
    lovelace: number
  }
}
```

## Corr
ectness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: API proxy usage for external calls

*For any* client-side request to external HTTP services, the request should be routed through an HTTPS API route rather than calling the HTTP endpoint directly
**Validates: Requirements 1.1, 1.2**

### Property 2: Error responses are well-formed

*For any* proxy request that fails, the API route should return a response with a consistent error structure containing success: false and an error message
**Validates: Requirements 1.4**

### Property 3: Concurrent requests complete independently

*For any* set of concurrent proxy requests, all requests should complete successfully without blocking each other
**Validates: Requirements 1.5**

### Property 4: Fire-and-forget returns immediately

*For any* long-running operation (Bob commit, token dispense), the API route should return a success response before the external operation completes
**Validates: Requirements 2.2, 2.3, 3.2, 3.3, 4.1**

### Property 5: Background operation failures don't block main flow

*For any* background operation failure (Bob commit, token dispense), the main user operation (commit, payment) should complete successfully and the error should only be logged
**Validates: Requirements 2.4, 3.4**

### Property 6: Operations log their status

*For any* async operation, the system should create log entries indicating the operation was initiated and its outcome
**Validates: Requirements 4.3, 4.4**

### Property 7: Multiple async operations are independent

*For any* set of concurrent async operations, each operation should complete independently without affecting others
**Validates: Requirements 4.5**

### Property 8: Loading states are displayed

*For any* operation initiation, the UI should transition to a loading state before the operation completes
**Validates: Requirements 5.1**

### Property 9: Success feedback is shown

*For any* successful operation, the UI should display a success message or indicator
**Validates: Requirements 5.2**

### Property 10: Error feedback is user-friendly

*For any* operation failure, the UI should display an error message that is understandable to non-technical users
**Validates: Requirements 5.3**

### Property 11: Background operation feedback

*For any* background operation trigger, the UI should inform the user that processing is happening
**Validates: Requirements 5.4**

## Error Handling

### API Route Error Handling

1. **Network Errors**: Catch fetch failures and return structured error responses
2. **Timeout Handling**: For fire-and-forget operations, don't wait for completion
3. **Invalid Requests**: Validate input and return 400 Bad Request for invalid data
4. **Service Unavailable**: Return 503 when external services are unreachable
5. **Logging**: Log all errors with context for debugging

### Client Error Handling

1. **API Failures**: Display user-friendly messages when API routes fail
2. **Network Issues**: Show connectivity errors with retry options
3. **Timeout Fallbacks**: For async operations, assume success if API route responds
4. **Graceful Degradation**: Continue main flow even if background operations fail

### Error Response Format

```typescript
interface ErrorResponse {
  success: false
  error: string
  details?: string
  code?: string
}
```

## Testing Strategy

### Unit Testing

We will use Jest for unit testing the API routes and client-side functions.

**Unit Test Coverage**:
- API route request/response handling
- Error response formatting
- Input validation for wallet addresses
- Client-side API call functions
- Error message display logic

**Example Unit Tests**:
```typescript
describe('Hydra Status API', () => {
  it('should return head status from Hydra node', async () => {
    // Test successful status fetch
  })
  
  it('should return balance for valid address', async () => {
    // Test balance calculation
  })
  
  it('should handle Hydra node unavailable', async () => {
    // Test error handling
  })
})

describe('Bob Commit API', () => {
  it('should return immediately without waiting', async () => {
    // Test fire-and-forget pattern
  })
  
  it('should handle Bob service unavailable', async () => {
    // Test error handling
  })
})
```

### Property-Based Testing

We will use fast-check for property-based testing in TypeScript.

**Property Test Configuration**:
- Minimum 100 iterations per property test
- Each test tagged with feature name and property number
- Tests verify universal properties across random inputs

**Property Test Coverage**:
- Property 1: API proxy usage verification
- Property 2: Error response structure consistency
- Property 3: Concurrent request handling
- Property 4: Fire-and-forget timing verification
- Property 5: Background failure isolation
- Property 6: Logging completeness
- Property 7: Async operation independence

**Example Property Tests**:
```typescript
describe('Property: Fire-and-forget returns immediately', () => {
  it('Feature: vercel-api-proxy, Property 4', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (walletAddress) => {
        const startTime = Date.now()
        const response = await fetch('/api/dispense-token', {
          method: 'POST',
          body: JSON.stringify({ walletAddress })
        })
        const endTime = Date.now()
        
        // Should return in less than 1 second
        expect(endTime - startTime).toBeLessThan(1000)
        expect(response.ok).toBe(true)
      }),
      { numRuns: 100 }
    )
  })
})
```

### Integration Testing

- Test full flow: Client → API Route → External Service
- Mock external services for reliable testing
- Verify HTTPS/HTTP boundary crossing
- Test error propagation through layers

### Manual Testing

- Deploy to Vercel and verify HTTPS works
- Test with real Hydra node and Bob service
- Verify no mixed content errors in browser console
- Confirm operations complete within Vercel timeout limits

## Performance Considerations

1. **Response Caching**: Cache Hydra status for 5 seconds to reduce load
2. **Fire-and-Forget**: Don't wait for long operations to complete
3. **Connection Pooling**: Reuse HTTP connections where possible
4. **Timeout Configuration**: Set appropriate timeouts for external calls
5. **Error Recovery**: Implement retry logic for transient failures

## Security Considerations

1. **Input Validation**: Validate all inputs before proxying
2. **Rate Limiting**: Consider rate limiting API routes to prevent abuse
3. **CORS Configuration**: Properly configure CORS for API routes
4. **Error Messages**: Don't expose internal details in error messages
5. **Logging**: Log security-relevant events for audit

## Deployment Notes

### Environment Variables

```env
# External service URLs
HYDRA_NODE_URL=http://209.38.126.165:4001
BOB_SERVICE_URL=http://209.38.126.165:8001
```

### Vercel Configuration

- API routes automatically deployed as serverless functions
- Default timeout: 10 seconds (Hobby plan)
- Max timeout: 60 seconds (Pro plan)
- Fire-and-forget pattern ensures operations complete within limits

### Monitoring

- Log all API route invocations
- Track success/failure rates
- Monitor response times
- Alert on high error rates
