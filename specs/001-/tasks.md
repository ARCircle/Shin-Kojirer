# Tasks: スマホ完結型の注文・会計・呼び出しシステム

**Input**: Design documents from `/specs/001-/`

## Phase 3.1: Setup
- [ ] T001: Create monorepo structure with `frontend/` and `backend/` directories.
- [ ] T002: Initialize backend Node.js project in `backend/` with Hono, TypeScript, and Vitest.
- [ ] T003: Initialize frontend Next.js project in `frontend/`.
- [ ] T004: [P] Configure shared ESLint and Prettier settings in the root directory.
- [ ] T005: Create a `docker-compose.yml` in the root to set up a self-hosted PostgreSQL instance.

## Phase 3.2: Backend - Tests First (TDD)
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [ ] T006: [P] Write contract test for `POST /merchandise` in `backend/tests/contract/merchandise.test.ts`.
- [ ] T007: [P] Write contract test for `GET /merchandise` in `backend/tests/contract/merchandise.test.ts`.
- [ ] T008: [P] Write contract test for `POST /merchandise/{id}/prices` in `backend/tests/contract/merchandise.test.ts`.
- [ ] T009: [P] Write contract test for `POST /orders` in `backend/tests/contract/orders.test.ts`.
- [ ] T010: [P] Write contract test for `GET /orders/{id}` in `backend/tests/contract/orders.test.ts`.
- [ ] T011: [P] Write contract test for `POST /orders/{id}/pay` in `backend/tests/contract/orders.test.ts`.
- [ ] T012: [P] Write contract test for `POST /order-item-groups/{id}/prepare` in `backend/tests/contract/orders.test.ts`.
- [ ] T013: [P] Write contract test for `POST /order-item-groups/{id}/ready` in `backend/tests/contract/orders.test.ts`.

## Phase 3.3: Backend - Core Implementation
- [ ] T014: Implement database connection module in `backend/src/lib/db.ts`.
- [ ] T015: Create database migration script for all tables (`Merchandise`, `Price`, `Order`, `OrderItemGroup`, `OrderItem`) using a tool like `node-pg-migrate`.
- [ ] T016: Run the migration to create the database schema.
- [ ] T017: [P] Implement model types based on `data-model.md` in `backend/src/models/`.
- [ ] T018: Implement `Merchandise` service logic (create, list, set price) in `backend/src/services/merchandiseService.ts`.
- [ ] T019: Implement `Order` service logic (create, get, update status, apply business rules) in `backend/src/services/orderService.ts`.
- [ ] T020: Implement all `Merchandise` API endpoints in `backend/src/api/merchandise.ts`.
- [ ] T021: Implement all `Order` and `OrderItemGroup` API endpoints in `backend/src/api/orders.ts`.

## Phase 3.4: Frontend - Core Implementation
- [ ] T022: Setup an API client service in `frontend/lib/apiClient.ts` to communicate with the backend.
- [ ] T023: [P] Implement the main ordering page (`/`) to list merchandise and create an order.
- [ ] T024: [P] Implement the order status page (`/orders/[id]`) to display order and group statuses.
- [ ] T025: [P] Implement the kitchen display page (`/kitchen`) for internal staff to view and update group statuses.
- [ ] T026: [P] Implement the admin page (`/admin`) to manage merchandise and prices.

## Phase 3.5: End-to-End Testing
- [ ] T027: Write and pass a Playwright E2E test script in `frontend/tests/e2e/ordering.spec.ts` that follows the scenario in `quickstart.md`.

## Phase 3.6: Polish
- [ ] T028: [P] Add unit tests for complex business logic in the backend services (e.g., price calculation, status transition rules).
- [ ] T029: [P] Implement real-time updates on the frontend using WebSockets (e.g., Socket.IO) for order status changes.
- [ ] T030: [P] Review and enhance accessibility (WCAG 2.1 AA) across all frontend pages.
- [ ] T031: [P] Add comprehensive logging to the backend for easier debugging.

## Dependencies
- Backend tests (T006-T013) must be written before backend implementation (T014-T021).
- Database migration (T015-T016) must be done before service implementation (T018-T019).
- Backend API implementation (T020-T021) must be done before frontend implementation (T022-T026).
- Core implementation must be done before E2E testing (T027) and polish (T028-T031).

## Parallel Example
```
# The following contract tests can be developed in parallel:
Task: "T006: Write contract test for POST /merchandise"
Task: "T009: Write contract test for POST /orders"
Task: "T010: Write contract test for GET /orders/{id}"
```
