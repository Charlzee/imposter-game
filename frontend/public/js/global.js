export function getURLParameter(sParam) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(sParam);
}