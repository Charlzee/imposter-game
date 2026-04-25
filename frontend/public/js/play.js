import { getURLParameter, getRandomInt } from '../js/global.js';

const response = await fetch("https://imposter-game-backend.charlzee.workers.dev/words");
const data = await response.json();

console.log("Fetched topics:", data);

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
    console.log('test')
}

function displayRole(playerIndex){
    const roleTitle = document.getElementById('role-title');
    const roleStatus = document.getElementById('role-status');
    const roleTip = document.getElementById('role-tip');
    const wordDisplay = document.getElementById('word');

    roleTitle.textContent = `Player ${playerIndex} role:`;

    const player = JSON.parse(localStorage.getItem('current_players'))[playerIndex - 1].player_name;
    
    console.log(player);
    console.log(imposter);

    roleStatus.classList.remove('hidden');

    if (player == imposter) {
        roleStatus.textContent = 'Imposter';
        roleStatus.classList.add('imposter');
        roleTip.textContent = 'Dont get caught!';

        wordDisplay.textContent = '';

        roleDisplay.style.backgroundColor = '#FF0000';
        roleDisplay.style.backgroundImage = 'radial-gradient(circle, rgb(255, 0, 0) 0%, rgb(128, 0, 0) 100%)';

    }else{
        roleStatus.textContent = 'Innocent';
        roleStatus.classList.add('innocent');
        roleTip.textContent = 'Find the imposter!';

        wordDisplay.textContent = `${selectedWord}`;

        roleDisplay.style.backgroundColor = '#00FF00';
        roleDisplay.style.backgroundImage = 'radial-gradient(circle, rgb(0, 255, 0) 0%, rgb(0, 128, 0) 100%)';
    }
}

function hideRole(playerIndex){
    const roleTitle = document.getElementById('role-title');
    const roleStatus = document.getElementById('role-status');
    const roleTip = document.getElementById('role-tip');
    const wordDisplay = document.getElementById('word');

    sessionStorage.setItem('current_player_is_ready', false);

    roleTip.textContent = 'Turn the device away from the other players.';

    roleDisplay.style.backgroundColor = '#00FF00';
    roleDisplay.style.backgroundImage = 'radial-gradient(circle, rgb(255, 255, 0) 0%, rgb(128, 128, 0) 100%)';

    roleStatus.textContent = '???';
    roleStatus.classList.remove('imposter', 'innocent');
    roleStatus.classList.add('hidden');

    roleTip.style.fontSize = '2em';
    roleTitle.textContent = `Player ${playerIndex} role:`;
    wordDisplay.textContent = 'Click \'Next\' to reveal!';
}

function viewRoles() {
    const playerContainer = docum
}

function startGame() {
    const maxTime = 120;
    let time = maxTime;

    const timerDisplay = document.createElement('div');
    timerDisplay.id = 'timer-display';
    timerDisplay.textContent = `Time Remaining: ${time}s`;
    timerDisplay.style.fontSize = '1.5rem';
    main.insertBefore(timerDisplay, document.getElementById('back-button'));

    const viewRolesBtn = document.createElement('button')
    viewRolesBtn.id = 'view-roles'
    viewRolesBtn.classList.add('titan-one-regular')
    viewRolesBtn.textContent = "View Roles"
    main.insertBefore(viewRolesBtn, document.getElementById('back-button'));

    const bigText = document.getElementById('big-text')
    bigText.textContent = 'DISCUSS'
    
    const timer = setInterval(() => {
        time--;
        timerDisplay.textContent = `Time Remaining: ${time}s`;
        console.log(`Time remaining: ${time}s`);
        if (time <= 0) {
            timerDisplay.textContent = 'Time\'s up!';
            clearInterval(timer);
        }
    }, 1000);
}

let currentIndex = 1;

function init() {
    if (localStorage.getItem('game_started') === 'true') {
        roleDisplay.remove();
        document.getElementById('ready-button').remove();
        startGame();
        return;
    }

    decidePlayerList(localStorage.getItem('current_players'));
    hideRole(currentIndex);
}

document.getElementById('ready-button').addEventListener('click', () => {
    if (sessionStorage.getItem('current_player_is_ready') === 'false'){
        sessionStorage.setItem('current_player_is_ready', true);
        displayRole(currentIndex);
        return;
    }
    if(currentIndex < JSON.parse(localStorage.getItem('current_players')).length){
        currentIndex++;
        hideRole(currentIndex);
    }else{
        localStorage.setItem('game_started', true);
        roleDisplay.remove();
        document.getElementById('ready-button').remove();
        startGame();
    }
});


init();