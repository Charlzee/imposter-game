export function getURLParameter(sParam) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(sParam);
}

export function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

export function getRandomPlayerIndex(players) {
    if (!players || players.length === 0) return -1;
    return getRandomInt(players.length);
}

export function getRandomPlayer(players) {
    if (!players || players.length === 0) return null;
    return players[getRandomInt(players.length)];
}

export function toTitleCase(str) {
    return str.replace(
        /\w\S*/g,
        text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
    );
}

export function getRandomLetterOrNumber() {
    const characters ='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return characters.charAt(Math.floor(Math.random() * characters.length));
}

export function getRandomLetter() {
    const characters ='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return characters.charAt(Math.floor(Math.random() * characters.length));
}