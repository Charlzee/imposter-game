// Import local word JSON files
import words1 from './words_local.json' with { type: 'json' };
import words2 from './english_language.json' with { type: 'json' };

let localWords = [...words1, ...words2];

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
            const stringifiedData = JSON.stringify(data);
            localStorage.setItem('cached_backend_words', stringifiedData);
            console.log(`Successfully saved backend words to local storage. Cached ${data.length} topics.`);
        } catch (e) {
            console.warn(`Failed to save backend words to local storage: ${e.name}`);
            if (e.name === 'QuotaExceededError') {
                console.error('Local storage quota exceeded. Cannot save words.');
            } else {
                console.error('Unknown error saving to local storage:', e.message);
            }
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
                return backendWords;
            }
        } catch (error) {
            if (error.isTimeout) {
                window.lastFetchTimedOut = true;
            }
        }
    }


    // Load words from offline cache
    try {
        console.log("Checking local cache...");
        const cached = localStorage.getItem('cached_backend_words');
        if (cached) {
            const parsedData = JSON.parse(cached);
            if (Array.isArray(parsedData) && parsedData.length > 0) {
                window.wordsLoadedFromCache = true;
                console.log('Successfully loaded words from local storage cache.');
                return parsedData;
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