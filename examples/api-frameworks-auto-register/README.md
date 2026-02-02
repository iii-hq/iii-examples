# API Frameworks Auto-Register

Run **4 legacy API frameworks** with **auto-registration**, **API triggers**, and **shared workflow context**.

> Legacy APIs stay simple. Auto-register adds functions AND triggers. Workflow adds orchestration.

## What's Different?

| Feature | api-frameworks-workers | api-frameworks-auto-register |
|---------|------------------------|------------------------------|
| Function registration | Manual, one by one | Auto-register helper |
| API triggers | None (workflow only) | All handlers exposed as REST |
| Logging | None | Shared context logger |
| Request tracking | None | Request ID across all calls |
| State sharing | None | Workflow state map |

## Project Structure

```
api-frameworks-auto-register/
├── lib/
│   ├── auto-register.ts   # Auto-register all handlers
│   └── context.ts         # Shared context (logger, state, requestId)
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

## Console Output (with context logging)

```
[req-1234-abc123] INFO: Starting order workflow { input: { userId: 'alice', ... } }
[req-1234-abc123] INFO: Calling users.get { input: { id: 'alice' } }
[req-1234-abc123] INFO: users.get returned { result: { id: 'alice', ... }, elapsed: 5 }
[req-1234-abc123] INFO: Calling products.get { input: { id: 'laptop' } }
[req-1234-abc123] INFO: products.get returned { result: { id: 'laptop', ... }, elapsed: 12 }
[req-1234-abc123] INFO: Calling inventory.get { input: { productId: 'laptop' } }
[req-1234-abc123] INFO: inventory.get returned { result: { quantity: 50 }, elapsed: 18 }
[req-1234-abc123] INFO: Calling orders.create { input: { ... } }
[req-1234-abc123] INFO: orders.create returned { result: { id: 'order-...', ... }, elapsed: 25 }
[req-1234-abc123] INFO: Calling inventory.decrement { input: { productId: 'laptop', quantity: 2 } }
[req-1234-abc123] INFO: inventory.decrement returned { result: { quantity: 48 }, elapsed: 30 }
[req-1234-abc123] INFO: Order workflow complete { orderId: 'order-...', totalTime: 32 }
```

## Response

```json
{
  "message": "Order created successfully",
  "requestId": "req-1234-abc123",
  "processingTime": "32ms",
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

### Shared Context

```typescript
// Create context for request
const ctx = createContext()

// All calls share the same request ID and logger
ctx.logger.info('Starting workflow')        // [req-abc123] INFO: Starting workflow
await invoke(ctx, 'users.get', { id })      // Logs with same request ID
await invoke(ctx, 'orders.create', data)    // Logs with same request ID

// Access results from shared state
const user = ctx.state.get('users.get')
const order = ctx.state.get('orders.create')
```

## Why This Pattern?

- **Legacy workers stay simple** - no changes to existing code
- **Workflow owns orchestration** - context, logging, error handling
- **Request tracing** - single ID tracks request across all services
- **Shared state** - access any result without passing through chain
