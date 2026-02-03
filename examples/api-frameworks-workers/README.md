# API Frameworks Workers

Run **5 API frameworks** as **separate workers**, each in its own file, orchestrated by iii Engine using an **event-driven saga pattern**.

> Think of this like a company with legacy APIs. Each framework is a separate service. Now with iii Engine, you can orchestrate them all together with async workflows!

## iii Features Demonstrated

| Feature | Usage |
|---------|-------|
| **State** | Track order lifecycle: `pending` → `validated` → `ready` → `completed` |
| **State Triggers** | Automatically fire when state changes (notifications on completed/rejected) |
| **Event Triggers** | Subscribe functions to `order.requested`, `order.validated`, `order.ready` |
| **Parallel Invocation** | Validate user + product simultaneously using `Promise.all` |
| **Conditional Triggers** | Use `condition_function_path` on state triggers (completed/rejected) |
| **Async Invocation** | `invokeFunctionAsync` for fire-and-forget notifications |
| **Context Logger** | `getContext().logger` for tracing through the saga |

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
[express]  [Express] Users worker running on http://localhost:3001
[fastify]  [Fastify] Orders worker running on http://localhost:3002
[hono]     [Hono] Products worker running on http://localhost:3003
[koa]      [Koa] Inventory worker running on http://localhost:3004
[node]     [Node] Notifications worker running on http://localhost:3005
[workflow] POST /order - Creates order and emits order.requested event
[workflow] GET /order/:orderId - Query order status from state
```

## Test

```bash
# 1. Create test data via individual workers
curl -X POST http://localhost:3001/users -H "Content-Type: application/json" \
  -d '{"id": "alice", "name": "Alice", "email": "alice@example.com"}'

curl -X POST http://localhost:3003/products -H "Content-Type: application/json" \
  -d '{"id": "laptop", "name": "MacBook", "price": 2499}'

curl -X PUT http://localhost:3004/inventory/laptop -H "Content-Type: application/json" \
  -d '{"quantity": 50}'

# 2. Create order (returns 202 Accepted immediately)
curl -X POST http://localhost:3111/order -H "Content-Type: application/json" \
  -d '{"userId": "alice", "productId": "laptop", "quantity": 2}'

# 3. Check order status
curl http://localhost:3111/order/{orderId}
```

## Response

Create order returns 202 Accepted:
```json
{
  "orderId": "abc-123",
  "status": "pending",
  "message": "Order is being processed"
}
```

Query order status shows saga progress:
```json
{
  "orderId": "abc-123",
  "userId": "alice",
  "productId": "laptop",
  "quantity": 2,
  "status": "completed",
  "user": { "id": "alice", "name": "Alice", "email": "alice@example.com" },
  "product": { "id": "laptop", "name": "MacBook", "price": 2499 },
  "availableStock": 48,
  "createdAt": 1706918400000,
  "updatedAt": 1706918401000
}
```

## Order Saga Flow

```
POST /order
    │
    ▼
┌─────────────────────────────────────────┐
│ 1. Create order state (status: pending) │
│ 2. Emit order.requested event           │
│ 3. Return 202 Accepted                  │
└─────────────────────────────────────────┘
    │
    ▼ (event: order.requested)
┌─────────────────────────────────────────┐
│ VALIDATE: Parallel user + product check │
│ → Success: emit order.validated         │
│ → Failure: emit order.rejected          │
└─────────────────────────────────────────┘
    │
    ▼ (event: order.validated)
┌─────────────────────────────────────────┐
│ INVENTORY: Check stock availability     │
│ → Success: emit order.ready             │
│ → Failure: emit order.rejected          │
└─────────────────────────────────────────┘
    │
    ▼ (event: order.ready)
┌─────────────────────────────────────────┐
│ COMPLETE: Create order + decrement stock│
│ → Update state (status: completed)      │
│ → Emit order.completed event            │
└─────────────────────────────────────────┘
    │
    ▼ (state trigger: status changed to completed)
┌─────────────────────────────────────────┐
│ NOTIFY: Send completion notification    │
│ → Automatic via state trigger           │
│ → Fire-and-forget to user               │
└─────────────────────────────────────────┘
```

## Project Structure

```
api-frameworks-workers/
├── workers/
│   ├── express-users.ts        # Express worker - Users domain
│   ├── fastify-orders.ts       # Fastify worker - Orders domain
│   ├── hono-products.ts        # Hono worker - Products domain
│   ├── koa-inventory.ts        # Koa worker - Inventory domain
│   └── node-notifications.ts   # Native Node.js - Notifications domain
├── workflow/
│   ├── index.ts                # API endpoints + order.requested emitter
│   ├── validate.ts             # order.requested → validates user/product
│   ├── inventory.ts            # order.validated → checks inventory
│   ├── complete.ts             # order.ready → creates order
│   ├── notifications.ts        # state trigger → sends notifications
│   └── types.ts                # Shared types
├── package.json
└── README.md
```

## Workers Summary

| Worker | Framework | Port | Functions |
|--------|-----------|------|-----------|
| express-users | Express | 3001 | `users.list`, `users.get`, `users.create` |
| fastify-orders | Fastify | 3002 | `orders.list`, `orders.get`, `orders.create`, `orders.updateStatus` |
| hono-products | Hono | 3003 | `products.list`, `products.get`, `products.create` |
| koa-inventory | Koa | 3004 | `inventory.get`, `inventory.set`, `inventory.decrement` |
| node-notifications | Native HTTP | 3005 | `notifications.send`, `notifications.list`, `notifications.get` |

## Key Concepts

- **Event-Driven Saga**: Order processing is broken into steps triggered by events
- **State Management**: Order state tracked through iii state module
- **State Triggers**: Automatically invoked when state changes (created/updated/deleted)
- **Parallel Validation**: User and product validated simultaneously
- **Conditional Triggers**: State triggers use `condition_function_path` for precise filtering (notifications)
- **Guard Clauses**: Event handlers use early returns for validation (inventory, complete)
- **Fire-and-Forget**: Notifications sent async without waiting for response
- **Legacy Integration**: Each worker simulates a legacy service being modernized
