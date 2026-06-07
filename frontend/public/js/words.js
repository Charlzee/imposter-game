// Import local word JSON files
import words1 from './words_local.json' with { type: 'json' };
import words2 from './english_language.json' with { type: 'json' };

let localWords = [...words1, ...words2];

// Fetch word list from backend API
async function fetchBackendWords(signal) {
    try {
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
            localStorage.setItem('cached_backend_words', JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to save backend words to local storage:', e);
        }
        return data;
    } catch (error) {
        if (error.name === 'AbortError') {
            const timeoutError = new Error('Server connection timed out');
            timeoutError.isTimeout = true;
            throw timeoutError;
        }

        console.warn('Backend words fetch failed, using local words:', error);
        return null;
    }
}

// Primary entry point for word retrieval
async function getWords(signal, forceLocal=false) {
    if (forceLocal){
        return localWords;
    }

    try {
        const backendWords = await fetchBackendWords(signal);
        if (backendWords) {
            return backendWords;
        }
    } catch (error) {
        if (error.isTimeout) {
            window.lastFetchTimedOut = true;
        }
    }

    // Load words from offline cache
    try {
        const cached = localStorage.getItem('cached_backend_words');
        if (cached) {
            const parsedData = JSON.parse(cached);
            if (Array.isArray(parsedData) && parsedData.length > 0) {
                window.wordsLoadedFromCache = true;
                return parsedData;
            }
        }
    } catch (e) {
        console.warn('Failed to retrieve or parse cached words:', e);
    }

    // Ultimate fallback to local files
    return localWords;
}

export default getWords;