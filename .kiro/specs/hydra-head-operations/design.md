# Design Document: Hydra Head Operations

## Overview

This design implements a complete Hydra head lifecycle management system within the `/hydra-demo` Next.js page. The system integrates Mesh SDK's Hydra components with a hosted Hydra node (139.59.24.68:4001) to enable users to initialize, commit funds to, close, and fanout Hydra heads using their connected CIP-30 wallets.

The architecture follows a client-side React component pattern with state management for tracking operation progress, Hydra head status, and user interactions. The design emphasizes clear separation between wallet operations (Layer 1), Hydra provider operations (Layer 2 coordination), and UI state management.

## Architecture

### Component Structure

```
HydraDemo (React Component)
├── Wallet Integration (Mesh SDK useWallet hook)
├── Hydra Provider Management
│   ├── HydraProvider (connection to Hydra node)
│   └── HydraInstance (operation execution)
├── State Management
│   ├── Operation status tracking
│   ├── Head state tracking
│   └── Loading states
└── UI Components
    ├── Wallet connection display
    ├── Operation buttons (Init, Commit, Close, Fanout)
    └── Status display panel
```

### Data Flow

1. **Initialization Flow**: User → UI Button → HydraProvider.connect() → HydraProvider.init() → Hydra Node → Status Update
2. **Commit Flow**: User → UI Button → Fetch UTxOs → HydraInstance.commitFunds() → Wallet.signTx() → Wallet.submitTx() → Layer 1 → Status Update
3. **Close Flow**: User → UI Button → HydraProvider.close() → Hydra Node → Status Update
4. **Fanout Flow**: User → UI Button → HydraProvider.fanout() → Hydra Node → Layer 1 Distribution → Status Update

### External Dependencies

- **Mesh SDK (@meshsdk/react, @meshsdk/core, @meshsdk/hydra)**: Provides wallet integration and Hydra operations
- **Hydra Node (139.59.24.68:4001)**: Backend service managing Hydra head state
- **Blockfrost API**: Layer 1 blockchain data provider for preprod network
- **CIP-30 Wallet**: User's browser wallet extension (Nami, Eternl, etc.)

## Components and Interfaces

### HydraDemo Component

**Purpose**: Main React component managing the entire Hydra head lifecycle

**State Variables**:
```typescript
- loading: boolean                    // Tracks if operation is in progress
- status: string                      // Current operation status message
- headState: 'idle' | 'initializing' | 'initialized' | 'open' | 'closing' | 'closed' | 'fanout'
- hydraProvider: HydraProvider | null // Singleton Hydra provider instance
- hydraInstance: HydraInstance | null // Hydra instance for operations
```

**Key Methods**:
```typescript
- initializeHead(): Promise<void>     // Initialize Hydra head
- commitFunds(): Promise<void>        // Commit UTxOs to head
- closeHead(): Promise<void>          // Close the Hydra head
- fanoutHead(): Promise<void>         // Fanout closed head
- setupHydraProvider(): Promise<void> // Create and configure HydraProvider
- handleHydraMessage(msg: any): void  // Process Hydra node messages
```

### HydraProvider Configuration

**Purpose**: Manages connection to the Hydra node and message handling

**Configuration**:
```typescript
const hydraProvider = new HydraProvider({
  httpUrl: "http://139.59.24.68:4001"
})
```

**Message Handling**:
The provider receives WebSocket messages from the Hydra node with tags like:
- `HeadIsInitializing`: Head initialization started
- `Committed`: Participant committed funds
- `HeadIsOpen`: Head is ready for transactions
- `HeadIsClosed`: Head has been closed
- `HeadIsFinalized`: Fanout complete

### HydraInstance Configuration

**Purpose**: Executes Hydra operations requiring Layer 1 interaction

**Configuration**:
```typescript
const blockfrostProvider = new BlockfrostProvider(BLOCKFROST_API_KEY)

const hydraInstance = new HydraInstance({
  provider: hydraProvider,
  fetcher: blockfrostProvider,
  submitter: blockfrostProvider
})
```

