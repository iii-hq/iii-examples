# API Frameworks Workers

Run **4 API frameworks** as **separate workers**, each in its own file, orchestrated by iii Engine.

> Think of this like a company with legacy APIs. Each framework is a separate service. Now with iii Engine, you can orchestrate them all together!

## Architecture

![Architecture](diagrams/architecture.svg)

## Workflow: Create Order

The workflow orchestrates across **all 4 workers**:

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

# Start ALL workers + workflow with ONE command
npm run dev
```

Output:

```
[express]  [Express] Users worker on :3001
[fastify]  [Fastify] Orders worker on :3002
[hono]     [Hono] Products worker on :3003
[koa]      [Koa] Inventory worker on :3004
[workflow] POST /order - Orchestrates all 4 frameworks
```

## Test

```bash
# Create test data via individual workers
curl -X POST http://localhost:3001/users -H "Content-Type: application/json" \
  -d '{"id": "alice", "name": "Alice", "email": "alice@example.com"}'

curl -X POST http://localhost:3003/products -H "Content-Type: application/json" \
  -d '{"id": "laptop", "name": "MacBook", "price": 2499}'

curl -X PUT http://localhost:3004/inventory/laptop -H "Content-Type: application/json" \
  -d '{"quantity": 50}'

# Test orchestration (via III Engine)
curl -X POST http://localhost:3111/order -H "Content-Type: application/json" \
  -d '{"userId": "alice", "productId": "laptop", "quantity": 2}'
```

## Response

```json
{
  "order": { "id": "order-...", "userId": "alice", "productId": "laptop", "quantity": 2 },
  "user": { "id": "alice", "name": "Alice", "email": "alice@example.com" },
  "product": { "id": "laptop", "name": "MacBook", "price": 2499 }
}
```

## Project Structure

```
api-frameworks-workers/
├── workers/
│   ├── express-users.ts      # Express worker - Users domain
│   ├── fastify-orders.ts     # Fastify worker - Orders domain
│   ├── hono-products.ts      # Hono worker - Products domain
│   └── koa-inventory.ts      # Koa worker - Inventory domain
├── workflow/
│   └── index.ts              # Orchestration layer
├── diagrams/
│   ├── architecture.svg
│   └── workflow.svg
├── package.json
└── README.md
```

## Workers Summary

| Worker | Framework | Port | Domain | Functions |
|--------|-----------|------|--------|-----------|
| express-users | Express | 3001 | Users | `users.list`, `users.get`, `users.create` |
| fastify-orders | Fastify | 3002 | Orders | `orders.list`, `orders.get`, `orders.create` |
| hono-products | Hono | 3003 | Products | `products.list`, `products.get`, `products.create` |
| koa-inventory | Koa | 3004 | Inventory | `inventory.get`, `inventory.set` |

## Key Concepts

- **Separate files**: Each framework in its own file in `workers/`
- **One-line init**: Register handlers on `app.listen` / `onReady` / `serve`
- **Workflows separate**: Orchestration logic in `workflow/` directory
- **One command**: `npm run dev` starts everything
- **Legacy perspective**: Think of each as a legacy service being modernized
