import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { registerAuthRoutes } from './routes/auth.js'
import { registerRoomRoutes } from './routes/rooms.js'
import { registerWordRoutes } from './routes/words.js'

// Main API entry point for the game backend.
const app = new Hono().basePath('/api')
app.use('*', cors())

app.onError((err, c) => {
    const status = err.status || 500
    if (status === 401) {
        return c.json({ error: 'Unauthorized: Please log in again.' }, 401)
    }
    return c.json({ error: err.message || 'Internal Server Error' }, status)
})

registerAuthRoutes(app)
registerRoomRoutes(app)
registerWordRoutes(app)

app.notFound((c) => {
    return c.json({
        error: 'Route not found',
        path: c.req.path,
        method: c.req.method
    }, 404)
})

export default app
