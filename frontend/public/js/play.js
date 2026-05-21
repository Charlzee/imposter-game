import getWords from './words.js';
import { getURLParameter, getRandomInt, toTitleCase } from '../js/global.js';

// === DEBUG ===
const FORCE_ALL_MODIFIERS = false;

// === CONFIG ===
const ROLE_MODIFIERS = {
    amnesias: { 
        label: 'Amnesia', class: 'amnesia', 
        tip: 'You forgot your role :c\nTry to remember (guess) your role!', 
        grad: 'radial-gradient(circle, rgb(39, 180, 245) 0%, rgb(20, 90, 123) 100%)',
        textColor: 'rgb(147, 218, 250)',
        subTextColor: 'rgb(190, 235, 255)',
        showWord: false,
        overrideWordVisibility: true,
        chance: 0.05
    },
    mimes: { 
        label: 'Mime', class: 'mime', 
        tip: 'You can only act out actions on your turn!', 
        grad: 'radial-gradient(circle, rgb(0, 0, 0) 0%, rgb(255, 255, 255) 100%)',
        textColor: 'rgb(255, 255, 255)',
        subTextColor: 'rgb(230, 230, 230)',
        showWord: true,
        overrideWordVisibility: false,
        chance: 0.05
    },
    dumb: {
        label: 'Dumb', class: 'dumb', 
        tip: 'You can\'t defend yourself if you get accused!', 
        grad: 'radial-gradient(circle, rgb(78, 168, 9) 0%, rgb(36, 84, 0) 100%)',
        textColor: 'rgb(78, 168, 9)',
        subTextColor: 'rgb(134, 230, 60)',
        showWord: true,
        overrideWordVisibility: false,
        chance: 0.05
    },
    teacher: {
        label: 'English Teacher', class: 'teacher', 
        tip: 'You must criticize people\'s wording when they say their role!', 
        grad: 'radial-gradient(circle, rgb(9, 97, 168) 0%, rgb(5, 49, 84) 100%)',
        textColor: 'rgb(97, 82, 235)',
        subTextColor: 'rgb(160, 150, 255)',
        showWord: true,
        overrideWordVisibility: false,
        chance: 0.05
    },
    cheater: {
        label: 'Cheater', class: 'cheater', 
        tip: 'You, and ONLY YOU, WILL win. Noone else. No matter what. (Only reveal at the end of the game)', 
        grad: 'radial-gradient(circle, red 0%, orange 20%, yellow 40%, green 60%, blue 80%, violet 100%)',
        textColor: 'rgb(255, 255, 0)',
        subTextColor: 'rgb(255, 255, 150)',
        showWord: true,
        overrideWordVisibility: false,
        chance: 0.005
    },
    lucky: {
        label: 'Lucky', class: 'lucky', 
        tip: 'Your vote counts as 2!', 
        grad: 'radial-gradient(circle, lightgreen 0%, green 100%)',
        textColor: 'rgb(94, 255, 0)',
        subTextColor: 'rgb(55, 255, 65)',
        showWord: true,
        overrideWordVisibility: false,
        chance: 0.035
    },
    terrorist: {
        label: 'Terrorist', class: 'terrorist', 
        tip: 'If you get voted out, EVERYONE loses (including you)!', 
        grad: 'radial-gradient(circle, rgb(235, 87, 42) 0%, rgb(118, 44, 21) 100%)',
        textColor: 'orangered',
        subTextColor: 'rgb(255, 55, 55)',
        showWord: true,
        overrideWordVisibility: false,
        chance: 0.035
    },
    scholar: {
        label: 'Scholar', class: 'scholar', 
        tip: 'You get to see the word and theme! (useless unless you are imposter)', 
        grad: 'radial-gradient(circle, rgb(93, 63, 211) 0%, rgb(21, 10, 60) 100%)',
        textColor: 'rgb(187, 153, 255)',
        subTextColor: 'rgb(220, 200, 255)',
        showWord: true,
        showTheme: true,
        overrideWordVisibility: true,
        chance: 0.025
    }
};

