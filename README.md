# III Examples

Official examples for [iii Engine](https://github.com/MotiaDev/iii-engine) - a WebSocket-based process communication engine.

## Prerequisites

Install III Engine:

```bash
curl -fsSL https://raw.githubusercontent.com/MotiaDev/iii-engine/main/install.sh | sh
```

Verify installation:

```bash
iii --version
```

## Examples

| Example | Description |
|---------|-------------|
| [api-frameworks-orchestration](examples/api-frameworks-orchestration) | Run 4 API frameworks (Express, Fastify, Hono, Koa) in a single file |
| [api-frameworks-workers](examples/api-frameworks-workers) | Run 4 API frameworks as separate workers |
| [api-frameworks-auto-register](examples/api-frameworks-auto-register) | Auto-registration + shared context (logging, state, request tracking) |
| [iii-vs-traditional](examples/iii-vs-traditional) | Side-by-side: connect a Python service with iii (~120 lines) vs traditional gateway (~465 lines) |
| [polyglot-coordination](examples/polyglot-coordination) | Coordinate Python, Node.js, and Rust services (Python via stdin/stdout IPC, Rust via HTTP) |

## Quick Start

```bash
# Clone the repo
git clone https://github.com/MotiaDev/iii-examples.git
cd iii-examples

# Pick an example
cd examples/api-frameworks-orchestration

# Install dependencies
npm install

# Start III Engine (in a separate terminal)
iii

# Run the example
npm run dev
```

1. **Workers** connect to iii Engine via WebSocket
2. **Functions** are registered with the engine
3. **Triggers** (API, cron, events) invoke functions

## Resources

- [iii Engine Repository](https://github.com/MotiaDev/iii-engine)
- [iii SDK (npm)](https://www.npmjs.com/package/@iii-dev/sdk)

## License

Apache 2.0
