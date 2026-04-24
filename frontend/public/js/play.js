import { getURLParameter, getRandomInt } from '../js/global.js';

const response = await fetch("https://imposter-game-backend.charlzee.workers.dev/words");
const data = await response.json();

const main = document.getElementById('main')
const roleDisplay = document.getElementById('role-display');

const selectedTopicId = localStorage.getItem('selected_topic');
const selectedTopic = data.find(topic => topic.id === selectedTopicId);

const words = selectedTopic.words;
const selectedWord = words[getRandomInt(words.length)];

let imposter = null;
let imposterIndex = null;

function getLocal(){
    const isLocal = getURLParameter('local') === 'true' ? true : false;

    console.log(isLocal)
    return isLocal
}

function decidePlayerList(players){
    let maxImpostersReached = false;

    imposterIndex = getRandomInt(JSON.parse(players).length);

    imposter = JSON.parse(players)[imposterIndex].player_name;
    localStorage.setItem('imposter', imposter);

    console.log(imposter);
}

function displayRole(playerIndex){
    const roleTitle = document.getElementById('role-title');
    const roleStatus = document.getElementById('role-status');
    const roleTip = document.getElementById('role-tip');

    roleTitle.textContent = `Player ${playerIndex} role:`;

    const player = JSON.parse(localStorage.getItem('current_players'))[playerIndex - 1].player_name;
    
    console.log(player);
    console.log(imposter);

    if (player == imposter) {
        roleStatus.textContent = 'Imposter';
        roleStatus.classList.add('imposter');
        roleTip.textContent = 'Dont get caught!';

        roleDisplay.style.backgroundColor = '#1c0041';
        roleDisplay.style.backgroundImage = 'radial-gradient(circle, rgb(255, 0, 0) 0%, rgb(128, 0, 0) 100%)';

    }else{
        const wordDisplay = document.getElementById('word');

        roleStatus.textContent = 'Innocent';
        roleStatus.classList.add('innocent');
        roleTip.textContent = 'Find the imposter!';

        wordDisplay.textContent = `${selectedWord}`;

        roleDisplay.style.backgroundColor = '#1c0041';
        roleDisplay.style.backgroundImage = 'radial-gradient(circle, rgb(0, 255, 0) 0%, rgb(0, 128, 0) 100%)';
    }
}

let currentIndex = 1;

function init() {
    decidePlayerList(localStorage.getItem('current_players'));
    displayRole(currentIndex);
}

init();

document.getElementById('ready-button').addEventListener('click', () => {
    if(currentIndex < JSON.parse(localStorage.getItem('current_players')).length){
        currentIndex++;
    }else{
        return;
    }
    displayRole(currentIndex);
});