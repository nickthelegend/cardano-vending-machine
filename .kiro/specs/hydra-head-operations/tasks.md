# Implementation Plan

- [x] 1. Update HydraDemo component structure and state management





  - Refactor the existing `/app/hydra-demo/page.tsx` component to support the complete Hydra head lifecycle
  - Add state variables for headState tracking ('idle', 'initializing', 'initialized', 'open', 'closing', 'closed', 'fanout')
  - Implement singleton pattern for HydraProvider to maintain single instance throughout component lifecycle
  - Add state for hydraInstance to be created once and reused
  - _Requirements: 1.1, 1.2, 1.3, 8.5_

- [ ]* 1.1 Write property test for wallet state management
  - **Property 2: Wallet state controls operation availability**
  - **Validates: Requirements 1.3, 4.4, 4.5, 7.5**

- [ ]* 1.2 Write property test for disconnect state cleanup
  - **Property 3: Disconnect clears wallet state**
  - **Validates: Requirements 1.5**
-

- [x] 2. Implement Hydra provider configuration and connection



  - Create setupHydraProvider function that initializes HydraProvider with URL "http://139.59.24.68:4001"
  - Implement connection logic with error handling for unreachable node
  - Set up message handler registration for Hydra node messages
  - Create HydraInstance with BlockfrostProvider for Layer 1 operations
  - Ensure provider instance is reused across operations (singleton pattern)
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ]* 2.1 Write property test for provider singleton behavior
  - **Property 14: Single HydraProvider instance maintained**
  - **Validates: Requirements 8.5**

- [ ]* 2.2 Write property test for provider URL configuration
  - **Property 13: HydraProvider uses configured URL**
  - **Validates: Requirements 8.2**





- [ ] 3. Implement Hydra head initialization functionality

  - Create initializeHead function that connects to Hydra provider
  - Call provider.init() to send initialization request to Hydra node
  - Update UI status to show "Initializing Hydra head..." during operation
  - Set loading state to true during initialization
  - Add error handling with user-friendly error messages
  - _Requirements: 2.1, 2.2, 2.3, 2.5_

- [ ]* 3.1 Write property test for initialization sequence
  - **Property 4: Initialization triggers connection and init sequence**
  - **Validates: Requirements 2.2**




- [ ]* 3.2 Write property test for operation status feedback
  - **Property 8: Operations provide status feedback**
  - **Validates: Requirements 2.3, 5.2, 6.2, 7.1**

- [ ] 4. Implement Hydra message handling

  - Create handleHydraMessage function to process messages from Hydra node
  - Parse message tags (HeadIsInitializing, Committed, HeadIsOpen, HeadIsClosed, HeadIsFinalized)
  - Update headState based on message tags
  - Update UI status display with message information



  - Log all messages to console for debugging
  - _Requirements: 2.4, 4.2, 4.3, 5.3, 7.2_

- [ ]* 4.1 Write property test for message-driven state updates
  - **Property 5: Hydra messages update application state**
  - **Validates: Requirements 2.4, 4.3, 5.3, 7.2**

- [ ] 5. Implement commit funds functionality

  - Create commitFunds function that fetches UTxOs from connected wallet
  - Implement UTxO selection logic (select first available UTxO)
  - Build commit transaction using hydraInstance.commitFunds(txHash, outputIndex)
  - Request wallet signature with partialSign flag set to true
  - Submit signed transaction to Layer 1 via wallet.submitTx()
  - Display transaction hash on successful submission
  - Handle empty UTxO case with error message
  - Handle signing rejection with error message
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [ ]* 5.1 Write property test for commit operation sequence
  - **Property 6: Commit operation follows correct sequence**



  - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

- [ ]* 5.2 Write property test for transaction hash display
  - **Property 7: Successful operations display transaction hash**
  - **Validates: Requirements 3.6**

- [ ]* 5.3 Write unit test for empty UTxO edge case
  - Test that commit operation displays error when no UTxOs available
  - _Requirements: 3.7_

- [ ] 6. Implement UI state management for head states

  - Add logic to enable/disable operation buttons based on headState
  - Initialize button should be enabled when headState is 'idle' and wallet is connected
  - Commit button should be enabled when headState is 'initialized' or 'initializing'


  - Close button should be enabled when headState is 'open'
  - Fanout button should be enabled when headState is 'closed'
  - Disable all buttons when loading is true
  - _Requirements: 1.3, 4.4, 4.5, 5.4, 7.5_

- [ ]* 6.1 Write property test for state-based button enabling
  - **Property 2: Wallet state controls operation availability**
  - **Validates: Requirements 1.3, 4.4, 4.5, 7.5**

- [ ]* 6.2 Write property test for closed head enables fanout
  - **Property 10: Closed head enables fanout**
  - **Validates: Requirements 5.4**




