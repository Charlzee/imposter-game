import getWords from '../words.js';
import { toTitleCase } from '../global.js';

export async function fetchGameData(state) {
    const fallbackTopic = { id: 'local_default', words: ['Error Loading Words'] };

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        let data = null;
        try {
            data = await getWords(controller.signal);
            clearTimeout(timeoutId);
        } catch (error) {
            clearTimeout(timeoutId);
            console.warn('Backend word sync failed or timed out. Swapping to local topics.');
            data = await getWords();
        }

        const selectedTopicId = localStorage.getItem('selected_topic');
        if (Array.isArray(data) && data.length > 0) {
            state.selectedTopic = data.find((topic) => topic.id === selectedTopicId) || data[0];
            state.words = state.selectedTopic.words;

            if (state.selectedTopic) {
                const themeName = state.selectedTopic.name || toTitleCase(state.selectedTopic.id.replace('_', ' '));
                localStorage.setItem('selected_theme', themeName);
            }
        } else {
            state.words = fallbackTopic.words;
        }
    } catch (error) {
        console.error('Critical failure during topic parsing initialization:', error);
        state.words = fallbackTopic.words;
    }
}

export function createSelectedWord(stateOrWords) {
    const source = Array.isArray(stateOrWords) ? { words: stateOrWords } : (stateOrWords || {});
    const wordList = source.words || [];
    const fallbackWord = typeof wordList[0] === 'string' ? wordList[0] : 'Error Loading Words';
    const word = wordList.length > 0 ? wordList[Math.floor(Math.random() * wordList.length)] : fallbackWord;
    localStorage.setItem('selected_word', btoa(encodeURIComponent(word)));
    return word;
}
