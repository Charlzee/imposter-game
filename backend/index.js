import { Hono } from 'hono'
import { cors } from 'hono/cors'
import words from './words.json'

const app = new Hono()
app.use("*", cors())

app.get("/words", (c) => {
    return c.json(words)
})

app.get("/words/docs", (c) => {
    return c.json(null)
})

export default app