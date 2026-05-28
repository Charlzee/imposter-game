import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { sign, jwt } from 'hono/jwt'
import { google } from 'googleapis'
import bcrypt from 'bcryptjs'
import words1 from './words.json' with { type: 'json' }
import words2 from './english_language.json' with { type: 'json' }

let localWords = [...words1, ...words2]

const app = new Hono().basePath("/api")
app.use("*", cors())

app.onError((err, c) => {
    const status = err.status || 500;
    if (status === 401) {
        return c.json({ error: "Unauthorized: Please log in again." }, 401);
    }
    return c.json({ error: err.message || "Internal Server Error" }, status);
});

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

        const allWordsList = tabsData.flatMap(tab => tab.words);
        
        const uniqueAllWords = [...new Set(allWordsList)];

        const globalCategory = {
            "id": "docs_all_global",
            "display_name": "ALL DOCS WORDS",
            "difficulty_imposter": '∞',
            "words": uniqueAllWords
        };

        const finalDocsData = [globalCategory, ...formattedTabs];

        cachedWords = finalDocsData;
        lastFetchTime = now;

        return c.json([...localWords, ...finalDocsData]);
    } catch (err) {
        console.error("Fetch Error:", err.message);
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

    const token = await sign(payload, c.env.JWT_SECRET, "HS256");

    return c.json({
        message: "Login successful!",
        token: token
    });
});

app.use('/auth/*', (c, next) => {
    return jwt({
        secret: c.env.JWT_SECRET,
        alg: 'HS256'
    })(c, next)
})

app.get('/auth/me', (c) => {
    const payload = c.get('jwtPayload')
    return c.json({ message: "Token is valid!", user: payload.username })
})

app.post('/auth/rooms/create', async (c) => {
    const payload = c.get('jwtPayload');
    const { code, settings } = await c.req.json();

    try {
        // Delete rooms that haven't had activity for over an hour
        await c.env.D1.prepare("DELETE FROM rooms WHERE last_activity < datetime('now', '-1 hour')").run();

        await c.env.D1.batch([
            c.env.D1.prepare("INSERT INTO rooms (code, host_username, settings) VALUES (?, ?, ?)")
                .bind(code, payload.username, JSON.stringify(settings)),
            c.env.D1.prepare("INSERT INTO room_players (room_code, username) VALUES (?, ?)")
                .bind(code, payload.username)
        ]);

        return c.json({ success: true });
    } catch (err) {
        if (err.message && err.message.includes("UNIQUE constraint failed")) {
            return c.json({ 
                error: "The generated code is already in use.", 
                details: "A collision occurred with an existing room code. Retrying..." 
            }, 409);
        }
        return c.json({ error: "Failed to create room due to a server error.", details: err.message }, 500);
    }
});

app.post('/auth/rooms/join', async (c) => {
    const payload = c.get('jwtPayload');
    const { code } = await c.req.json();

    const room = await c.env.D1.prepare("SELECT * FROM rooms WHERE code = ?").bind(code).first();
    if (!room) return c.json({ error: "Room not found" }, 404);

    try {
        await c.env.D1.prepare(
            "INSERT OR IGNORE INTO room_players (room_code, username) VALUES (?, ?)"
        ).bind(code, payload.username).run();
        
        return c.json({ success: true, host: room.host_username });
    } catch (err) {
        return c.json({ error: "Failed to join room" }, 500);
    }
});

app.get('/auth/rooms/:code/players', async (c) => {
    const code = c.req.param('code');
    const payload = c.get('jwtPayload');

    await c.env.D1.prepare(`
        INSERT INTO room_players (room_code, username, last_seen) 
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(room_code, username) DO UPDATE SET last_seen = CURRENT_TIMESTAMP
    `).bind(code, payload.username).run();

    await c.env.D1.prepare("UPDATE rooms SET last_activity = CURRENT_TIMESTAMP WHERE code = ?")
        .bind(code).run();

    await c.env.D1.prepare("DELETE FROM room_players WHERE room_code = ? AND last_seen < datetime('now', '-10 seconds')")
        .bind(code).run();

    const players = await c.env.D1.prepare(
        "SELECT username FROM room_players WHERE room_code = ?"
    ).bind(code).all();
    
    return c.json(players.results);
});

