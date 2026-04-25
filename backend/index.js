import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { google } from 'googleapis'
import path from 'path'
import localWords from './words.json'

const credentials = JSON.parse(process.env.SERVICE_ACCOUNT)

const app = new Hono()
app.use("*", cors())

let cachedWords = null;
let lastFetchTime = 0;
const CACHE_TTL = 5 * 1000; // 5 seconds

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
    const now = Date.now();

    if (cachedWords && (now - lastFetchTime < CACHE_TTL)) {
        return c.json([...localWords, cachedWords]);
    }

    try {
        const docsWords = await getDocsWords(process.env.DOCS_ID)

        cachedWords = {
            "id": "docs",
            "display_name": "DOCS WORDS",
            "difficulty_imposter": '???',
            "words": docsWords
        }

        return c.json([...localWords, cachedWords])
    } catch (err) {
        console.error(err)
        return c.json(localWords)
    }
})

export default app