const ROLE_DATA = {
    imposters: { 
        label: 'Imposter', class: 'imposter', 
        tip: 'Dont get caught!', 
        grad: 'radial-gradient(circle, rgb(255, 0, 0) 0%, rgb(128, 0, 0) 100%)',
        textColor: 'red',
        showWord: false 
    },
    jesters: { 
        label: 'Jester', class: 'jester', 
        tip: 'Try to get voted out!', 
        grad: 'radial-gradient(circle, rgb(255, 0, 255) 0%, rgb(128, 0, 128) 100%)',
        textColor: 'rgb(255, 0, 200)',
        showWord: true 
    },
    hitmans: { 
        label: 'Hitman', class: 'hitman', 
        tip: 'Try to vote out your target!', 
        grad: 'radial-gradient(circle, rgb(84, 84, 255) 0%, rgb(42, 42, 128) 100%)',
        textColor: 'cornflowerblue',
        showWord: true,
        hasTarget: true
    },
    shapeshifters: { 
        label: 'Shapeshifter', class: 'shapeshifter', 
        tip: 'CHOOSE YOUR ROLE.', 
        grad: 'radial-gradient(circle, rgb(255, 165, 0) 0%, rgb(128, 83, 0) 100%)',
        textColor: 'rgb(255, 165, 0)',
        showWord: false 
    },
    guardian_angels: { 
        label: 'Guardian Angel', class: 'guardian_angel', 
        tip: 'Try to protect your target!', 
        grad: 'radial-gradient(circle, rgb(199, 255, 249) 0%, rgb(100, 128, 125) 100%)',
        textColor: 'rgb(199, 255, 249)',
        showWord: true,
        hasTarget: true
    },
    alphas: {
        label: 'Alpha', class: 'alpha', 
        tip: 'If you get even 1 vote, you lose!', 
        grad: 'radial-gradient(circle, rgb(200, 200, 200) 0%, rgb(100, 100, 100) 100%)',
        textColor: 'rgb(140, 140, 140)',
        showWord: true 
    },
    inspectors: {
        label: 'Inspector Goole', class: 'inspector', 
        tip: 'Use your clue to find the imposter and aura farm', 
        grad: 'radial-gradient(circle, rgb(235, 183, 42) 0%, rgb(118, 92, 21) 100%)',
        textColor: 'goldenrod',
        showWord: true,
        hasClue: true
    },
    npc: {
        label: 'NPC', class: 'npc', 
        tip: 'You can only use generic words (e.g. \'thing\', \'good\', \'bad\')', 
        grad: 'radial-gradient(circle, rgb(209, 137, 115) 0%, rgb(105, 69, 58) 100%)',
        textColor: 'peru',
        showWord: true 
    },
    monkey: {
        label: 'Monkey', class: 'monkey',
        tip: 'Your word/sentence must contain the letter/number: ',
        grad: 'radial-gradient(circle, rgb(77, 43, 33) 0%, rgb(59, 19, 7) 100%)',
        textColor: 'rgb(53, 35, 16)',
        showWord: true
    },
    annoying: {
        label: 'Annoying', class: 'annoying',
        tip: 'You need to repeat everything your target says right after they do!',
        grad: 'radial-gradient(circle, rgb(223, 255, 0) 0%, rgb(152, 175, 0) 100%)',
        textColor: 'rgb(235, 255, 104)',
        showWord: true,
        hasTarget: true
    }
};

