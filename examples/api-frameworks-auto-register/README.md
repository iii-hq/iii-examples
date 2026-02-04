# API Frameworks Auto-Register

Run **4 legacy API frameworks** with **auto-registration**, **API triggers**, and **shared workflow context**.

> Legacy APIs stay simple. Auto-register adds functions AND triggers. Workflow adds orchestration.

## What's Different?

| Feature | api-frameworks-workers | api-frameworks-auto-register |
|---------|------------------------|------------------------------|
| Function registration | Manual, one by one | Auto-register helper |
| API triggers | None (workflow only) | All handlers exposed as REST |
| Logging | None | SDK logger (OTEL) |
| Request tracking | None | OTEL trace ID across all calls |

## Project Structure

```
api-frameworks-auto-register/
├── lib/
│   ├── auto-register.ts   # Auto-register all handlers
├── workers/
│   ├── express-users.ts   # Legacy Express - Users
│   ├── fastify-orders.ts  # Legacy Fastify - Orders
│   ├── hono-products.ts   # Legacy Hono - Products
│   └── koa-inventory.ts   # Legacy Koa - Inventory
├── workflow/
│   └── index.ts           # Orchestration with shared context
└── package.json
```

## Prerequisites

Install III Engine:

```bash
curl -fsSL https://raw.githubusercontent.com/MotiaDev/iii-engine/main/install.sh | sh
```

## Quick Start

```bash
# Install dependencies
npm install

# Start III Engine (in a separate terminal)
iii

# Start all workers + workflow
npm run dev
```

## Test

All handlers are exposed as REST triggers on III Engine (:3111):

```bash
# Create via III Engine triggers (port 3111)
curl -X POST http://localhost:3111/users/create -H "Content-Type: application/json" \
  -d '{"id": "alice", "name": "Alice", "email": "alice@example.com"}'

curl -X POST http://localhost:3111/products/create -H "Content-Type: application/json" \
  -d '{"id": "laptop", "name": "MacBook", "price": 2499}'

curl -X PUT http://localhost:3111/inventory/set -H "Content-Type: application/json" \
  -d '{"productId": "laptop", "quantity": 50}'

# List users via trigger
curl http://localhost:3111/users/list

# Test orchestration workflow
curl -X POST http://localhost:3111/order -H "Content-Type: application/json" \
  -d '{"userId": "alice", "productId": "laptop", "quantity": 2}'
```

Legacy endpoints also work directly:
```bash
curl http://localhost:3001/users          # Express
curl http://localhost:3002/orders         # Fastify
curl http://localhost:3003/products       # Hono
curl http://localhost:3004/inventory/laptop  # Koa
```

## Console Output (with SDK logger)

Logs are emitted via iii's built-in OTEL logger, which automatically includes trace IDs and service names:

```
INFO: Starting order workflow { userId: 'alice', productId: 'laptop', quantity: 2 }
INFO: Calling users.get { input: { id: 'alice' } }
INFO: users.get returned { result: { id: 'alice', ... } }
INFO: Calling products.get { input: { id: 'laptop' } }
INFO: products.get returned { result: { id: 'laptop', ... } }
INFO: Calling inventory.get { input: { productId: 'laptop' } }
INFO: inventory.get returned { result: { quantity: 50 } }
INFO: Calling orders.create { input: { ... } }
INFO: orders.create returned { result: { id: 'order-...', ... } }
INFO: Calling inventory.decrement { input: { productId: 'laptop', quantity: 2 } }
INFO: inventory.decrement returned { result: { quantity: 48 } }
INFO: Order workflow complete { orderId: 'order-...' }
```

## Response

```json
{
  "message": "Order created successfully",
  "traceId": "abc123...",
  "order": { "id": "order-...", "userId": "alice", "productId": "laptop", "quantity": 2 },
  "user": { "id": "alice", "name": "Alice", "email": "alice@example.com" },
  "product": { "id": "laptop", "name": "MacBook", "price": 2499 },
  "inventory": { "productId": "laptop", "quantity": 48 }
}
```

## Key Concepts

### Registered Triggers

| Endpoint | Method | Function |
|----------|--------|----------|
| `/users/list` | GET | `users.list` |
| `/users/get` | GET | `users.get` |
| `/users/create` | POST | `users.create` |
| `/products/list` | GET | `products.list` |
| `/products/get` | GET | `products.get` |
| `/products/create` | POST | `products.create` |
| `/orders/list` | GET | `orders.list` |
| `/orders/get` | GET | `orders.get` |
| `/orders/create` | POST | `orders.create` |
| `/inventory/get` | GET | `inventory.get` |
| `/inventory/set` | PUT | `inventory.set` |
| `/inventory/decrement` | POST | `inventory.decrement` |
| `/order` | POST | `workflow.createOrder` |

### Auto-Registration

```typescript
// Before: Manual registration (no triggers)
bridge.registerFunction({ function_path: 'users.list' }, async () => users)
bridge.registerFunction({ function_path: 'users.get' }, async (input) => ...)

// After: Auto-register with triggers
autoRegister({
  bridge,
  prefix: 'users',
  handlers: {
    list: { handler: async () => users, method: 'GET' },
    get: { handler: async (input) => users.find(u => u.id === input.id), method: 'GET' },
    create: { handler: async (input) => { users.push(input); return input }, method: 'POST' },
  }
})
// Registers functions AND triggers: GET /users/list, GET /users/get, POST /users/create
```

### SDK Context & Logger

```typescript
import { getContext, currentTraceId } from '@iii-dev/sdk'

// Get the SDK context (includes OTEL-backed logger)
const ctx = getContext()
const traceId = currentTraceId()

// Logger automatically includes trace IDs and service name via OTEL
ctx.logger.info('Starting workflow')
await invoke(ctx, 'users.get', { id })
await invoke(ctx, 'orders.create', data)
```

## Why This Pattern?

- **Legacy workers stay simple** - no changes to existing code
- **Workflow owns orchestration** - context, logging, error handling
- **Request tracing** - OTEL trace ID tracks request across all services
- **No custom infrastructure** - uses SDK's built-in logger and context