- [ ] 7. Implement close head functionality

  - Create closeHead function that calls hydraProvider.close()
  - Update UI status to show "Closing head..." during operation
  - Set loading state to true during close operation
  - Handle close confirmation message from Hydra node
  - Update headState to 'closed' when confirmation received
  - Add error handling with user-friendly error messages
  - _Requirements: 5.1, 5.2, 5.3, 5.5_

- [ ]* 7.1 Write property test for close button action
  - **Property 9: Close button triggers close request**
  - **Validates: Requirements 5.1**

- [x] 8. Implement fanout functionality



  - Create fanoutHead function that sends fanout request to Hydra node
  - Update UI status to show "Fanning out..." during operation
  - Set loading state to true during fanout operation
  - Handle fanout completion message from Hydra node
  - Display success message when fanout completes
  - Reset headState to 'idle' after successful fanout
  - Add error handling with user-friendly error messages
  - _Requirements: 6.1, 6.2, 6.4, 6.5_

- [ ]* 8.1 Write property test for fanout button action
  - **Property 11: Fanout button triggers fanout request**
  - **Validates: Requirements 6.1**

- [ ]* 8.2 Write property test for operation completion feedback
  - **Property 12: Operation completion shows success message**
  - **Validates: Requirements 6.4, 7.3**





- [ ] 9. Implement comprehensive error handling

  - Wrap all async operations in try-catch blocks
  - Log all errors to console with descriptive context
  - Display user-friendly error messages in UI status
  - Reset loading state on all errors to allow retry
  - Maintain current headState on errors (don't reset unless necessary)
  - Add specific error messages for network errors mentioning connectivity
  - Ensure no operation can crash the application
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ]* 9.1 Write property test for error handling
  - **Property 15: Errors are caught and handled gracefully**
  - **Validates: Requirements 9.1, 9.2, 9.3, 9.4**




- [ ]* 9.2 Write unit test for network error messages
  - Test that network errors display connectivity guidance
  - _Requirements: 9.5_

- [ ] 10. Update UI components and styling

  - Create separate button components for each operation (Initialize, Commit, Close, Fanout)
  - Add descriptive text explaining each operation
  - Implement color-coded status display (blue=info, green=success, red=error, yellow=loading)
  - Add loading spinner component for operations in progress



  - Display current head state prominently


  - Show wallet connection status and address
  - Add tooltips or help text for each operation
  - Ensure responsive design for mobile devices
  - _Requirements: 1.1, 1.2, 7.1, 7.3, 7.4_

- [ ]* 10.1 Write unit test for wallet connection display
  - Test that connected wallet displays address
  - _Requirements: 1.2_

- [ ]* 10.2 Write unit test for wallet connection failure
  - Test that failed connection shows error and maintains disconnected state




  - _Requirements: 1.4_

- [ ] 11. Add configuration and environment setup

  - Move Blockfrost API key to environment variable NEXT_PUBLIC_BLOCKFROST_API_KEY
  - Create constant for Hydra node URL (http://139.59.24.68:4001)
  - Add configuration validation on component mount
  - Display configuration errors if API key is missing


  - _Requirements: 8.1, 8.4_

- [ ]* 11.1 Write unit test for configuration validation
  - Test that HydraProvider is configured with correct URL
  - Test that BlockfrostProvider is configured with preprod network
  - _Requirements: 8.1, 8.4_





- [ ] 12. Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Add logging and debugging utilities

  - Implement structured logging for all Hydra operations
  - Log operation start, progress, and completion
  - Log all Hydra node messages with timestamps
  - Add debug mode toggle for verbose logging



  - Create utility function for formatting error messages
  - _Requirements: 9.2_

- [ ]* 13.1 Write unit test for error logging
  - Test that all caught errors are logged to console
  - _Requirements: 9.2_

- [ ] 14. Implement wallet connection improvements

  - Add wallet disconnection handling
  - Clear all state when wallet disconnects
  - Disable all operations when wallet disconnects
  - Show reconnection prompt if wallet disconnects during operation
  - _Requirements: 1.4, 1.5_

- [ ]* 14.1 Write property test for wallet connection state
  - **Property 1: Wallet connection displays address**
  - **Validates: Requirements 1.2**

- [ ] 15. Add operation status history

  - Create status history array to track all operations
  - Display recent operations in a collapsible panel
  - Show timestamps for each operation
  - Allow clearing history
  - Persist history to localStorage (optional)
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 16. Final testing and validation

  - Test complete lifecycle: Initialize → Commit → (Head Opens) → Close → Fanout
  - Test error recovery: Operation fails → Error displayed → Retry → Success
  - Test concurrent operation prevention: Operation in progress → Buttons disabled
  - Verify all error messages are user-friendly
  - Verify all success messages include relevant details
  - Test with different wallet types (Nami, Eternl, etc.)
  - _Requirements: All_

- [ ]* 16.1 Write integration test for full lifecycle
  - Test complete flow from initialization to fanout
  - _Requirements: All_

- [ ] 17. Final Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.
