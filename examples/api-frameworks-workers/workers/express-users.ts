/**
 * Express Worker - Users Domain
 * 
 * This worker manages users and registers all routes
 * with III Engine on initialization (app.listen callback).
 */

import express from 'express'
import { Bridge } from '@iii-dev/sdk'

const bridge = new Bridge(process.env.III_BRIDGE_URL ?? 'ws://localhost:49134')

// In-memory store (would be database in real app)
type User = { id: string; name: string; email: string }
const users = new Map<string, User>()

// Route handlers (these become III functions)
const listUsers = async () => [...users.values()]
const getUser = async ({ id }: { id: string }) => users.get(id) ?? null
const createUser = async (data: User) => {
  users.set(data.id, data)
  return data
}

// Express app
const app = express()
app.use(express.json())

app.get('/users', async (_, res) => res.json(await listUsers()))
app.get('/users/:id', async (req, res) => {
  const user = await getUser({ id: req.params.id })
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json(user)
})
app.post('/users', async (req, res) => res.status(201).json(await createUser(req.body)))

// Start server and register with III Engine
const PORT = 3001
app.listen(PORT, () => {
  // Register all handlers as III functions
  bridge.registerFunction({ function_path: 'users.list', description: 'List all users' }, listUsers)
  bridge.registerFunction({ function_path: 'users.get', description: 'Get user by ID' }, getUser)
  bridge.registerFunction({ function_path: 'users.create', description: 'Create a user' }, createUser)

  console.log(`[Express] Users worker running on http://localhost:${PORT}`)
  console.log(`[Express] Registered: users.list, users.get, users.create`)
})
