import { getURLParameter, getRandomInt, toTitleCase } from '../js/global.js';

// === CONFIG ===
const ROLE_DATA = {
    amnesias: { 
        label: 'Amnesia', class: 'amnesia', 
        tip: 'You forgot your role :c\nTry to remember (guess) your role!', 
        grad: 'radial-gradient(circle, rgb(39, 180, 245) 0%, rgb(20, 90, 123) 100%)',
        showWord: false 
    },
    imposters: { 
        label: 'Imposter', class: 'imposter', 
        tip: 'Dont get caught!', 
        grad: 'radial-gradient(circle, rgb(255, 0, 0) 0%, rgb(128, 0, 0) 100%)',
        showWord: false 
    },
    jesters: { 
        label: 'Jester', class: 'jester', 
        tip: 'Try to get voted out!', 
        grad: 'radial-gradient(circle, rgb(255, 0, 255) 0%, rgb(128, 0, 128) 100%)',
        showWord: true 
    },
    executioners: { 
        label: 'Executioner', class: 'executioner', 
        tip: 'Try to vote out your target!', 
        grad: 'radial-gradient(circle, rgb(85, 85, 85) 0%, rgb(42, 42, 42) 100%)',
        showWord: true 
    },
    fugitives: { 
        label: 'Fugitive', class: 'fugitive', 
        tip: 'CHOOSE YOUR ROLE.', 
        grad: 'radial-gradient(circle, rgb(255, 165, 0) 0%, rgb(128, 83, 0) 100%)',
        showWord: false 
    },
    guardian_angel: { 
        label: 'Guardian Angel', class: 'guardian_angel', 
        tip: 'Try to protect your target!', 
        grad: 'radial-gradient(circle, rgb(85, 85, 85) 0%, rgb(42, 42, 42) 100%)',
        showWord: true 
    }
};

const INNOCENT_CONFIG = {
    label: 'Innocent', class: 'innocent', 
    tip: 'Find the imposter!', 
    grad: 'radial-gradient(circle, rgb(0, 255, 0) 0%, rgb(0, 128, 0) 100%)',
    showWord: true
};

// ==== GLOBAL STATE ====
let data, selectedTopic, words, selectedWord = null;
let currentIndex = 1;
let viewingRoles = false;
let gameTimer = null;
const main = document.getElementById('main');
const roleDisplay = document.getElementById('role-display');

// ==== HELPERS ====
const getStorageJson = (key, fallback = []) => JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));

async function fetchData() {
    try {
        const response = await fetch("https://imposter-gm.com/api/words");
        data = await response.json();
        const selectedTopicId = localStorage.getItem('selected_topic');
        selectedTopic = data.find(t => t.id === selectedTopicId) || data[0];
        words = selectedTopic.words;
    } catch (error) {
        console.error("Failed to fetch topics:", error);
    }
}

function createSelectedWord() {
    const word = words[getRandomInt(words.length)];
    localStorage.setItem('selected_word', btoa(encodeURIComponent(word)));
    return word;
}

// ==== GAME LOGIC ====
function decidePlayerList(playersJson, roleCounts = {}) {
    const players = JSON.parse(playersJson || '[]');
    if (!players.length) return;

    const roleIds = ['imposter', 'jester', 'executioner', 'fugitive'];
    const chosenRoles = {};
    const occupiedIndices = new Set();

    roleIds.forEach(id => {
        const key = `${id}s`; 
        chosenRoles[id] = [];

        const count = parseInt(roleCounts[id]) || 0;
        const rawPercent = localStorage.getItem(`${id}_percent`) || "100%";
        const spawnChance = parseInt(rawPercent.replace('%', '')) / 100;

        for (let i = 0; i < count; i++) {
            if (occupiedIndices.size >= players.length) break;

            if (Math.random() < spawnChance) {
                let idx;
                do { 
                    idx = Math.floor(Math.random() * players.length); 
                } while (occupiedIndices.has(idx));
                
                occupiedIndices.add(idx);
                chosenRoles[id].push(players[idx].player_name);
            }
        }
        localStorage.setItem(key, JSON.stringify(chosenRoles[id]));
    });

    // Amnesia (static 5% per person)
    const amnesiaList = [];
    if (localStorage.getItem("random_events_enabled") === "true") {
        players.forEach(player => {
            if (Math.random() < 0.05) {
                if (!amnesiaList.includes(player.player_name) && !JSON.parse(localStorage.getItem('fugitives')).includes(player.player_name)) {
                    amnesiaList.push(player.player_name);
                }
            }
        });
    }
    localStorage.setItem('amnesias', JSON.stringify(amnesiaList));

    // Executioner Targets
    const targets = {};
    chosenRoles.executioner.forEach(name => {
        const myIdx = players.findIndex(p => p.player_name === name);
        let targetIdx;
        do { 
            targetIdx = Math.floor(Math.random() * players.length); 
        } while (targetIdx === myIdx && players.length > 1);
        targets[name] = players[targetIdx].player_name;
    });
    localStorage.setItem('executionerTargets', JSON.stringify(targets));
    localStorage.setItem("unselected_fugitives", JSON.stringify(chosenRoles.fugitive));
}

