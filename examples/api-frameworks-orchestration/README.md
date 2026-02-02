# API Frameworks Orchestration

Run **4 API frameworks** (Express, Fastify, Hono, Koa) in a **single file**, orchestrated by iii Engine.

## Architecture

![Architecture](diagrams/architecture.svg)

## Workflow: Create Order

A single API call to iii Engine orchestrates **all 4 frameworks**:

![Workflow](diagrams/workflow.svg)

## Prerequisites

Install iii Engine:

```bash
curl -fsSL https://raw.githubusercontent.com/MotiaDev/iii-engine/main/install.sh | sh
```

Verify installation:

```bash
iii --version
```

## Quick Start

```bash
# Install dependencies
npm install

# Start III Engine (in a separate terminal)
iii

# Run the example
npm run dev
```

## Test

```bash
# Create test data
curl -X POST http://localhost:3001/users -H "Content-Type: application/json" \
  -d '{"id": "alice", "name": "Alice", "email": "alice@example.com"}'

curl -X POST http://localhost:3003/products -H "Content-Type: application/json" \
  -d '{"id": "laptop", "name": "MacBook", "price": 2499}'

curl -X PUT http://localhost:3004/inventory/laptop -H "Content-Type: application/json" \
  -d '{"quantity": 50}'

# Test orchestration (via III Engine)
curl -X POST http://localhost:3111/order/create -H "Content-Type: application/json" \
  -d '{"userId": "alice", "productId": "laptop", "quantity": 2}'
```

## Response

```json
{
  "message": "Order created successfully via cross-framework orchestration",
  "order": { "id": "order-...", "userId": "alice", "productId": "laptop", "quantity": 2 },
  "user": { "id": "alice", "name": "Alice", "email": "alice@example.com" },
  "product": { "id": "laptop", "name": "MacBook", "price": 2499 },
  "inventory": { "productId": "laptop", "quantity": 48 }
}
```

## Project Structure

```
api-frameworks-orchestration/
├── src/
│   └── index.ts      # All 4 frameworks + workflow (~250 lines)
├── diagrams/
│   ├── architecture.svg
│   └── workflow.svg
├── package.json
├── tsconfig.json
└── README.md
```

## Registered Functions

| Framework | Port | Functions |
|-----------|------|-----------|
| Express | 3001 | `users.list`, `users.get`, `users.create` |
| Fastify | 3002 | `orders.list`, `orders.get`, `orders.create` |
| Hono | 3003 | `products.list`, `products.get`, `products.create` |
| Koa | 3004 | `inventory.get`, `inventory.update` |

## Key Concepts

- **Single file**: All frameworks in one `index.ts`
- **Single process**: Everything runs together
- **Multi-trigger**: Each function registered with III Engine
- **Cross-framework orchestration**: `bridge.invokeFunction()` routes calls
