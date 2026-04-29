import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { sign } from 'hono/jwt'
import { google } from 'googleapis'
import bcrypt from 'bcryptjs'
import path from 'path'
import localWords from './words.json'

const credentials = JSON.parse(process.env.SERVICE_ACCOUNT)

const app = new Hono().basePath("/api")
app.use("*", cors())

let cachedWords = null;
let lastFetchTime = 0;
const CACHE_TTL = 30 * 1000; // 30 seconds

async function getDocsWords(docId, auth) {
    const docs = google.docs({ version: 'v1', auth });
    const res = await docs.documents.get({ 
        documentId: docId, 
        includeTabsContent: true 
    });
    
    let tabsResult = [];

    const processTabs = (tabs) => {
        if (!tabs) return;

        tabs.forEach(tab => {
            const props = tab.tabProperties || {};
            const actualTabId = props.tabId || "unknown-id";
            const actualTitle = props.title || "Untitled Tab";
>>>>>>> 4f5b87b7e8c46e7c3f294211f14b4e42956d5131

            console.log(`Successfully identified -> ID: ${actualTabId}, Title: ${actualTitle}`);

            if (tab.documentTab && tab.documentTab.body) {
                const words = extractWordsFromContent(tab.documentTab.body.content || []);
                tabsResult.push({
                    tabId: actualTabId, 
                    title: actualTitle,
                    words: words
                });
            }

            if (tab.childTabs) {
                processTabs(tab.childTabs);
            }
        });
    };

    if (res.data.tabs) {
        processTabs(res.data.tabs);
    } else if (res.data.body) {
        const words = extractWordsFromContent(res.data.body.content || []);
        tabsResult.push({ tabId: "main", title: "Main Document", words });
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
        return text.split('\n').map(w => w.trim()).filter(w => w.length > 0);
    }

    console.log(tabsResult)

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


// Accounts
app.post('/register', async (c) => {
  try {
    const { username, password } = await c.req.json();

    if (!username || !password) {
      return c.json({ error: "Username and password required" }, 400);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await c.env.D1.prepare(
      "INSERT INTO users (username, password_hash) VALUES (?, ?)"
    ).bind(username, hashedPassword).run();

    return c.json({ message: "User registered!" }, 201);

  } catch (err) {
    if (err.message.includes("UNIQUE constraint failed")) {
      return c.json({ error: "Username already taken" }, 409);
    }
    return c.json({ error: "Database error", details: err.message }, 500);
  }
});

app.post('/login', async (c) => {
    const { username, password } = await c.req.json();

    const user = await c.env.D1.prepare(
    "SELECT * FROM users WHERE username = ?"
    ).bind(username).first();

    if (!user) {
        return c.json({ error: "Invalid username or password" }, 401);
    }

    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
        return c.json({ error: "Invalid username or password" }, 401);
    }

    const payload = {
        username: user.username,
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 1 day expiry
    };

    const token = await sign(payload, c.env.JWT_SECRET);

    return c.json({
        message: "Login successful!",
        token: token
    });
});

export default app