import { getURLParameter, getRandomInt } from '../js/global.js';

const response = await fetch("https://imposter-gm.com/api/words");
const data = await response.json();

console.log("Fetched topics:", data);

const main = document.getElementById('main')
const roleDisplay = document.getElementById('role-display');

const selectedTopicId = localStorage.getItem('selected_topic');
const selectedTopic = data.find(topic => topic.id === selectedTopicId);

const words = selectedTopic.words;
let selectedWord = null;

let viewingRoles = false;

let globalImposters = [];
let imposterIndex = null;

function getLocal(){
    const isLocal = getURLParameter('local') === 'true' ? true : false;

    console.log(isLocal)
    return isLocal
}

function createSelectedWord(){
    const selectedWord = words[getRandomInt(words.length)];
    localStorage.setItem('selected_word', btoa(encodeURIComponent(selectedWord)));
    return selectedWord;
}

function decidePlayerList(playersJson, imposterAmount) {
    const players = JSON.parse(playersJson || '[]');

    if (players.length === 0) return;

    const chosenNames = [];
    const chosenIndices = new Set();
    let count = parseInt(imposterAmount) || 1;

    console.log("DEBUG: imposterAmount =", imposterAmount);
    console.log("DEBUG: count =", count);
    console.log("DEBUG: players.length =", players.length);

    while (chosenNames.length < count && chosenIndices.size < players.length) {
        const randomIndex = Math.floor(Math.random() * players.length);
        if (!chosenIndices.has(randomIndex)) {
            chosenIndices.add(randomIndex);
            chosenNames.push(players[randomIndex].player_name);
        }
    }

    console.log("DEBUG: chosenNames.length =", chosenNames.length);
    console.log("DEBUG: chosenNames =", chosenNames);

    globalImposters = chosenNames;
    localStorage.setItem('imposters', JSON.stringify(chosenNames));
    
    console.log("IMPOSTERS GENERATED:", localStorage.getItem('imposters'));
}




function displayRole(playerIndex){
    if (globalImposters.length === 0) {
        globalImposters = JSON.parse(localStorage.getItem('imposters') || '[]');
    }
    
    const roleTitle = document.getElementById('role-title');
    const roleStatus = document.getElementById('role-status');
    const roleTip = document.getElementById('role-tip');
    const wordDisplay = document.getElementById('word');

    roleTitle.textContent = `Player ${playerIndex} role:`;

    const player = JSON.parse(localStorage.getItem('current_players') || '[]')[playerIndex - 1]?.player_name || "Unknown Player";

    console.log(player);

    roleStatus.classList.remove('hidden');

    if (globalImposters.includes(player)) {
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
    const playerContainer = document.createElement('div');
    const players = JSON.parse(localStorage.getItem('current_players'));
    const word = selectedWord;
    const imposters = JSON.parse(localStorage.getItem('imposters'));

    if (viewingRoles === false) {
        viewingRoles = true;

        const wordDisplay = document.createElement('div');
        wordDisplay.id = 'word-display';
        wordDisplay.textContent = `Word: ${word}`;
        main.insertBefore(wordDisplay, document.getElementById('view-roles'));
        
        players.forEach(player => {
            const playerElement = document.createElement('div');

            playerContainer.id = 'roles-list';

            playerElement.classList.add('player-view-role');
            playerElement.textContent = player.player_name + (imposters.includes(player.player_name) ? ' (Imposter)' : ' (Innocent)');
            playerContainer.appendChild(playerElement);
        });
    }else{
        if (document.getElementById('roles-list')) {
            viewingRoles = false;
            document.getElementById('roles-list').remove();
            document.getElementById('word-display').remove();
        }
    }


    main.appendChild(playerContainer, document.getElementById('view-roles'));
}

async function addLocalPlaysToStats(plays) {
    const token = localStorage.getItem('token');

    const response = await fetch("https://imposter-gm.com/api/auth/update-stats", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            local_plays: plays,
        })
    });

    const result = await response.json();
    console.log("Updated Stats:", result.newData);
}

async function startGame(updateStats=true) {
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
    viewRolesBtn.addEventListener('click', viewRoles)
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

    if (updateStats){
        try {
            await addLocalPlaysToStats(1);
            console.log("Game progress synced");
        } catch (error) {
            console.warn("Could not sync stats");
        }
    }  
}

let currentIndex = 1;

function init() {
    if (localStorage.getItem('game_started') === 'true') {
        roleDisplay.remove();
        document.getElementById('ready-button').remove();
        selectedWord = decodeURIComponent(atob(localStorage.getItem('selected_word')));
        startGame(false);
        return;
    }

    console.log("DEBUG: imposter_count from localStorage =", localStorage.getItem("imposter_count"));
    console.log(parseInt(localStorage.getItem("imposter_count")))
    
    decidePlayerList(localStorage.getItem('current_players'), parseInt(localStorage.getItem("imposter_count")));
    selectedWord = createSelectedWord();
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