function displayRole(playerIndex) {
    const players = getStorageJson('current_players');
    const playerName = players[playerIndex - 1]?.player_name || "Unknown";
    
    const roleTitle = document.getElementById('role-title');
    const roleStatus = document.getElementById('role-status');
    const roleTip = document.getElementById('role-tip');
    const wordDisplay = document.getElementById('word');

    // Clean up old classes
    const allRoleClasses = [...Object.values(ROLE_DATA).map(r => r.class), 'innocent', 'hidden'];

    // Get role
    const baseRoleKeys = ['imposters', 'jesters', 'executioners', 'fugitives'];
    const baseRoleKey = baseRoleKeys.find(key => getStorageJson(key).includes(playerName));
    const isAmnesia = getStorageJson('amnesias').includes(playerName);
    
    const activeRoleKey = isAmnesia ? 'amnesias' : baseRoleKey;
    const config = ROLE_DATA[activeRoleKey] || INNOCENT_CONFIG;

    function updateUi(configUi, forcedRole = null) {
        roleStatus.classList.remove(...allRoleClasses);

        roleTitle.textContent = `Player ${playerIndex} role:`;
        roleStatus.textContent = configUi.label;
        roleStatus.classList.add(configUi.class);
        roleTip.textContent = configUi.tip;
        roleDisplay.style.backgroundImage = configUi.grad;

        if (document.getElementById("fugitive-role-selection")){
            document.getElementById("fugitive-role-selection").remove();
        }

        const isExecutioner = (activeRoleKey === 'executioners') || 
                            (forcedRole === 'executioner') || 
                            (getStorageJson('executioners').includes(playerName));

        let content = configUi.showWord ? selectedWord : '';
        
        if (isExecutioner) {
            const targets = getStorageJson('executionerTargets', {});
            content += `\n\nYOUR TARGET: ${targets[playerName] || 'Unknown'}`;
        }
        
        wordDisplay.textContent = content;
    }

    updateUi(config)

    // Fugitive select role
    if (activeRoleKey === 'fugitives') {
        const exclude = ["fugitive", "hidden", "amnesia"];

        const selectionContainer = document.createElement('div');
        selectionContainer.id = 'fugitive-role-selection';
        selectionContainer.classList.add('fugitive-role-selection');

        function addRole(role) {
            const roleBtn = document.createElement('button');
            roleBtn.classList.add('titan-one-regular');
            roleBtn.textContent = toTitleCase(role);

            roleBtn.onclick = () => {
                const configSet = ROLE_DATA[`${role}s`] || INNOCENT_CONFIG;

                const roleKey = `${role}s`;
                const existingRoleList = getStorageJson(roleKey);
                if (!existingRoleList.includes(playerName)) {
                    existingRoleList.push(playerName);
                    localStorage.setItem(roleKey, JSON.stringify(existingRoleList));
                }

                if (role === 'executioner') {
                    const players = getStorageJson('current_players');
                    const targets = getStorageJson('executionerTargets', {});

                    if (!targets[playerName]) {
                        const myIdx = players.findIndex(p => p.player_name === playerName);
                        let targetIdx;
                        do { 
                            targetIdx = Math.floor(Math.random() * players.length); 
                        } while (targetIdx === myIdx && players.length > 1);
                        
                        targets[playerName] = players[targetIdx].player_name;
                        localStorage.setItem('executionerTargets', JSON.stringify(targets));
                    }
                }

                const currentUnselected = getStorageJson("unselected_fugitives");
                const filteredUnselected = currentUnselected.filter(p => p !== playerName);
                localStorage.setItem("unselected_fugitives", JSON.stringify(filteredUnselected));

                updateUi(configSet, role); 
            }

            selectionContainer.appendChild(roleBtn);
        }

        allRoleClasses
            .filter(role => !exclude.includes(role))
            .forEach(role => addRole(role));

        roleDisplay.insertBefore(selectionContainer, document.getElementById("role-tip"));
    }
}

function hideRole(playerIndex) {
    sessionStorage.setItem('current_player_is_ready', 'false');
    const roleStatus = document.getElementById('role-status');
    const wordDisplay = document.getElementById('word');
    
    const allRoleClasses = [...Object.values(ROLE_DATA).map(r => r.class), 'innocent'];
    roleStatus.classList.remove(...allRoleClasses);
    roleStatus.classList.add('hidden');
    roleStatus.textContent = '???';
    document.getElementById('role-tip').textContent = 'Turn the device away from other players.';
    document.getElementById('role-tip').style.fontSize = '2em';
    document.getElementById('role-title').textContent = `Player ${playerIndex} role:`;
    wordDisplay.textContent = "Click 'Next' to reveal!";
    
    roleDisplay.style.backgroundImage = 'radial-gradient(circle, rgb(255, 255, 0) 0%, rgb(128, 128, 0) 100%)';
}

