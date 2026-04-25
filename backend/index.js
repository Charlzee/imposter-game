import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { google } from 'googleapis'
import path from 'path'
import localWords from './words.json'

const credentials = JSON.parse(process.env.SERVICE_ACCOUNT)

const app = new Hono()
app.use("*", cors())

const docsWords = {
    "id": "docs",
    "display_name": "DOCS WORDS",
    "difficulty_imposter": '???',
    "words":[]
}

// Configure Google Auth
const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/documents.readonly'],
})

async function getDocsWords(docId) {
    const docs = google.docs({ version: 'v1', auth })
    const res = await docs.documents.get({ documentId: docId })
    
    const content = res.data.body.content || []
    let text = ""
    
    content.forEach(value => {
        if (value.paragraph) {
            value.paragraph.elements.forEach(el => {
                if (el.textRun) text += el.textRun.content
            })
        }
    })

    return text.split('\n')
        .map(word => word.trim())
        .filter(word => word.length > 0)
}

app.get("/words", async (c) => {
    try {
        const docsWords = await getDocsWords(process.env.DOCS_ID)

        const docsWordsCategory = {
            "id": "docs",
            "display_name": "DOCS WORDS",
            "difficulty_imposter": '???',
            "words": docsWords
        }

        return c.json([...localWords, docsWordsCategory])
    } catch (err) {
        console.error(err)
        return c.json(localWords)
    }
})

console.log("Server running on http://localhost:3000")
serve({
    fetch: app.fetch,
    port: 3000
})