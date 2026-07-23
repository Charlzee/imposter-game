import { google } from 'googleapis';
import words1 from '../words.json' with { type: 'json' };
import words2 from '../english_language.json' with { type: 'json' };

// Local fallback word sources used when the remote Google Doc is unavailable.
const localWords = [...words1, ...words2];
let cachedWords = null;
let lastFetchTime = 0;
const CACHE_TTL = 30 * 1000;

// Pull topic and word data from a Google Doc.
async function getDocsWords(docId, auth) {
    const docs = google.docs({ version: 'v1', auth });
    const res = await docs.documents.get({
        documentId: docId,
        includeTabsContent: true
    });

    let tabsResult = [];

    const processTabs = (tabs) => {
        if (!tabs) return;

        tabs.forEach((tab) => {
            const props = tab.tabProperties || {};
            const actualTabId = props.tabId || 'unknown-id';
            const actualTitle = props.title || 'Untitled Tab';

            console.log(`Successfully identified -> ID: ${actualTabId}, Title: ${actualTitle}`);

            if (tab.documentTab && tab.documentTab.body) {
                const words = extractWordsFromContent(tab.documentTab.body.content || []);
                tabsResult.push({
                    tabId: actualTabId,
                    title: actualTitle,
                    words
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
        tabsResult.push({ tabId: 'main', title: 'Main Document', words });
    }

    function extractWordsFromContent(content) {
        let text = '';
        content.forEach((value) => {
            if (value.paragraph) {
                value.paragraph.elements.forEach((el) => {
                    if (el.textRun) text += el.textRun.content;
                });
            }
        });
        return text.split('\n').map((word) => word.trim()).filter((word) => word.length > 0);
    }

    return tabsResult;
}

// Expose the word-topic API endpoint.
export function registerWordRoutes(app) {
    app.get('/words', async (c) => {
        const now = Date.now();

        if (cachedWords && (now - lastFetchTime < CACHE_TTL)) {
            return c.json(cachedWords);
        }

        try {
            const credentials = JSON.parse(c.env.SERVICE_ACCOUNT);
            const docId = c.env.DOCS_ID;

            const auth = new google.auth.GoogleAuth({
                credentials,
                scopes: ['https://www.googleapis.com/auth/documents.readonly']
            });

            const tabsData = await getDocsWords(docId, auth);

            const formattedTabs = tabsData.map((tab) => ({
                id: `docs_${tab.tabId}`,
                display_name: tab.title.toUpperCase(),
                difficulty_imposter: '???',
                words: tab.words
            }));

            cachedWords = formattedTabs;
            lastFetchTime = now;
            return c.json(formattedTabs);
        } catch (err) {
            console.error('Fetch Error:', err.message);
            return c.json([]);
        }
    });
}
