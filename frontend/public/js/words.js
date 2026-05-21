import words1 from './words_local.json' with { type: 'json' };
import words2 from './english_language.json' with { type: 'json' };

let localWords = [...words1, ...words2];

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

    return localWords;
}

export default getWords;