**Operations**:
- `commitFunds(txHash: string, outputIndex: number): Promise<string>` - Builds commit transaction CBOR

### Wallet Integration

**Purpose**: Connect to user's CIP-30 wallet and sign transactions

**Hook Usage**:
```typescript
const { connected, wallet } = useWallet()
```

**Wallet Methods Used**:
- `wallet.getChangeAddress()`: Get wallet's change address for UTxO queries
- `wallet.signTx(txCbor: string, partialSign: boolean)`: Sign transactions
- `wallet.submitTx(signedTx: string)`: Submit signed transactions to Layer 1

## Data Models

### Operation Status

```typescript
type OperationStatus = {
  message: string
  type: 'info' | 'success' | 'error' | 'loading'
  timestamp: Date
}
```

### Head State

```typescript
type HeadState = 
  | 'idle'          // No head initialized
  | 'initializing'  // Init requested, waiting for confirmation
  | 'initialized'   // Init confirmed, ready for commits
  | 'open'          // Head is open, ready for transactions
  | 'closing'       // Close requested
  | 'closed'        // Head closed, ready for fanout
  | 'fanout'        // Fanout in progress
```

### Hydra Message Types

```typescript
interface HydraMessage {
  tag: string
  headStatus?: string
  timestamp: string
  [key: string]: any
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Wallet connection displays address
*For any* successful wallet connection, the system should retrieve and display the wallet's address in the UI.
**Validates: Requirements 1.2**

### Property 2: Wallet state controls operation availability
*For any* application state, Hydra operation buttons should be enabled if and only if a wallet is connected and no operation is in progress.
**Validates: Requirements 1.3, 4.4, 4.5, 7.5**

### Property 3: Disconnect clears wallet state
*For any* connected wallet state, disconnecting should reset the application to its initial state with no wallet address and all operations disabled.
**Validates: Requirements 1.5**

### Property 4: Initialization triggers connection and init sequence
*For any* initialization request, the system should first connect to the Hydra provider, then call the init method in that order.
**Validates: Requirements 2.2**

### Property 5: Hydra messages update application state
*For any* message received from the Hydra node with a recognized tag (HeadIsOpen, HeadIsClosed, etc.), the application state should update to reflect the new head status.
**Validates: Requirements 2.4, 4.3, 5.3, 7.2**

### Property 6: Commit operation follows correct sequence
*For any* commit operation, the system should execute the following sequence: fetch UTxOs → select UTxO → build commit tx → sign with collateral flag → submit to Layer 1.
**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

### Property 7: Successful operations display transaction hash
*For any* commit operation that completes successfully, the system should display the resulting transaction hash to the user.
**Validates: Requirements 3.6**

### Property 8: Operations provide status feedback
*For any* Hydra operation (init, commit, close, fanout), the system should display a loading indicator during execution and update the status message with operation progress.
**Validates: Requirements 2.3, 5.2, 6.2, 7.1**

### Property 9: Close button triggers close request
*For any* user click on the close button when the head is open, the system should send a close request to the Hydra provider.
**Validates: Requirements 5.1**

### Property 10: Closed head enables fanout
*For any* application state where the head status is "closed", the fanout button should be enabled.
**Validates: Requirements 5.4**

### Property 11: Fanout button triggers fanout request
*For any* user click on the fanout button when the head is closed, the system should send a fanout request to the Hydra provider.
**Validates: Requirements 6.1**

### Property 12: Operation completion shows success message
*For any* Hydra operation that completes without throwing an error, the system should display a success message with operation details.
**Validates: Requirements 6.4, 7.3**

### Property 13: HydraProvider uses configured URL
*For any* operation requiring the Hydra provider, the system should use the configured URL "http://139.59.24.68:4001" for all communications.
**Validates: Requirements 8.2**

### Property 14: Single HydraProvider instance maintained
*For any* multiple calls to access the Hydra provider within the component lifecycle, the same provider instance should be returned.
**Validates: Requirements 8.5**

### Property 15: Errors are caught and handled gracefully
*For any* Hydra operation that throws an exception, the system should catch the error, log it to console, display a user-friendly error message, and reset the loading state to allow retry.
**Validates: Requirements 9.1, 9.2, 9.3, 9.4**

## Error Handling

### Error Categories

1. **Wallet Connection Errors**
   - No wallet installed
   - User rejects connection
   - Wallet API errors
   - **Handling**: Display error message, maintain disconnected state, allow retry

2. **Hydra Node Connection Errors**
   - Node unreachable (network issues)
   - WebSocket connection failures
   - Invalid node URL
   - **Handling**: Display connectivity error with node URL, suggest checking network, allow retry

3. **Transaction Errors**
   - Insufficient funds
   - No UTxOs available
   - Transaction signing rejected
   - Transaction submission failures
   - **Handling**: Display specific error message, log details, reset loading state, maintain current head state

4. **Operation Errors**
   - Invalid head state for operation (e.g., trying to commit when head is closed)
   - Timeout waiting for Hydra node response
   - Unexpected message format from Hydra node
   - **Handling**: Display operation-specific error, log full error details, reset to safe state

### Error Recovery Strategy

All errors follow this pattern:
```typescript
try {
  // Operation code
} catch (error) {
  console.error('Operation failed:', error)
  setStatus(`Error: ${error.message || 'Unknown error'}`)
  setLoading(false)
  // Maintain current head state - don't reset unless necessary
}
```

### User Feedback

- **Loading states**: Show spinner and descriptive message ("Initializing...", "Committing funds...")
- **Success states**: Show success message with relevant details (tx hash, new head state)
- **Error states**: Show error message with actionable guidance ("Check wallet connection", "Ensure sufficient funds")
- **Info states**: Show current head status and available operations

## Testing Strategy

### Unit Testing

Unit tests will verify specific scenarios and edge cases:

1. **Wallet Connection Tests**
   - Test wallet connection success displays address
   - Test wallet connection failure shows error
   - Test disconnect clears state

2. **Configuration Tests**
   - Test HydraProvider configured with correct URL (139.59.24.68:4001)
   - Test BlockfrostProvider configured with preprod network
   - Test singleton HydraProvider instance

3. **Error Handling Tests**
   - Test empty UTxO set prevents commit
   - Test network errors display connectivity message
   - Test signing rejection maintains state

4. **Message Handling Tests**
   - Test HeadIsOpen message updates state to "open"
   - Test HeadIsClosed message updates state to "closed"
   - Test unknown messages are logged but don't crash

### Property-Based Testing

Property-based tests will verify universal behaviors across many inputs using **fast-check** library for TypeScript/JavaScript. Each test will run a minimum of 100 iterations.

1. **State Transition Properties**
   - Property: Wallet connection state correctly enables/disables operations
   - Property: Head state transitions follow valid state machine paths
   - Property: Disconnect always returns to initial state

2. **Operation Sequence Properties**
   - Property: Commit operation always follows fetch → select → build → sign → submit sequence
   - Property: All operations display loading state during execution
   - Property: All operations reset loading state on completion or error

3. **Error Handling Properties**
   - Property: Any thrown error is caught and doesn't crash the application
   - Property: Any error results in error message display and loading state reset
   - Property: Any error logs to console

4. **Message Handling Properties**
   - Property: Any recognized Hydra message updates application state
   - Property: Any message with HeadIsOpen tag enables transaction operations
   - Property: Any message updates status display

5. **Configuration Properties**
   - Property: All Hydra operations use the same configured provider instance
   - Property: All Layer 1 operations use BlockfrostProvider

### Integration Testing

Integration tests will verify end-to-end flows with mocked Hydra node and wallet:

1. **Full Lifecycle Test**: Initialize → Commit → (Head Opens) → Close → Fanout
2. **Error Recovery Test**: Operation fails → Error displayed → User retries → Success
3. **Concurrent Operation Prevention**: Operation in progress → Buttons disabled → Operation completes → Buttons re-enabled

### Test Utilities

Create mock implementations for:
- `MockWallet`: Simulates CIP-30 wallet with configurable responses
- `MockHydraProvider`: Simulates Hydra node messages and responses
- `MockBlockfrostProvider`: Simulates Layer 1 blockchain data

## Implementation Notes

### State Management

Use React useState hooks for:
- `loading`: Boolean for operation in progress
- `status`: String for user-facing status messages
- `headState`: Enum for Hydra head state machine
- `hydraProvider`: Singleton instance (created once, reused)
- `hydraInstance`: Created with hydraProvider and blockfrost

### Message Handling

Register message handler once when HydraProvider is created:
```typescript
hydraProvider.onMessage((message) => {
  console.log('Hydra message:', message)
  handleHydraMessage(message)
})
```

Parse message tags to update state:
- `HeadIsInitializing` → headState = 'initializing'
- `HeadIsOpen` → headState = 'open'
- `HeadIsClosed` → headState = 'closed'
- `HeadIsFinalized` → headState = 'idle', show success

### Transaction Signing

Always use `partialSign: true` (second parameter) when signing commit transactions:
```typescript
const signedTx = await wallet.signTx(commitTxCbor, true)
```

This is required for Hydra commit transactions as they involve multiple signatures.

### Environment Configuration

Store Blockfrost API key in environment variable:
```
NEXT_PUBLIC_BLOCKFROST_API_KEY=preprodFzYIfO6BdUE1PvHWIiekgYE1ixMa9XF9
```

Hydra node URL can be hardcoded as it's specific to this demo:
```typescript
const HYDRA_NODE_URL = "http://139.59.24.68:4001"
```

### UI/UX Considerations

1. **Button States**:
   - Disabled when wallet not connected
   - Disabled when operation in progress
   - Disabled when head state doesn't allow operation (e.g., fanout only available when closed)

2. **Status Display**:
   - Use color coding: blue for info, green for success, red for error, yellow for loading
   - Show timestamp for operations
   - Keep history of recent operations

3. **Progressive Disclosure**:
   - Show only relevant operations based on current head state
   - Hide advanced options initially
   - Provide tooltips explaining each operation

## Security Considerations

1. **Wallet Security**:
   - Never store private keys
   - Always use wallet's signing methods
   - Validate addresses before displaying

2. **Transaction Security**:
   - Validate UTxO data before committing
   - Check transaction outputs before signing
   - Verify transaction hashes after submission

3. **Network Security**:
   - Use HTTPS for production (current demo uses HTTP)
   - Validate Hydra node responses
   - Implement timeout for long-running operations

4. **Error Information**:
   - Don't expose sensitive error details to UI
   - Log full errors to console for debugging
   - Sanitize error messages shown to users

## Performance Considerations

1. **Provider Reuse**: Create HydraProvider once and reuse to avoid multiple WebSocket connections
2. **Message Throttling**: If Hydra node sends many messages, throttle UI updates to prevent excessive re-renders
3. **UTxO Fetching**: Cache UTxO data briefly to avoid repeated blockchain queries
4. **Lazy Loading**: Only connect to Hydra node when user initiates an operation, not on page load

## Future Enhancements

1. **Multi-Participant Support**: Show status of other participants' commits
2. **Transaction History**: Display all transactions performed within the head
3. **UTxO Selection**: Allow user to choose which UTxOs to commit
4. **Amount Specification**: Let user specify how much to commit
5. **Head Status Dashboard**: Real-time visualization of head state and participants
6. **WebSocket Reconnection**: Auto-reconnect if connection to Hydra node drops
7. **Transaction Simulation**: Preview transaction effects before signing
