# iii Examples

Official examples for the [iii engine](https://github.com/iii-hq/iii).

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)

## Prerequisites

Install the iii engine:

```bash
curl -fsSL https://install.iii.dev/iii/main/install.sh | sh
```

Verify:
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
git clone https://github.com/iii-hq/iii-examples.git
cd iii-examples

cd examples/api-frameworks-orchestration
npm install

# Start the iii engine in a separate terminal
iii

# Run the example
npm run dev
```

## How It Works

1. **Workers** connect to the iii engine via WebSocket
2. **Functions** are registered with the engine
3. **Triggers** (HTTP, cron, queue, stream) invoke functions

## SDK Quick Reference

| SDK | Init | Connect |
|-----|------|---------|
| Node.js | `const iii = init('ws://localhost:49134')` | Auto on `init()` |
| Python | `iii = III('ws://localhost:49134')` | `await iii.connect()` required |
| Rust | `let iii = III::new("ws://127.0.0.1:49134")` | `iii.connect().await?` required |

## Resources

- [iii Engine](https://github.com/iii-hq/iii)
- [iii SDKs](https://github.com/iii-hq/sdk)
- [iii Console](https://github.com/iii-hq/console)
- [Documentation](https://iii.dev/docs)

## License

Apache 2.0
