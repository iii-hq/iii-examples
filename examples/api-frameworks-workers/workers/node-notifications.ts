import http from 'http'
import { Bridge } from '@iii-dev/sdk'

const bridge = new Bridge(process.env.III_BRIDGE_URL ?? 'ws://localhost:49134')

type Notification = { id: string; userId: string; type: string; message: string; sentAt: number }
const notifications = new Map<string, Notification>()

const sendNotification = async ({ userId, type, message }: { userId: string; type: string; message: string }) => {
  const notification: Notification = {
    id: crypto.randomUUID(),
    userId,
    type,
    message,
    sentAt: Date.now()
  }
  notifications.set(notification.id, notification)
  console.log(`[Notification] ${type} to ${userId}: ${message}`)
  return notification
}

const listNotifications = async ({ userId }: { userId: string }) => {
  return [...notifications.values()].filter(n => n.userId === userId)
}

const getNotification = async ({ id }: { id: string }) => notifications.get(id) ?? null

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json')

  const url = new URL(req.url ?? '/', `http://${req.headers.host}`)

  if (req.method === 'GET' && url.pathname === '/notifications') {
    const userId = url.searchParams.get('userId')
    if (!userId) {
      res.statusCode = 400
      res.end(JSON.stringify({ error: 'userId query param required' }))
      return
    }
    const result = await listNotifications({ userId })
    res.end(JSON.stringify(result))
    return
  }

  if (req.method === 'GET' && url.pathname.startsWith('/notifications/')) {
    const id = url.pathname.split('/')[2]
    const notification = await getNotification({ id })
    if (!notification) {
      res.statusCode = 404
      res.end(JSON.stringify({ error: 'Not found' }))
      return
    }
    res.end(JSON.stringify(notification))
    return
  }

  if (req.method === 'POST' && url.pathname === '/notifications') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', async () => {
      const data = JSON.parse(body)
      const notification = await sendNotification(data)
      res.statusCode = 201
      res.end(JSON.stringify(notification))
    })
    return
  }

  res.statusCode = 404
  res.end(JSON.stringify({ error: 'Not found' }))
})

const PORT = 3005
server.listen(PORT, () => {
  bridge.registerFunction({ function_path: 'notifications.send' }, sendNotification)
  bridge.registerFunction({ function_path: 'notifications.list' }, listNotifications)
  bridge.registerFunction({ function_path: 'notifications.get' }, getNotification)

  console.log(`[Node] Notifications worker running on http://localhost:${PORT}`)
  console.log(`[Node] Registered: notifications.send, notifications.list, notifications.get`)
})
