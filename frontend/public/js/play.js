import { getURLParameter, getRandomInt, toTitleCase } from '../js/global.js';

// === CONFIG ===
const ROLE_DATA = {
    amnesias: { 
        label: 'Amnesia', class: 'amnesia', 
        tip: 'You forgot your role :c\nTry to remember (guess) your role!', 
        grad: 'radial-gradient(circle, rgb(39, 180, 245) 0%, rgb(20, 90, 123) 100%)',
        showWord: false 
    },
    mimes: { 
        label: 'Mime', class: 'mime', 
        tip: 'You can only act out actions on your turn!', 
        grad: 'radial-gradient(circle, rgb(255, 255, 255) 0%, rgb(0, 0, 0) 100%)',
        showWord: true 
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
    guardian_angels: { 
        label: 'Guardian Angel', class: 'guardian_angel', 
        tip: 'Try to protect your target!', 
        grad: 'radial-gradient(circle, rgb(199, 255, 249) 0%, rgb(100, 128, 125) 100%)',
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

    const roleIds = ['imposter', 'jester', 'executioner', 'fugitive', 'guardian_angel'];
    const chosenRoles = {};
    const occupiedIndices = new Set();

    roleIds.forEach(id => {
        const key = (id === 'guardian_angel') ? 'guardian_angels' : `${id}s`; 
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

    // Random Events: Amnesia (5%)
    const amnesiaList = [];
    // Random Events: Mimes (5%)
    const mimeList = [];

    if (localStorage.getItem("random_events_enabled") === "true") {
        players.forEach(player => {
            const name = player.player_name;
            // Amnesia logic
            if (Math.random() < 0.05) {
                const fugitives = getStorageJson('fugitives');
                if (!amnesiaList.includes(name) && !fugitives.includes(name)) {
                    amnesiaList.push(name);
                }
            }
            // Mime logic
            if (Math.random() < 0.9) {
                if (!mimeList.includes(name)) {
                    mimeList.push(name);
                }
            }
        });
    }
    localStorage.setItem('amnesias', JSON.stringify(amnesiaList));
    localStorage.setItem('mimes', JSON.stringify(mimeList));

    // Targets
    const assignTargets = (roleArray, storageKey) => {
        const targets = {};
        roleArray.forEach(name => {
            const myIdx = players.findIndex(p => p.player_name === name);
            let targetIdx;
            do { 
                targetIdx = Math.floor(Math.random() * players.length); 
            } while (targetIdx === myIdx && players.length > 1);
            targets[name] = players[targetIdx].player_name;
        });
        localStorage.setItem(storageKey, JSON.stringify(targets));
    };

    assignTargets(chosenRoles.executioner, 'executionerTargets');
    assignTargets(chosenRoles.guardian_angel, 'guardian_angelTargets');
    
    localStorage.setItem("unselected_fugitives", JSON.stringify(chosenRoles.fugitive));
}

function displayRole(playerIndex) {
    const players = getStorageJson('current_players');
    const playerName = players[playerIndex - 1]?.player_name || "Unknown";
    
    const roleTitle = document.getElementById('role-title');
    const roleStatus = document.getElementById('role-status');
    const roleTip = document.getElementById('role-tip');
    const wordDisplay = document.getElementById('word');

    const allRoleClasses = [...Object.values(ROLE_DATA).map(r => r.class), 'innocent', 'hidden'];

    const baseRoleKeys = ['imposters', 'jesters', 'executioners', 'fugitives', 'guardian_angels'];
    const baseRoleKey = baseRoleKeys.find(key => getStorageJson(key).includes(playerName));
    const isAmnesia = getStorageJson('amnesias').includes(playerName);
    const isMime = getStorageJson('mimes').includes(playerName);
    
    const activeRoleKey = isAmnesia ? 'amnesias' : baseRoleKey;
    const config = ROLE_DATA[activeRoleKey] || INNOCENT_CONFIG;

    function updateUi(configUi, forcedRole = null) {
        roleStatus.classList.remove(...allRoleClasses);

        // Label Logic
        roleTitle.textContent = `Player ${playerIndex} role:`;
        if (isMime && configUi.label !== 'Mime' && configUi.label !== 'Amnesia') {
            roleStatus.textContent = `${configUi.label} - Mime`;
        } else {
            roleStatus.textContent = configUi.label;
        }

        roleStatus.classList.add(configUi.class);
        if (isMime) roleStatus.classList.add('mime');

        // Background Logic
        if (isMime && configUi.label !== 'Mime' && configUi.label !== 'Amnesia') {
            // Extracts the first RGB color from the radial gradient string
            const roleColorMatch = configUi.grad.match(/rgb\(.*?\)/);
            const roleColor = roleColorMatch ? roleColorMatch[0] : 'rgb(0, 255, 0)';
            roleDisplay.style.backgroundImage = `linear-gradient(to right, rgb(0, 0, 0) 0%, ${roleColor} 100%)`;
            roleTip.textContent = `${configUi.tip}\n\nMODIFIER: ${ROLE_DATA.mimes.tip}`;
        } else {
            roleDisplay.style.backgroundImage = configUi.grad;
            roleTip.textContent = configUi.tip;
        }

        if (document.getElementById("fugitive-role-selection")) document.getElementById("fugitive-role-selection").remove();

        // Word & Target Logic
        const gaTargets = getStorageJson('guardian_angelTargets', {});
        const exTargets = getStorageJson('executionerTargets', {});
        let content = (configUi.showWord || isMime) ? selectedWord : '';
        
        const myTarget = exTargets[playerName] || gaTargets[playerName];
        if (myTarget) content += `\n\nYOUR TARGET: ${myTarget}`;
        
        wordDisplay.textContent = content;
    }

    updateUi(config);

    // Fugitive Selection logic
    if (activeRoleKey === 'fugitives') {
        const exclude = ["fugitive", "hidden", "amnesia", "mime"];
        const selectionContainer = document.createElement('div');
        selectionContainer.id = 'fugitive-role-selection';
        selectionContainer.classList.add('fugitive-role-selection');

        const addRoleBtn = (roleId) => {
            const roleBtn = document.createElement('button');
            roleBtn.className = 'titan-one-regular';
            roleBtn.textContent = toTitleCase(roleId.replace('_', ' '));

            roleBtn.onclick = () => {
                const roleKey = (roleId === 'guardian_angel') ? 'guardian_angels' : `${roleId}s`;
                const configSet = ROLE_DATA[roleKey] || INNOCENT_CONFIG;

                const existingList = getStorageJson(roleKey);
                if (!existingList.includes(playerName)) {
                    existingList.push(playerName);
                    localStorage.setItem(roleKey, JSON.stringify(existingList));
                }

                if (roleId === 'executioner' || roleId === 'guardian_angel') {
                    const targetKey = (roleId === 'executioner') ? 'executionerTargets' : 'guardian_angelTargets';
                    const targets = getStorageJson(targetKey, {});
                    if (!targets[playerName]) {
                        const allP = getStorageJson('current_players');
                        const myIdx = allP.findIndex(p => p.player_name === playerName);
                        let tIdx;
                        do { tIdx = Math.floor(Math.random() * allP.length); } while (tIdx === myIdx && allP.length > 1);
                        targets[playerName] = allP[tIdx].player_name;
                        localStorage.setItem(targetKey, JSON.stringify(targets));
                    }
                }

                const currentUnselected = getStorageJson("unselected_fugitives").filter(p => p !== playerName);
                localStorage.setItem("unselected_fugitives", JSON.stringify(currentUnselected));
                updateUi(configSet, roleId); 
            };
            selectionContainer.appendChild(roleBtn);
        };

        // Filter the ROLE_DATA keys to show eligible buttons
        Object.keys(ROLE_DATA)
            .map(k => ROLE_DATA[k].class)
            .filter(c => !exclude.includes(c))
            .forEach(addRoleBtn);

        roleDisplay.insertBefore(selectionContainer, document.getElementById("role-tip"));
    }
}

function hideRole(playerIndex) {
    sessionStorage.setItem('current_player_is_ready', 'false');
    const roleStatus = document.getElementById('role-status');
    const wordDisplay = document.getElementById('word');
    
    roleStatus.className = 'hidden';
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
    const listContainer = document.createElement('div');
    listContainer.id = 'roles-list';

    const wordInfo = document.createElement('div');
    wordInfo.id = 'word-display';
    wordInfo.textContent = `Word: ${selectedWord}`;
    main.insertBefore(wordInfo, document.getElementById('view-roles'));

    players.forEach(p => {
        const el = document.createElement('div');
        el.className = 'player-view-role';
        const name = p.player_name;
        
        const powerRoleKeys = ['imposters', 'jesters', 'executioners', 'guardian_angels'];
        const foundKey = powerRoleKeys.find(key => getStorageJson(key).includes(name));
        
        const isFugitive = getStorageJson('fugitives').includes(name);
        const isUnselected = getStorageJson('unselected_fugitives').includes(name);
        const isAmnesia = getStorageJson('amnesias').includes(name);
        const isMime = getStorageJson('mimes').includes(name);

        let roleName = foundKey ? ROLE_DATA[foundKey].label : 'Innocent';
        if (isFugitive && isUnselected) roleName = 'Fugitive';

        let roleExtra = '';
        if (isFugitive) roleExtra += ' [FUGITIVE]';
        if (isAmnesia) roleExtra += ' [AMNESIA]';
        if (isMime) roleExtra += ' [MIME]';
        
        const exT = getStorageJson('executionerTargets', {})[name];
        const gaT = getStorageJson('guardian_angelTargets', {})[name];
        if (exT || gaT) roleExtra += ` [TARGET: ${exT || gaT}]`;

        el.textContent = `${name} (${roleName})${roleExtra}`;
        listContainer.appendChild(el);
    });
    main.appendChild(listContainer);
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
    if (updateStats) {
        const token = localStorage.getItem('token');
        if (token) {
            fetch("https://imposter-gm.com/api/auth/update-stats", {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ local_plays: 1 })
            }).catch(() => {});
        }
    }
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
        fugitive: localStorage.getItem('fugitive_count'),
        guardian_angel: localStorage.getItem('guardian_angel_count')
    });
    
    selectedWord = createSelectedWord();
    hideRole(currentIndex);
}

document.getElementById('ready-button').addEventListener('click', () => {
    const players = getStorageJson('current_players');
    const name = players[currentIndex - 1]?.player_name;
    const isUnselectedFugitive = getStorageJson('unselected_fugitives').includes(name);

    if (isUnselectedFugitive && !document.getElementById('role-status').classList.contains('hidden')) {
        alert("Please select a role first!");
        return;
    }

    if (sessionStorage.getItem('current_player_is_ready') !== 'true') {
        sessionStorage.setItem('current_player_is_ready', 'true');
        displayRole(currentIndex);
    } else {
        if (currentIndex < players.length) {
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

init();