app.patch('/auth/rooms/:code/settings', async (c) => {
    const code = c.req.param('code');
    const payload = c.get('jwtPayload');
    const { settings } = await c.req.json();

    const room = await c.env.D1.prepare("SELECT host_username, settings FROM rooms WHERE code = ?")
        .bind(code).first();

    if (!room) return c.json({ error: "Room not found" }, 404);
    if (room.host_username !== payload.username) return c.json({ error: "Only the host can modify settings" }, 403);

    const currentSettings = JSON.parse(room.settings || '{}');
    const updatedSettings = { ...currentSettings, ...settings };

    await c.env.D1.prepare("UPDATE rooms SET settings = ? WHERE code = ?")
        .bind(JSON.stringify(updatedSettings), code)
        .run();

    return c.json({ success: true, settings: updatedSettings });
});

app.post('/auth/rooms/:code/start', async (c) => {
    const code = c.req.param('code');
    const payload = c.get('jwtPayload');
    const gameSettings = await c.req.json(); // contains word, roles, modifiers

    const room = await c.env.D1.prepare("SELECT host_username FROM rooms WHERE code = ?").bind(code).first();
    if (room.host_username !== payload.username) return c.json({ error: "Only the host can start" }, 403);

    await c.env.D1.prepare(
        "UPDATE rooms SET status = 'playing', settings = ? WHERE code = ?"
    ).bind(JSON.stringify(gameSettings), code).run();

    return c.json({ success: true });
});

app.get('/auth/rooms/:code/status', async (c) => {
    const code = c.req.param('code');
    const room = await c.env.D1.prepare("SELECT status, settings FROM rooms WHERE code = ?").bind(code).first();
    if (!room) return c.json({ error: "Room not found" }, 404);
    
    const settings = JSON.parse(room.settings || '{}'); 
    return c.json({ status: room.status, ...settings });
});

app.post('/auth/rooms/:code/chat', async (c) => {
    const code = c.req.param('code');
    const payload = c.get('jwtPayload');
    const { message } = await c.req.json();

    if (!message || message.trim() === '') {
        return c.json({ error: "Message cannot be empty" }, 400);
    }

    try {
        await c.env.D1.prepare(
            "INSERT INTO room_chats (room_code, username, message) VALUES (?, ?, ?)"
        ).bind(code, payload.username, message.trim()).run();
        return c.json({ success: true });
    } catch (err) {
        return c.json({ error: "Failed to send message", details: err.message }, 500);
    }
});

app.get('/auth/rooms/:code/chat', async (c) => {
    const code = c.req.param('code');
    const lastId = c.req.query('last_id') || 0;

    const messages = await c.env.D1.prepare(
        "SELECT id, username, message, timestamp FROM room_chats WHERE room_code = ? AND id > ? ORDER BY timestamp ASC"
    ).bind(code, lastId).all();
    return c.json(messages.results);
});

app.post('/auth/update-stats', async (c) => {
    const payload = c.get('jwtPayload');
    const username = payload.username;

    const body = await c.req.json().catch(() => ({}));
    const local_plays = body.local_plays || 0;
    const xp = body.xp || 0;

    try {
        // Fetch data
        const user = await c.env.D1.prepare("SELECT game_data FROM users WHERE username = ?")
            .bind(username)
            .first();

        if (!user) {
            console.error(`User ${username} not found in DB`);
            return c.json({ error: "User not found" }, 404);
        }

        // Parse existing JSON
        let currentData = {};
        try {
            currentData = JSON.parse(user.game_data || '{}');
            if (Array.isArray(currentData)) {
                currentData = {}; // Convert legacy array default to object
            }
        } catch (parseError) {
            console.error("JSON Parse Error, resetting data:", parseError);
            currentData = {};
        }

        // Update values
        currentData.local_plays = (currentData.local_plays || 0) + local_plays;
        currentData.xp = (currentData.xp || 0) + xp;

        // Save to D1
        const info = await c.env.D1.prepare("UPDATE users SET game_data = ? WHERE username = ?")
            .bind(JSON.stringify(currentData), username)
            .run();

        console.log(`Update Result for ${username}:`, info.meta.changes, "rows changed.");

        return c.json({ success: true, newData: currentData });
    } catch (e) {
        console.error("Internal Server Error:", e.message);
        return c.json({ error: "Failed to update stats", details: e.message }, 500);
    }
});

app.notFound((c) => {
    return c.json({ 
        error: "Route not found", 
        path: c.req.path, 
        method: c.req.method 
    }, 404);
});

export default app
