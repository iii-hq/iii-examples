import express from 'express'
import { Bridge } from '@iii-dev/sdk'
import { autoRegister } from '../lib/auto-register'
import type { User, GetByIdInput } from '../lib/types'

const app = express()
app.use(express.json())

const users: User[] = []

app.get('/users', (_, res) => res.json(users))
app.get('/users/:id', (req, res) => {
  const user = users.find(u => u.id === req.params.id)
  user ? res.json(user) : res.status(404).json({ error: 'Not found' })
})
app.post('/users', (req, res) => {
  users.push(req.body)
  res.status(201).json(req.body)
})

app.listen(3001, () => {
  console.log('[Express] Users API on :3001')

  const bridge = new Bridge('ws://127.0.0.1:49134')

  autoRegister({
    bridge,
    prefix: 'users',
    handlers: {
      list: { handler: async () => users, method: 'GET' },
      get: { handler: async (input: GetByIdInput) => users.find(u => u.id === input.id) || null, method: 'GET' },
      create: { handler: async (input: User) => { users.push(input); return input }, method: 'POST' },
    }
  })
})
