import { Hono } from 'hono'
import { cors } from 'hono/cors'
import words from './words.json'

const app = new Hono()
app.use("*", cors())

const 

app.get("/words", (c) => {
    return c.json(words)
})

export default app