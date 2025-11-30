# Requirements Document

## Introduction

This feature addresses deployment issues on Vercel where the application needs to communicate with external HTTP services from an HTTPS context. The system currently makes direct client-side calls to HTTP endpoints which are blocked by browsers due to mixed content policies, and some operations timeout due to Vercel's serverless function limits.

## Glossary

- **Mixed Content**: When an HTTPS page attempts to load HTTP resources, blocked by browsers for security
- **Vercel Serverless Functions**: Next.js API routes that run as serverless functions with timeout limits
- **Hydra Node**: The external Hydra head service running at http://209.38.126.165:4001
- **Bob Service**: The external service for automated commits and token dispensing at http://209.38.126.165:8001
- **Client**: The browser-based React application
- **API Route**: Next.js server-side endpoint that handles requests

## Requirements

### Requirement 1

**User Story:** As a user accessing the application over HTTPS, I want to interact with Hydra operations, so that I can make payments and manage my Hydra head without mixed content errors.

#### Acceptance Criteria

1. WHEN the Client requests Hydra head status THEN the system SHALL proxy the request through a Next.js API route to avoid mixed content blocking
2. WHEN the Client fetches Hydra balance THEN the system SHALL use the API proxy to retrieve data from the HTTP Hydra Node
3. WHEN the application is deployed on Vercel THEN all external HTTP calls SHALL be routed through HTTPS API endpoints
4. WHEN a proxy request fails THEN the system SHALL return appropriate error messages to the Client
5. WHEN the Client makes multiple concurrent requests THEN the API proxy SHALL handle them without blocking

### Requirement 2

**User Story:** As a user committing funds to the Hydra head, I want Bob to automatically commit after my commit completes, so that the head can open without manual intervention.

#### Acceptance Criteria

1. WHEN a user successfully commits funds THEN the system SHALL trigger Bob's commit operation via API route
2. WHEN calling the Bob commit endpoint THEN the system SHALL not wait for the full response to avoid Vercel timeouts
3. WHEN Bob's commit is triggered THEN the system SHALL return immediately to the Client with a success status
4. WHEN Bob's commit fails THEN the system SHALL log the error but not block the user's commit success
5. WHEN the Bob commit API is unreachable THEN the system SHALL handle the error gracefully

### Requirement 3

**User Story:** As a user completing a payment, I want to receive my DISPENSE token automatically, so that I can use the vending machine without additional steps.

#### Acceptance Criteria

1. WHEN a Hydra payment succeeds THEN the system SHALL trigger token dispensing via API route
2. WHEN calling the token dispense endpoint THEN the system SHALL not wait for the full response to avoid Vercel timeouts
3. WHEN token dispensing is triggered THEN the system SHALL return immediately to the Client with a success status
4. WHEN token dispensing fails THEN the system SHALL log the error but not block the payment success
5. WHEN the token API is unreachable THEN the system SHALL handle the error gracefully

### Requirement 4

**User Story:** As a developer, I want API routes that handle long-running operations asynchronously, so that Vercel timeout limits don't cause failures.

#### Acceptance Criteria

1. WHEN an API route receives a long-running operation request THEN the system SHALL initiate the operation and return immediately
2. WHEN the operation takes longer than 10 seconds THEN the system SHALL not block the API response
3. WHEN using fire-and-forget pattern THEN the system SHALL log operation status for debugging
4. WHEN an async operation fails THEN the system SHALL log detailed error information
5. WHEN multiple async operations are triggered THEN the system SHALL handle them independently

### Requirement 5

**User Story:** As a user, I want clear feedback about operation status, so that I understand what's happening with my transactions.

#### Acceptance Criteria

1. WHEN an operation is initiated THEN the system SHALL display a loading state to the user
2. WHEN an operation completes successfully THEN the system SHALL show a success message
3. WHEN an operation fails THEN the system SHALL display a user-friendly error message
4. WHEN a background operation is triggered THEN the system SHALL inform the user it's processing
5. WHEN multiple operations are in progress THEN the system SHALL show appropriate status for each
