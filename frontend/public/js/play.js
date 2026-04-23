import { getURLParameter } from '../js/global.js';

const main = document.getElementById('main')

function getLocal(){
    const isLocal = getURLParameter('local') === 'true' ? true : false;

    console.log(isLocal)
    return isLocal
}

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

function decidePlayerList(players){
    let maxImpostersReached = false
    console.log(getRandomInt(players.length))
}