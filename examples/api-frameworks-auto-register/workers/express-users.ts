// Legacy Express Users API
// Simple CRUD - no knowledge of III orchestration

import express from 'express'
import { Bridge } from '@iii-dev/sdk'
import { autoRegister } from '../lib/auto-register'
import type { User, GetByIdInput } from '../lib/types'

const app = express()
app.use(express.json())

// In-memory store (legacy style)
const users: User[] = []

// Legacy REST endpoints (still work standalone)
app.get('/users', (_, res) => res.json(users))
app.get('/users/:id', (req, res) => {
  const user = users.find(u => u.id === req.params.id)
  user ? res.json(user) : res.status(404).json({ error: 'Not found' })
})
app.post('/users', (req, res) => {
  users.push(req.body)
  res.status(201).json(req.body)
})

// Start server and register with III
app.listen(3001, () => {
  console.log('[Express] Users API on :3001')

  const bridge = new Bridge('ws://127.0.0.1:49134')

  autoRegister({
    bridge,
    prefix: 'users',
    handlers: {
      list: async () => users,
      get: async (input: GetByIdInput) => users.find(u => u.id === input.id) || null,
      create: async (input: User) => { users.push(input); return input },
    }
  })
})
