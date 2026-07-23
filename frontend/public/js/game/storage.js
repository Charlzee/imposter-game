export function getStorageJson(key, fallback = []) {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
}

export function setStorageJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

export function removeStorageKey(key) {
    localStorage.removeItem(key);
}
