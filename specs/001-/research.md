# Phase 0: Research & Technical Decisions

This document records the decisions made collaboratively to define the project's technical architecture.

## 1. Language/Version
- **Decision**: TypeScript.
- **Rationale**: Chosen for its type safety, which is crucial for maintainability and aligns with the `Test-First` principle by catching errors early. It allows for a consistent language across both the frontend and backend.

## 2. Primary Dependencies
- **Frontend**: Next.js (without API routes).
- **Backend**: Hono.
- **Rationale**: This is a modern, high-performance stack. Next.js is a powerful React framework for the frontend. Hono is a lightweight, exceptionally fast web framework for the backend, suitable for various environments including serverless platforms. This separation aligns with the `Library-First` principle, creating a clear boundary between frontend and backend concerns.

## 3. Storage
- **Decision**: PostgreSQL (self-hosted).
- **Rationale**: The user opted for a self-hosted PostgreSQL instance. This provides maximum control and leverages a powerful, battle-tested relational database capable of handling complex queries and ensuring data integrity. While this adds operational overhead compared to a managed service, it meets the project's need for a robust, self-managed data store.

## 4. Testing
- **Decision**: Vitest for unit/integration tests and Playwright for end-to-end tests.
- **Rationale**: This is a modern, high-performance testing stack. Vitest offers a fast and efficient testing experience compatible with the TypeScript/Node.js ecosystem. Playwright provides reliable, browser-level automation for testing the application from a true user perspective, which is ideal for validating the scenarios in `quickstart.md`.

## 5. Target Platform, Performance, and Scale
- **Decision**:
  - **Platform**: Modern web browsers on smartphones (PWA).
  - **Performance**: Initial page load < 2s (4G), API responses < 200ms p95.
  - **Scale**: Handle a peak of 100 concurrent users.
- **Rationale**: These requirements were defined and confirmed in the feature specification and clarification session, providing concrete, testable goals.
