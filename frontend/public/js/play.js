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
let globalJesters = [];
let globalAmnesias = [];
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

function decidePlayerList(playersJson, imposterAmount, jesterAmount=0) {
    const players = JSON.parse(playersJson || '[]');

    //TODO: Add amnesiac (cant see role) and fugative (choose role) and executioner (Vote out specific person)
    
    if (players.length === 0) return;

    if (jesterAmount === 0){
        localStorage.setItem('jesters', JSON.stringify([]));
    }
    
    const totalRolesRequested = (parseInt(imposterAmount) || 0) + (parseInt(jesterAmount) || 0);
    if (totalRolesRequested > players.length) {
        console.error("Not enough players for the roles!");
        return;
    }

    const chosenNamesImposter = [];
    const chosenNamesJester = [];
    const chosenNamesAmnesia = [];
    const occupiedIndices = new Set();

    const getRandomAvailableIndex = () => {
        let index;
        do {
            index = Math.floor(Math.random() * players.length);
        } while (occupiedIndices.has(index));
        return index;
    };


    const impCount = parseInt(imposterAmount) || 0;
    for (let i = 0; i < impCount; i++) {
        const idx = getRandomAvailableIndex();
        occupiedIndices.add(idx);
        chosenNamesImposter.push(players[idx].player_name);
    }

    const jestCount = parseInt(jesterAmount) || 0;
    for (let i = 0; i < jestCount; i++) {
        const idx = getRandomAvailableIndex();
        occupiedIndices.add(idx);
        chosenNamesJester.push(players[idx].player_name);
    }

    const amnesiaChance = 5
    for (let i = 0; i < players.length; i++) {
        if (Math.floor(Math.random() * (100 / amnesiaChance)) === 1) {
            chosenNamesAmnesia.push(players[i].player_name);
        }
    }

    globalImposters = chosenNamesImposter;
    globalJesters = chosenNamesJester;
    globalAmnesias = chosenNamesAmnesia;
    localStorage.setItem('imposters', JSON.stringify(chosenNamesImposter));
    localStorage.setItem('jesters', JSON.stringify(chosenNamesJester));
    localStorage.setItem('amnesias', JSON.stringify(chosenNamesAmnesia));
}




function displayRole(playerIndex){
    if (globalImposters.length === 0) {
        globalImposters = JSON.parse(localStorage.getItem('imposters') || '[]');
    }
    if (globalJesters.length === 0) {
        globalJesters = JSON.parse(localStorage.getItem('jesters') || '[]');
    }
    if (globalAmnesias.length === 0) {
        globalAmnesias = JSON.parse(localStorage.getItem('amnesias') || '[]');
    }

    const roleTitle = document.getElementById('role-title');
    const roleStatus = document.getElementById('role-status');
    const roleTip = document.getElementById('role-tip');
    const wordDisplay = document.getElementById('word');

    roleTitle.textContent = `Player ${playerIndex} role:`;

    const player = JSON.parse(localStorage.getItem('current_players') || '[]')[playerIndex - 1]?.player_name || "Unknown Player";

    console.log(player);

    roleStatus.classList.remove('hidden', 'imposter', 'innocent', 'jester', 'amnesia');

    if (globalAmnesias.includes(player)) {
        roleStatus.textContent = 'You forgot your role :C'
        roleStatus.classList.add('amnesia')
        roleTip.textContent = 'Try to remember (guess) your role!'

        wordDisplay.textContent = '';

        roleDisplay.style.backgroundColor = '#27B4F5';
        roleDisplay.style.backgroundImage = 'radial-gradient(circle, rgb(39, 180, 245) 0%, rgb(20, 90, 123) 100%)'
        
    } else if (globalImposters.includes(player)) {
        roleStatus.textContent = 'Imposter';
        roleStatus.classList.add('imposter');
        roleTip.textContent = 'Dont get caught!';

        wordDisplay.textContent = '';

        roleDisplay.style.backgroundColor = '#FF0000';
        roleDisplay.style.backgroundImage = 'radial-gradient(circle, rgb(255, 0, 0) 0%, rgb(128, 0, 0) 100%)';

    } else if (globalJesters.includes(player)) {
        roleStatus.textContent = 'Jester';
        roleStatus.classList.add('jester');
        roleTip.textContent = 'Try to get voted out!';

        wordDisplay.textContent = `${selectedWord}`;

        roleDisplay.style.backgroundColor = '#FF00FF';
        roleDisplay.style.backgroundImage = 'radial-gradient(circle, rgb(255, 0, 255) 0%, rgb(128, 0, 128) 100%)';
    
    } else {
        roleStatus.textContent = 'Innocent';
        roleStatus.classList.add('innocent');
        roleTip.textContent = 'Find the imposter and don\'t vote out Jesters!';

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
    roleStatus.classList.remove('imposter', 'innocent', 'jester');
    roleStatus.classList.add('hidden');

    roleTip.style.fontSize = '2em';
    roleTitle.textContent = `Player ${playerIndex} role:`;
    wordDisplay.textContent = 'Click \'Next\' to reveal!';
}

function viewRoles() {
    const playerContainer = document.createElement('div');
    const players = JSON.parse(localStorage.getItem('current_players'));
    const word = selectedWord;
    const imposters = JSON.parse(localStorage.getItem('imposters') || '[]');
    const jesters = JSON.parse(localStorage.getItem('jesters') || '[]');

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
            playerElement.textContent = player.player_name +
                (imposters.includes(player.player_name) ? ' (Imposter)' :
                    jesters.includes(player.player_name) ? ' (Jester)' :
                        ' (Innocent)') +
                (JSON.parse(localStorage.getItem('amnesias') || '[]').includes(player.player_name) ? ' [AMNESIA]' : '');
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

async function lobby() {
    var strconfirm = confirm("Are you sure you want to go back to lobby?");
    if (strconfirm == true) {
        window.location.href = 'create/local.html';
    }
}

let currentIndex = 1;

function init() {
    window.lobby = lobby;

    if (localStorage.getItem('game_started') === 'true') {
        roleDisplay.remove();
        document.getElementById('ready-button').remove();
        selectedWord = decodeURIComponent(atob(localStorage.getItem('selected_word')));
        startGame(false);
        return;
    }

    console.log(parseInt(localStorage.getItem("imposter_count")))
    
    decidePlayerList(
        localStorage.getItem('current_players'),
        parseInt(localStorage.getItem('imposter_count')),
        parseInt(localStorage.getItem('jester_count'))
    );
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
