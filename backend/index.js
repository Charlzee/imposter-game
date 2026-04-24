import { Hono } from 'hono'
import { cors } from 'hono/cors'
import words from './words.json'

const app = new Hono()
app.use("*", cors())

const docsWords = {
    "id": "docs",
    "display_name": "DOCS WORDS,
    "difficulty_imposter": '???',
    "words":["test"]
}

const words = words.append(docsWords)

app.get("/words", (c) => {
    return c.json(words)
})

export default app