const INNOCENT_CONFIG = {
    label: 'Innocent', class: 'innocent', 
    tip: 'Find the imposter!', 
    grad: 'radial-gradient(circle, rgb(0, 255, 0) 0%, rgb(0, 128, 0) 100%)',
    textColor: 'lime',
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

const getBaseRoleId = (configKey) => configKey.replace(/s$/, '').replace('guardian_angel', 'guardian_angel');

async function fetchData() {
    const fallbackTopic = { id: "local_default", words: ["Error Loading Words"] };

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        let data = null;
        try {
            data = await getWords(controller.signal);
            clearTimeout(timeoutId);
        } catch (error) {
            clearTimeout(timeoutId);
            console.warn("Backend word sync failed or timed out. Swapping to local topics.");
            data = await getWords();
        }

        const selectedTopicId = localStorage.getItem('selected_topic');
        
        if (Array.isArray(data) && data.length > 0) {
            selectedTopic = data.find(t => t.id === selectedTopicId) || data[0];
            words = selectedTopic.words;
            
            if (selectedTopic) {
                const themeName = selectedTopic.name || toTitleCase(selectedTopic.id.replace('_', ' '));
                localStorage.setItem('selected_theme', themeName);
            }
        } else {
            words = fallbackTopic.words;
        }

    } catch (error) {
        console.error("Critical failure during topic parsing initialization:", error);
        words = fallbackTopic.words;
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

    const assessableRoleKeys = Object.keys(ROLE_DATA);

    localStorage.removeItem('inspectorClues');
    localStorage.removeItem('innocents');
    assessableRoleKeys.forEach(roleKey => {
        if (ROLE_DATA[roleKey].hasTarget) {
            localStorage.removeItem(`${getBaseRoleId(roleKey)}Targets`);
        }
    });

    const occupiedIndices = new Set();
    const assignedRolesData = {};

    assessableRoleKeys.forEach(roleKey => {
        const baseId = getBaseRoleId(roleKey);
        assignedRolesData[roleKey] = [];

        const count = parseInt(roleCounts[baseId]) || 0;
        const rawPercent = localStorage.getItem(`${baseId}_percent`) || "100%";
        const spawnChance = parseInt(rawPercent.replace('%', '')) / 100;

        for (let i = 0; i < count; i++) {
            if (occupiedIndices.size >= players.length) break;
            if (Math.random() < spawnChance) {
                let idx;
                do { 
                    idx = Math.floor(Math.random() * players.length); 
                } while (occupiedIndices.has(idx));
                
                occupiedIndices.add(idx);
                assignedRolesData[roleKey].push(players[idx].player_name);
            }
        }
        localStorage.setItem(roleKey, JSON.stringify(assignedRolesData[roleKey]));
    });

    const modifierLists = {};
    Object.keys(ROLE_MODIFIERS).forEach(modKey => {
        modifierLists[modKey] = [];
    });

    if (localStorage.getItem("role_modifers_enabled") === "true" || FORCE_ALL_MODIFIERS) {
        players.forEach(player => {
            const name = player.player_name;

            Object.keys(ROLE_MODIFIERS).forEach(modKey => {
                const modConfig = ROLE_MODIFIERS[modKey];
                
                if (modKey === 'amnesias') {
                    const shapeshifters = assignedRolesData.shapeshifters || [];
                    if (shapeshifters.includes(name)) return;
                }

                const calculatedChance = FORCE_ALL_MODIFIERS ? 1 : modConfig.chance;

                if (Math.random() < calculatedChance) {
                    modifierLists[modKey].push(name);
                }
            });
        });
    }

    Object.keys(ROLE_MODIFIERS).forEach(modKey => {
        localStorage.setItem(modKey, JSON.stringify(modifierLists[modKey]));
    });

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

    assessableRoleKeys.forEach(roleKey => {
        if (ROLE_DATA[roleKey].hasTarget) {
            assignTargets(assignedRolesData[roleKey], `${getBaseRoleId(roleKey)}Targets`);
        }
    });
    
    localStorage.setItem("unselected_shapeshifters", JSON.stringify(assignedRolesData.shapeshifters || []));
}

function displayRole(playerIndex) {
    const players = getStorageJson('current_players');
    const playerName = players[playerIndex - 1]?.player_name || "Unknown";
    
    const roleTitle = document.getElementById('role-title');
    const roleStatus = document.getElementById('role-status');
    const roleTip = document.getElementById('role-tip');
    const wordDisplay = document.getElementById('word');

    const allRoleClasses = [...Object.values(ROLE_DATA).map(r => r.class), ...Object.values(ROLE_MODIFIERS).map(m => m.class), 'innocent', 'hidden'];

    const activeRoleKeys = Object.keys(ROLE_DATA);
    const baseRoleKey = activeRoleKeys.find(key => getStorageJson(key).includes(playerName));
    
    const activeModifiers = Object.keys(ROLE_MODIFIERS).filter(modKey => getStorageJson(modKey).includes(playerName));
    
    const config = ROLE_DATA[baseRoleKey] || INNOCENT_CONFIG;

    let activeUiConfig = config

    function updateUi(configUi, forcedRoleClass = null) {
        roleStatus.classList.remove(...allRoleClasses);
        
        document.querySelectorAll('.modifier-container').forEach(el => el.remove());

        roleTitle.textContent = `Player ${playerIndex} role:`;
        
        // === AMNESIA CONFIG OVERRIDES ===
        const hasAmnesia = activeModifiers.includes('amnesias');
        if (hasAmnesia) {
            roleStatus.textContent = "%?$?£$";
            roleStatus.classList.add('amnesia');

            const darkAmnesiaColor = 'rgb(30, 110, 150)'; 
            roleStatus.style.color = darkAmnesiaColor;
            roleStatus.style.textShadow = `7px 7px 4px rgba(0, 0, 0, 0.4), 6px 6px 10px ${darkAmnesiaColor}`;
            roleDisplay.style.backgroundImage = ROLE_MODIFIERS.amnesias.grad;
            roleTip.textContent = ROLE_MODIFIERS.amnesias.tip;
        } else {
            roleStatus.textContent = configUi.label;
            roleStatus.classList.add(configUi.class);

            const activeColor = configUi.textColor || 'white';
            roleStatus.style.color = activeColor;
            roleStatus.style.textShadow = `7px 7px 4px rgba(0, 0, 0, 0.4), 6px 6px 10px ${activeColor}`;
            roleDisplay.style.backgroundImage = configUi.grad;
            roleTip.textContent = configUi.tip;
        }

        if (document.getElementById("shapeshifter-role-selection")) document.getElementById("shapeshifter-role-selection").remove();

        let displayTheWord = configUi.showWord;
        activeModifiers.forEach(modKey => {
            if (ROLE_MODIFIERS[modKey].overrideWordVisibility) {
                displayTheWord = ROLE_MODIFIERS[modKey].showWord;
            }
        });

        let content = displayTheWord ? selectedWord : '';

        // === THEME VISIBILITY ===
        let displayTheTheme = configUi.showTheme || config.showTheme;
        activeModifiers.forEach(modKey => {
            if (ROLE_MODIFIERS[modKey].showTheme) {
                displayTheTheme = true;
            }
        });

        if (displayTheTheme) {
            const currentTheme = (localStorage.getItem('selected_theme') || "Unknown Theme").replace("_", " ");
            if (content) {
                content += `\nTHEME: ${currentTheme}`;
            } else {
                content = `THEME: ${currentTheme}`;
            }
        }

        Object.keys(ROLE_DATA).forEach(key => {
            if (ROLE_DATA[key].hasTarget) {
                const targets = getStorageJson(`${getBaseRoleId(key)}Targets`, {});
                if (targets[playerName]) {
                    content += `\n\nYOUR TARGET: ${targets[playerName]}`;
                }
            }
        });
        
        wordDisplay.textContent = content;

        activeModifiers.forEach(modKey => {
            const modConfig = ROLE_MODIFIERS[modKey];
            
            const modContainer = document.createElement('div');
            modContainer.className = 'modifier-container';
            modContainer.style.marginTop = '20px';
            modContainer.style.padding = '15px';
            modContainer.style.borderRadius = '10px';
            modContainer.style.background = modConfig.grad;
            modContainer.style.border = `2px solid ${modConfig.textColor}`;

            const modTitle = document.createElement('h4');
            modTitle.className = 'titan-one-regular';
            modTitle.textContent = `MODIFIER: ${modConfig.label.toUpperCase()}`;
            modTitle.style.color = modConfig.textColor;
            modTitle.style.fontSize = '1.5rem';
            modTitle.style.margin = '0 0 10px 0';
            modTitle.style.textShadow = `3px 3px 2px rgba(0,0,0,0.5), 0 0 8px ${modConfig.textColor}`;

            const modTip = document.createElement('p');
            modTip.textContent = modConfig.tip;

            const activeSubColor = modConfig.subTextColor || '#fff';
            modTip.style.color = activeSubColor;
            modTip.style.textShadow = `5px 5px 3px rgba(0, 0, 0, 0.4), 4px 4px 8px ${activeSubColor}`;
            
            modTip.style.margin = '0';
            modTip.style.fontSize = '1.1rem';
            modTip.style.whiteSpace = 'pre-line';

            modContainer.appendChild(modTitle);
            modContainer.appendChild(modTip);

            roleDisplay.insertBefore(modContainer, document.getElementById("word-area-wrapper") || wordDisplay);
        });
    }

    function getInspectorClue() {
        const BlacklistedImposterRoles = Object.keys(ROLE_DATA).filter(k => ROLE_DATA[k].showWord === false);
        const allPlayers = getStorageJson('current_players');
        
        const combinedImposters = [];
        BlacklistedImposterRoles.forEach(key => {
            combinedImposters.push(...getStorageJson(key));
        });

        const nonImposters = allPlayers.filter(p => 
            p.player_name !== playerName && !combinedImposters.includes(p.player_name)
        );

        if (nonImposters.length > 0) {
            const randomIdx = Math.floor(Math.random() * nonImposters.length);
            const clueName = nonImposters[randomIdx].player_name;

            const inspectorClues = getStorageJson('inspectorClues', {});
            inspectorClues[playerName] = clueName;
            localStorage.setItem('inspectorClues', JSON.stringify(inspectorClues));

            return clueName;
        }
        return "No matching players found";
    }

    function getRandomLetter() {
        const characters ='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        return characters.charAt(Math.floor(Math.random() * characters.length));
    }

    if (baseRoleKey === 'monkey') {
        const letter = getRandomLetter();
        activeUiConfig = { 
            ...config, 
            tip: `${ROLE_DATA.monkey.tip}[${letter}]` 
        };
    }

    updateUi(activeUiConfig);

    if (baseRoleKey === 'shapeshifters') {
        const exclude = ["shapeshifter", "hidden", "amnesia", "mime"];
        const selectionContainer = document.createElement('div');
        selectionContainer.id = 'shapeshifter-role-selection';
        selectionContainer.classList.add('shapeshifter-role-selection');

        const addRoleBtn = (roleClass, roleConfigKey, customConfig = null) => {
            const roleBtn = document.createElement('button');
            roleBtn.className = 'titan-one-regular';
            roleBtn.textContent = toTitleCase(roleClass.replace('_', ' '));

            roleBtn.onclick = () => {
                if (roleClass !== 'innocent') {
                    const existingList = getStorageJson(roleConfigKey);
                    if (!existingList.includes(playerName)) {
                        existingList.push(playerName);
                        localStorage.setItem(roleConfigKey, JSON.stringify(existingList));
                    }

                    if (ROLE_DATA[roleConfigKey]?.hasTarget) {
                        const targetKey = `${getBaseRoleId(roleConfigKey)}Targets`;
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
                }

                const currentUnselected = getStorageJson("unselected_shapeshifters").filter(p => p !== playerName);
                localStorage.setItem("unselected_shapeshifters", JSON.stringify(currentUnselected));

                let finalConfig = customConfig || ROLE_DATA[roleConfigKey];
                if (roleConfigKey === 'monkey') {
                    const letter = getRandomLetter();
                    finalConfig = { ...finalConfig, tip: `${ROLE_DATA.monkey.tip}[${letter}]` };
                }
                
                updateUi(finalConfig, roleClass); 

                if (ROLE_DATA[roleConfigKey]?.hasClue) {
                    const wordDisplay = document.getElementById('word');
                    const playerToShow = getInspectorClue();
                    wordDisplay.textContent = wordDisplay.textContent + `\n\nONE NON-IMPOSTER:\n[${playerToShow}]`;
                }
            };
            selectionContainer.appendChild(roleBtn);
        };

        addRoleBtn('innocent', 'innocents', INNOCENT_CONFIG);

        Object.keys(ROLE_DATA)
            .filter(k => !exclude.includes(ROLE_DATA[k].class))
            .forEach(key => addRoleBtn(ROLE_DATA[key].class, key));

        roleDisplay.insertBefore(selectionContainer, document.getElementById("role-tip"));
    } else if (config.hasClue){
        const playerToShow = getInspectorClue();
        wordDisplay.textContent += `\n\nONE NON-IMPOSTER:\n[${playerToShow}]`;
    }
}

function hideRole(playerIndex) {
    sessionStorage.setItem('current_player_is_ready', 'false');
    const roleStatus = document.getElementById('role-status');
    const wordDisplay = document.getElementById('word');

    roleStatus.style.color = '';
    roleStatus.style.textShadow = '';
    
    document.querySelectorAll('.modifier-container').forEach(el => el.remove());

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
        
        const activeRoleKeys = Object.keys(ROLE_DATA).filter(k => k !== 'shapeshifters');
        let foundKey = activeRoleKeys.find(key => getStorageJson(key).includes(name));
        
        const isshapeshifter = getStorageJson('shapeshifters').includes(name);
        const isUnselected = getStorageJson('unselected_shapeshifters').includes(name);

        if (!foundKey && isshapeshifter && isUnselected) {
            foundKey = 'shapeshifters';
        }

        let roleName = foundKey ? ROLE_DATA[foundKey].label : 'Innocent';
        let roleExtra = '';
        
        if (isshapeshifter && !isUnselected) {
            roleExtra += ' (Shapeshifter)';
        }
        
        Object.keys(ROLE_MODIFIERS).forEach(modKey => {
            if (getStorageJson(modKey).includes(name)) {
                roleExtra += ` [${ROLE_MODIFIERS[modKey].label.toUpperCase()}]`;
            }
        });
        
        Object.keys(ROLE_DATA).forEach(key => {
            if (ROLE_DATA[key].hasTarget) {
                const target = getStorageJson(`${getBaseRoleId(key)}Targets`, {})[name];
                if (target) roleExtra += ` [TARGET: ${target}]`;
            }
        });

        const inspectorClues = getStorageJson('inspectorClues', {});
        if (inspectorClues[name]) {
            roleExtra += ` [CLUE: ${inspectorClues[name]}]`;
        }

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

    const dynamicCounts = {};
    Object.keys(ROLE_DATA).forEach(key => {
        const baseId = getBaseRoleId(key);
        dynamicCounts[baseId] = localStorage.getItem(`${baseId}_count`);
    });

    decidePlayerList(localStorage.getItem('current_players'), dynamicCounts);
    
    selectedWord = createSelectedWord();
    hideRole(currentIndex);
}

document.getElementById('ready-button').addEventListener('click', () => {
    const players = getStorageJson('current_players');
    const name = players[currentIndex - 1]?.player_name;
    const isUnselectedshapeshifter = getStorageJson('unselected_shapeshifters').includes(name);

    if (isUnselectedshapeshifter && !document.getElementById('role-status').classList.contains('hidden')) {
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