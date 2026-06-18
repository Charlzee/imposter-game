// Import local word JSON files
import words1 from './words_local.json' with { type: 'json' };
import words2 from './english_language.json' with { type: 'json' };

let localWords = [...words1, ...words2];

// --- IndexedDB Helpers for Large Data Caching ---
const DB_NAME = 'ImposterGameDB';
const STORE_NAME = 'word_cache';

const getDB = () => new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
});

async function setCache(data) {
    const db = await getDB();
    if (!db) return;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(data, 'backend_words');
}

async function getCache() {
    const db = await getDB();
    if (!db) return null;
    return new Promise((resolve) => {
        const req = db.transaction(STORE_NAME).objectStore(STORE_NAME).get('backend_words');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
    });
}

// Helper to generate the "ALL DOCS" category from fetched tabs
// This prevents storing redundant data in localStorage
function processBackendData(data) {
    if (!data || data.length === 0) return data;
    
    const allWords = [...new Set(data.flatMap(topic => topic.words))];
    const globalCategory = {
        "id": "docs_all_global",
        "display_name": "ALL DOCS WORDS",
        "difficulty_imposter": '∞',
        "words": allWords
    };
    
    return [globalCategory, ...data];
}

// Fetch word list from backend API
async function fetchBackendWords(signal) {
    try {
        console.log("Attempting network fetch...");
        const response = await fetch('https://imposter-gm.com/api/words', { signal });
        if (!response.ok) {
            throw new Error(`Backend returned status ${response.status}`);
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
            throw new Error('Backend returned invalid word list');
        }

        // Cache successful response to localStorage
        try {
            await setCache(data);
            console.log(`Successfully cached ${data.length} topics to IndexedDB.`);
        } catch (e) {
            console.warn(`Failed to cache words: ${e.message}`);
        }
        return data;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.warn("Network timed out.");
            const timeoutError = new Error('Server connection timed out');
            timeoutError.isTimeout = true;
            throw timeoutError;
        }
        
        window.lastFetchFailed = true;
        console.warn('Backend words fetch failed:', error);
        return null;
    }
}

// === DEBUG ===
const DEBUG_FORCE_LOCAL = false;
const DEBUG_FORCE_CACHED = false;

// Primary entry point for word retrieval
async function getWords(signal, forceLocal=false, forceCached=false) {
    console.log(`getWords called (forceLocal: ${forceLocal}, forceCached: ${forceCached})`);
    if (forceLocal || DEBUG_FORCE_LOCAL){
        console.log("DEBUG_FORCE_LOCAL is true, returning local words.");
        return localWords;
    }

    // Reset flags for the current attempt
    window.lastFetchTimedOut = false;
    window.wordsLoadedFromCache = false;
    window.lastFetchFailed = false;

    if (!forceCached && !DEBUG_FORCE_CACHED) {
        try {
            const backendWords = await fetchBackendWords(signal);
            if (backendWords && Array.isArray(backendWords) && backendWords.length > 0) {
                return [...localWords, ...processBackendData(backendWords)];
            }
        } catch (error) {
            if (error.isTimeout) {
                window.lastFetchTimedOut = true;
            }
        }
    }


    // Load words from offline cache
    try {
        console.log("Checking IndexedDB cache...");
        const cachedData = await getCache();
        if (cachedData) {
            if (Array.isArray(cachedData) && cachedData.length > 0) {
                window.wordsLoadedFromCache = true;
                console.log('Successfully loaded words from IndexedDB cache.');
                return [...localWords, ...processBackendData(cachedData)];
            } else {
                console.warn('Cached data is not a valid array or is empty. Falling back.');
            }
        } else {
            console.log('No cached words found in local storage.');
        }
    } catch (e) {
        console.warn('Failed to retrieve or parse cached words:', e);
        console.error('Error details:', e.message);
    }

    // Ultimate fallback to local files
    console.log("Falling back to local built-in words.");
    return localWords;
}

export default getWords;