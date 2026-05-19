import words1 from './words.json' assert { type: 'json' };
import words2 from './english_language.json' assert { type: 'json' };

let localWords = [...words1, ...words2];
let cachedDocs = null;
let lastFetchTime = 0;
const CACHE_TTL = 30 * 1000; // 30 seconds

async function getDocsWords() {
    const now = Date.now();
    
    // Return cached results if still valid
    if (cachedDocs && (now - lastFetchTime < CACHE_TTL)) {
        return cachedDocs;
    }

    try {
        // Get service account credentials from environment or config
        // You'll need to store these securely - consider using a config file in frontend/public/
        const response = await fetch('/config/google-config.json');
        if (!response.ok) {
            console.log("No Google Docs config found, skipping Google Docs fetch");
            return [];
        }

        const config = await response.json();
        const credentials = config.credentials;
        const docId = config.docId;

        if (!credentials || !docId) {
            console.log("Google Docs config incomplete");
            return [];
        }

        // Authenticate with Google API
        const authResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: credentials.client_id,
                client_secret: credentials.client_secret,
                refresh_token: credentials.refresh_token,
                grant_type: 'refresh_token'
            })
        });

        if (!authResponse.ok) {
            console.error("Failed to authenticate with Google");
            return [];
        }

        const authData = await authResponse.json();
        const accessToken = authData.access_token;

        // Fetch Google Doc
        const docsResponse = await fetch(`https://www.googleapis.com/docs/v1/documents/${docId}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!docsResponse.ok) {
            console.error("Failed to fetch Google Doc");
            return [];
        }

        const docData = await docsResponse.json();
        const tabsResult = [];

        // Process tabs if they exist
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

        if (docData.tabs) {
            processTabs(docData.tabs);
        } else if (docData.body) {
            const words = extractWordsFromContent(docData.body.content || []);
            tabsResult.push({ tabId: "main", title: "Main Document", words });
        }

        // Format tabs into word categories
        const formattedTabs = tabsResult.map(tab => ({
            "id": `docs_${tab.tabId}`,
            "display_name": tab.title.toUpperCase(),
            "difficulty_imposter": '???',
            "words": tab.words
        }));

        const allWordsList = tabsResult.flatMap(tab => tab.words);
        const uniqueAllWords = [...new Set(allWordsList)];

        const globalCategory = {
            "id": "docs_all_global",
            "display_name": "ALL DOCS WORDS",
            "difficulty_imposter": '∞',
            "words": uniqueAllWords
        };

        const finalDocsData = [globalCategory, ...formattedTabs];

        cachedDocs = finalDocsData;
        lastFetchTime = now;

        return finalDocsData;

    } catch (error) {
        console.error("Failed to fetch Google Docs:", error);
        return [];
    }
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

async function getWords() {
    const docsWords = await getDocsWords();
    return [...localWords, ...docsWords];
}

export default getWords;
