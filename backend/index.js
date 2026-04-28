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
const CACHE_TTL = 30 * 1000; // 30 seconds

const docsWords = {
    "id": "docs",
    "display_name": "DOCS WORDS",
    "difficulty_imposter": '???',
    "words":[]
}

async function getDocsWords(docId, auth) {
    const docs = google.docs({ version: 'v1', auth });
    const res = await docs.documents.get({ 
        documentId: docId, 
        includeTabsContent: true 
    });
    
    let tabsResult = [];

    if (res.data.tabs) { // With Tabs
        res.data.tabs.forEach(tab => {
            if (tab.documentTab && tab.documentTab.body) {
                const words = extractWordsFromContent(tab.documentTab.body.content);
                tabsResult.push({
                    tabId: tab.tabId,
                    title: tab.documentTab.title || "Untitled Tab",
                    words: words
                });
            }
        });
    }
    else if (res.data.body && res.data.body.content) { // No Tabs
        const words = extractWordsFromContent(res.data.body.content);
        tabsResult.push({
            tabId: "main",
            title: "Main Document",
            words: words
        });
    }

    function extractWordsFromContent(content) {
        let text = "";
        content.forEach(value => {
            if (value.paragraph) {
                value.paragraph.elements.forEach(el => {
                    if (el.textRun) text += el.textRun.content;
                });
            }
        });

        return text.split('\n')
            .map(word => word.trim())
            .filter(word => word.length > 0);
    }

    return tabsResult;
}

app.get("/words", async (c) => {
    const now = Date.now();

    if (cachedWords && (now - lastFetchTime < CACHE_TTL)) {
        return c.json([...localWords, ...cachedWords]);
    }

    try {
        const credentials = JSON.parse(c.env.SERVICE_ACCOUNT);
        const docId = c.env.DOCS_ID;

        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/documents.readonly'],
        });

        const tabsData = await getDocsWords(docId, auth);

        const formattedTabs = tabsData.map(tab => ({
            "id": `docs_${tab.tabId}`,
            "display_name": tab.title.toUpperCase(),
            "difficulty_imposter": '???',
            "words": tab.words
        }));

        cachedWords = formattedTabs;
        lastFetchTime = now;

        return c.json([...localWords, ...formattedTabs]);
    } catch (err) {
        console.error("Fetch Error:", err.message);
        if (cachedWords) return c.json([...localWords, ...cachedWords]);
        return c.json(localWords);
    }
});

export default app