# Implementation Plan: スマホ完結型の注文・会計・呼び出しシステム

**Branch**: `001-` | **Date**: 2025-09-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-/spec.md`

## Summary
この機能は、来場者が自身のスマートフォンで注文から受け取り通知までを完結させるシステムを構築するものです。技術アプローチとして、フロントエンドはNext.js (TypeScript)、バックエンドはHono (TypeScript)を採用します。データストアにはセルフホストのPostgreSQLを使用し、ORMとしてPrismaを採用します。データモデルは、`Order` -> `OrderItemGroup` -> `OrderItem` -> `Merchandise` という階層構造をとり、柔軟な注文とステータス管理を実現します。

## Technical Context
**Language/Version**: TypeScript
**Primary Dependencies**: Next.js (Frontend), Hono (Backend)
**Storage**: PostgreSQL (self-hosted)
**ORM**: Prisma
**Testing**: Vitest, Playwright
**Target Platform**: Modern web browsers on smartphones (PWA)
**Project Type**: Web Application (Frontend + Backend)
**Performance Goals**: Initial page load < 2s (4G), API responses < 200ms p95
**Constraints**: Offline-capable for status viewing, 8+ hours battery life with mobile battery
**Scale/Scope**: Peak of 100 concurrent users

## Constitution Check
- [X] **Principle 1: Library-First**: The design separates concerns into a distinct frontend (Next.js) and backend (Hono), with the backend being a collection of API services.
- [X] **Principle 2: CLI Interface**: The Hono backend can easily expose a CLI for administrative tasks or local development.
- [X] **Principle 3: Test-First**: The plan specifies Vitest and Playwright for creating tests before or alongside implementation.
- [X] **Principle 4: Integration Testing**: The `quickstart.md` defines the primary integration test scenario, which will be automated with Playwright.
- [ ] **Principle 5: Simplicity**: The choice of a self-hosted PostgreSQL database adds operational complexity. This is a justified deviation to gain the power and control of a full-fledged relational database, as requested by the user.

## Project Structure

### Documentation (this feature)
```
specs/001-/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── merchandise.yaml
│   └── orders.yaml
└── tasks.md             # To be created by /tasks command
```

### Source Code (repository root)
```
# Frontend Application
frontend/
├── app/
├── components/
├── lib/
└── tests/

# Backend Services
backend/
├── src/
│   ├── index.ts
│   ├── models/
│   └── services/
└── tests/
```

**Structure Decision**: A monorepo with a `frontend` directory for the Next.js application and a `backend` directory for the Hono API services.

## Phase 0: Outline & Research
**Output**: [research.md](./research.md) with all technical decisions recorded.

## Phase 1: Design & Contracts
**Output**: [data-model.md](./data-model.md), [/contracts/](./contracts/), [quickstart.md](./quickstart.md)

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do.*

**Task Generation Strategy**:
- Generate tasks from the final design documents. Each API endpoint will have a contract test task. Each entity will have a database migration and model creation task. The `quickstart.md` will inform the E2E tests.

**Ordering Strategy**:
- TDD order: Tests before implementation. Backend before frontend.

**Estimated Output**: 40-50 tasks in `tasks.md`.

## Complexity Tracking
| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Simplicity | The project requires the robustness and control of a relational database. | SQLite was considered, but PostgreSQL was chosen for its scalability and rich feature set. |


## Progress Tracking
**Phase Status**:
- [X] Phase 0: Research complete
- [X] Phase 1: Design complete
- [X] Phase 2: Task planning complete (approach described)

**Gate Status**:
- [X] Initial Constitution Check: PASS
- [X] Post-Design Constitution Check: PASS
- [X] All `NEEDS CLARIFICATION` resolved
- [X] Complexity deviations documented

---
*Based on Constitution v1.0.0 - See `/.specify/memory/constitution.md`*