function viewRoles() {
    if (viewingRoles) {
        document.getElementById('roles-list')?.remove();
        document.getElementById('word-display')?.remove();
        viewingRoles = false;
        return;
    }

    viewingRoles = true;
    const players = getStorageJson('current_players');
    const targets = getStorageJson('executionerTargets', {});

    const listContainer = document.createElement('div');
    listContainer.id = 'roles-list';

    const wordInfo = document.createElement('div');
    wordInfo.id = 'word-display';
    wordInfo.textContent = `Word: ${selectedWord}`;
    main.insertBefore(wordInfo, document.getElementById('view-roles'));

    players.forEach(p => {
        const el = document.createElement('div');
        el.classList.add('player-view-role');

        const name = p.player_name;
        const powerRoleKeys = ['imposters', 'jesters', 'executioners'];
        const transformedRoleKey = powerRoleKeys.find(key => getStorageJson(key).includes(name));
        
        const isOriginalFugitive = getStorageJson('fugitives').includes(name);
        const hasSelectedFugitiveRole = isOriginalFugitive && !getStorageJson('unselected_fugitives').includes(name);
        const isAmnesia = getStorageJson('amnesias').includes(name);

        let roleName = 'Innocent';
        
        if (transformedRoleKey) {
            roleName = ROLE_DATA[transformedRoleKey].label;
        } else if (isOriginalFugitive && !hasSelectedFugitiveRole) {
            roleName = 'Fugitive';
        } 

        let roleExtra = '';
        
        if (isOriginalFugitive) {
            roleExtra += ' [FUGITIVE]';
        }

        if (getStorageJson('executioners').includes(name)) {
            const targets = getStorageJson('executionerTargets', {});
            roleExtra += ` [TARGET: ${targets[name] || 'Unknown'}]`;
        }

        if (isAmnesia) {
            roleExtra += ' [AMNESIA]';
        }

        el.textContent = `${name} (${roleName})${roleExtra}`;
        listContainer.appendChild(el);
    });

    main.appendChild(listContainer);
}

async function addLocalPlaysToStats(plays) {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
        await fetch("https://imposter-gm.com/api/auth/update-stats", {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ local_plays: plays })
        });
    } catch (e) { console.warn("Stats sync failed."); }
}

async function startGame(updateStats = true) {
    const maxTime = 120;
    let time = maxTime;

    const timerDisplay = document.createElement('div');
    timerDisplay.id = 'timer-display';
    timerDisplay.textContent = `Time Remaining: ${time}s`;
    timerDisplay.style.fontSize = '1.5rem';
    main.insertBefore(timerDisplay, document.getElementById('back-button'));

    const viewRolesBtn = document.createElement('button');
    viewRolesBtn.id = 'view-roles';
    viewRolesBtn.className = 'titan-one-regular';
    viewRolesBtn.textContent = "View Roles";
    viewRolesBtn.onclick = viewRoles;
    main.insertBefore(viewRolesBtn, document.getElementById('back-button'));

    document.getElementById('big-text').textContent = 'DISCUSS';

    gameTimer = setInterval(() => {
        time--;
        timerDisplay.textContent = `Time Remaining: ${time}s`;
        if (time <= 0) {
            timerDisplay.textContent = "Time's up!";
            clearInterval(gameTimer);
        }
    }, 1000);

    if (updateStats) addLocalPlaysToStats(1);
}

function lobby() {
    if (confirm("Are you sure you want to go back to lobby?")) {
        if (gameTimer) clearInterval(gameTimer);
        window.location.href = 'create/local.html';
    }
}

async function init() {
    await fetchData();
    window.lobby = lobby;

    if (localStorage.getItem('game_started') === 'true') {
        roleDisplay.remove();
        document.getElementById('ready-button').remove();
        selectedWord = decodeURIComponent(atob(localStorage.getItem('selected_word')));
        startGame(false);
        return;
    }

    decidePlayerList(localStorage.getItem('current_players'), {
        imposter: localStorage.getItem('imposter_count'),
        jester: localStorage.getItem('jester_count'),
        executioner: localStorage.getItem('executioner_count'),
        fugitive: localStorage.getItem('fugitive_count')
    });
    
    selectedWord = createSelectedWord();
    hideRole(currentIndex);
}

document.getElementById('ready-button').addEventListener('click', () => {
    const players = getStorageJson('current_players');
    const fugitives = getStorageJson('unselected_fugitives');

    if (players[currentIndex - 1] && fugitives.includes(players[currentIndex - 1].player_name) && !document.getElementById('role-status').classList.contains('hidden')) {
        return;
    }

    const isReady = sessionStorage.getItem('current_player_is_ready') === 'true';
    if (!isReady) {
        sessionStorage.setItem('current_player_is_ready', 'true');
        displayRole(currentIndex);
    } else {
        const totalPlayers = getStorageJson('current_players').length;
        if (currentIndex < totalPlayers) {
            currentIndex++;
            hideRole(currentIndex);
        } else {
            localStorage.setItem('game_started', 'true');
            roleDisplay.remove();
            document.getElementById('ready-button').remove();
            startGame();
        }
    }
});

(async () => {
    await init();
})();
