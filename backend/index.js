import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { google } from 'googleapis'
import path from 'path'
import words from './words.json'

const credentials = JSON.parse(process.)

const app = new Hono()
app.use("*", cors())

const docsWords = {
    "id": "docs",
    "display_name": "DOCS WORDS",
    "difficulty_imposter": '???',
    "words":["test"]
}


const app = new Hono()

// Configure Google Auth
const auth = new google.auth.GoogleAuth({
    keyFile: credentials,
    scopes: ['https://www.googleapis.com/auth/documents.readonly'],
})

app.get('/get-doc/:docId', async (c) => {
    const docId = c.req.param('docId')
    const docs = google.docs({ version: 'v1', auth })

    try {
        const res = await docs.documents.get({ documentId: docId })
    
        const content = res.data.body.content || []
        let text = ""
    
        content.forEach(value => {
            if (value.paragraph) {
                value.paragraph.elements.forEach(el => {
                    if (el.textRun) {
                       text += el.textRun.content
                    }
                })
            }
        })

        return c.json({
            title: res.data.title,
            content: text
        })
    } catch (err) {
        return c.json({ error: 'Failed to fetch document', details: err.message }, 500)
    }
})

const words = words.push(docsWords)

app.get("/words", (c) => {
    return c.json(words)
})

export default app