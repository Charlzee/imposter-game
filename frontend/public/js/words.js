import words1 from './words_local.json' with { type: 'json' };
import words2 from './english_language.json' with { type: 'json' };

let localWords = [...words1, ...words2];

async function fetchBackendWords() {
    try {
        const response = await fetch('https://imposter-gm.com/api/words');
        if (!response.ok) {
            throw new Error(`Backend returned status ${response.status}`);
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
            throw new Error('Backend returned invalid word list');
        }

        return data;
    } catch (error) {
        console.warn('Backend words fetch failed:', error);
        return null;
    }
}

async function getWords() {
    const backendWords = await fetchBackendWords();
    if (backendWords) {
        return backendWords;
    }

    return localWords;
}

export default getWords;
