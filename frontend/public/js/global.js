export function getURLParameter(sParam) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(sParam);
}

export function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

export function toTitleCase(str) {
    return str.replace(
        /\w\S*/g,
        text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
    );
}