import { getURLParameter } from '../js/global.js';

const main = document.getElementById('main')

function getLocal(){
    const isLocal = getURLParameter('local') === 'true' ? true : false;

    console.log(isLocal)
    return isLocal
}

function decidePlayerList(players){
    let maxImpostersReached = false
    players.forEach((player) => {
        Math.random()
    });
}