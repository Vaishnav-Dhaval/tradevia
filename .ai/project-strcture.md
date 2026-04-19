Listed directory tradevia
Viewed turbo.json:1-26
Viewed package.json:1-34
Listed directory apps
Listed directory packages
Listed directory typescript-config
Listed directory ui

This repository is a high-performance **Turborepo** monorepo managed with **Bun**. It follows a modular architecture where core business logic and configurations are decoupled into shared packages and consumed by multiple specialized services.

### 🏗️ Repository Structure

The project is organized into two main directories: `apps/` for deployable services and `packages/` for shared logic and tools.

#### **1. Applications (`apps/`)**
These are the top-level services that make up the TradeVia platform:
- `api-service`: The primary REST/GraphQL API for client interactions.
- `engine-service`: Handles the core trading engine logic and processing.
- `price-poller-service`: An isolated service for fetching and streaming real-time market data.
- `web`: The frontend application (built with Next.js).

#### **2. Shared Packages (`packages/`)**
These packages provide a single source of truth for the entire codebase:
- `prisma`: Centralized database schema and shared Prisma Client.
- `redis`: Common Redis clients and pub/sub utilities for inter-service communication.
- `types`: Shared TypeScript interfaces ensuring type safety between the frontend and backend.
- `ui`: A shared UI component library (using React/Next.js) for frontend consistency.
- `config`: Project-wide configuration management.

---

### 🔥 Tools Pattern
The repository uses a **"Config-as-a-Package"** pattern to maintain consistency across all services:

| Tool | Shared Package | Description |
| :--- | :--- | :--- |
| **TypeScript** | `typescript-config` | Exports base configurations (`base.json`, `nextjs.json`) that apps extend to ensure consistent compiler rules. |
| **Linting** | `eslint-config` | Centralizes ESLint rules for Node.js, React, and Next.js, preventing "lint drift" between apps. |
| **Orchestration** | `turbo.json` | Defines the build pipeline, task dependencies (e.g., `build` depends on `^build`), and caching strategies. |
| **Package Management** | `bun.lock` | Uses Bun for ultra-fast installs and script execution across the workspace. |

### 🚀 Key Workflows
- **Parallel Execution**: `turbo dev` starts all services simultaneously with optimized logs.
- **Caching**: Turbo caches the output of tasks like `build` and `lint`. If a package hasn't changed, Turbo restores it from the cache instantly.
- **Type Safety**: The `types` package allows the `api-service` and `web` app to share identical data structures, catching breaking changes at compile time.