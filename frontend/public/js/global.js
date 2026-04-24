export function getURLParameter(sParam) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(sParam);
}

export function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}