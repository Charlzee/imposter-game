import getWords from './words.js';
import { getURLParameter, getRandomInt, toTitleCase, getRandomLetter } from '../js/global.js';
import { ROLE_MODIFIERS_LOCAL, ROLE_DATA_LOCAL, INNOCENT_CONFIG, getBaseRoleId } from './roles.js';

// === DEBUG ===
const FORCE_ALL_MODIFIERS = false;

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

    const assessableRoleKeys = Object.keys(ROLE_DATA_LOCAL);

    localStorage.removeItem('inspectorClues');
    localStorage.removeItem('innocents');
    assessableRoleKeys.forEach(roleKey => {
        if (ROLE_DATA_LOCAL[roleKey].hasTarget) {
            localStorage.removeItem(`${getBaseRoleId(roleKey)}Targets`);
        }
    });
    Object.keys(ROLE_MODIFIERS_LOCAL).forEach(modKey => {
        if (ROLE_MODIFIERS_LOCAL[modKey].hasTarget) {
            localStorage.removeItem(`${getBaseRoleId(modKey)}Targets`);
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
    Object.keys(ROLE_MODIFIERS_LOCAL).forEach(modKey => {
        modifierLists[modKey] = [];
    });

    if (localStorage.getItem("role_modifers_enabled") === "true" || FORCE_ALL_MODIFIERS) {
        players.forEach(player => {
            const name = player.player_name;

            Object.keys(ROLE_MODIFIERS_LOCAL).forEach(modKey => {
                const modConfig = ROLE_MODIFIERS_LOCAL[modKey];
                
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

    Object.keys(ROLE_MODIFIERS_LOCAL).forEach(modKey => {
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
        if (ROLE_DATA_LOCAL[roleKey].hasTarget) {
            assignTargets(assignedRolesData[roleKey], `${getBaseRoleId(roleKey)}Targets`);
        }
    });
    Object.keys(ROLE_MODIFIERS_LOCAL).forEach(modKey => {
        if (ROLE_MODIFIERS_LOCAL[modKey].hasTarget) {
            assignTargets(modifierLists[modKey], `${getBaseRoleId(modKey)}Targets`);
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

    const allRoleClasses = [...Object.values(ROLE_DATA_LOCAL).map(r => r.class), ...Object.values(ROLE_MODIFIERS_LOCAL).map(m => m.class), 'innocent', 'hidden'];

    const activeRoleKeys = Object.keys(ROLE_DATA_LOCAL);
    const baseRoleKey = activeRoleKeys.find(key => getStorageJson(key).includes(playerName));

    const activeModifiers = Object.keys(ROLE_MODIFIERS_LOCAL).filter(modKey => getStorageJson(modKey).includes(playerName));

    const config = ROLE_DATA_LOCAL[baseRoleKey] || INNOCENT_CONFIG;

    let activeUiConfig = config;

    // === MODIFIER UI OVERRIDE ===
    const overridingModifierKey = activeModifiers.find(modKey => ROLE_MODIFIERS_LOCAL[modKey].overrideRoleDisplay);
    if (overridingModifierKey) {
        activeUiConfig = ROLE_MODIFIERS_LOCAL[overridingModifierKey];
    }

    function getRandomLetter() {
        const characters ='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        return characters.charAt(Math.floor(Math.random() * characters.length));
    }

    function updateUi(configUi, forcedRoleClass = null) {
        roleStatus.classList.remove(...allRoleClasses);
        
        document.getElementById('modifiers-wrapper')?.remove();

        roleTitle.textContent = `Player ${playerIndex} role:`;
        
        roleStatus.textContent = configUi.displayLabel || configUi.label;
        roleStatus.classList.add(configUi.class);

        const activeColor = configUi.textColor || 'white';
        roleStatus.style.color = activeColor;
        roleStatus.style.textShadow = '0 2px 10px #00000080';
        
        roleDisplay.style.backgroundImage = configUi.image ? `url(${configUi.image})` : configUi.grad;
        if (configUi.image) {
            roleDisplay.style.backgroundSize = 'cover';
            roleDisplay.style.backgroundPosition = 'center';
        } else {
            roleDisplay.style.backgroundSize = '';
        }

        roleTip.textContent = configUi.tip;

        if (document.getElementById("shapeshifter-role-selection")) document.getElementById("shapeshifter-role-selection").remove();

        let displayTheWord = configUi.showWord;
        activeModifiers.forEach(modKey => {
            if (ROLE_MODIFIERS_LOCAL[modKey].overrideWordVisibility) {
                displayTheWord = ROLE_MODIFIERS_LOCAL[modKey].showWord;
            }
        });

        let content = displayTheWord ? selectedWord : '';

        // === PUBLIC ROLES REVEAL ===
        Object.keys(ROLE_DATA_LOCAL).forEach(roleKey => {
            const roleCfg = ROLE_DATA_LOCAL[roleKey];
            if (roleCfg.revealRoleToInnocents) {
                const publicPlayers = getStorageJson(roleKey);
                publicPlayers.forEach(pName => {
                    if (playerName !== pName && (!baseRoleKey || baseRoleKey === 'innocents')) {
                        content += (content ? '\n\n' : '') + `THE ${roleCfg.label.toUpperCase()} IS: ${pName}`;
                    }
                });
            }
        });

        // === THEME VISIBILITY ===
        let displayTheTheme = configUi.showTheme || config.showTheme;
        activeModifiers.forEach(modKey => {
            if (ROLE_MODIFIERS_LOCAL[modKey].showTheme) {
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

        Object.keys(ROLE_DATA_LOCAL).forEach(key => {
            const config = ROLE_DATA_LOCAL[key];
            if (config.hasTarget) {
                const targets = getStorageJson(`${getBaseRoleId(key)}Targets`, {});
                if (targets[playerName]) {
                    content += `\n\nYOUR TARGET: ${targets[playerName]}`;
                }
            }
        });

        wordDisplay.textContent = content;

        let modsWrapper = null;
        if (activeModifiers.length > 0) {
            modsWrapper = document.createElement('div');
            modsWrapper.id = 'modifiers-wrapper';
            modsWrapper.style.display = 'flex';
            modsWrapper.style.flexWrap = 'wrap';
            modsWrapper.style.justifyContent = 'center';
            modsWrapper.style.gap = '15px';
            modsWrapper.style.width = '100%';
            modsWrapper.style.marginTop = '20px';
            modsWrapper.style.marginBottom = '20px';
            roleDisplay.insertBefore(modsWrapper, document.getElementById("word-area-wrapper") || wordDisplay);
        }

        activeModifiers.forEach(modKey => {
            const modConfig = ROLE_MODIFIERS_LOCAL[modKey];
            
            const modContainer = document.createElement('div');
            modContainer.className = 'modifier-container';
            modContainer.style.flex = '0 1 auto';
            modContainer.style.minWidth = '250px';
            modContainer.style.maxWidth = '400px';
            modContainer.style.padding = '15px';
            modContainer.style.borderRadius = '10px';
            
            modContainer.style.backgroundImage = (modConfig.image && !modConfig.overrideRoleDisplay) ? `url(${modConfig.image})` : modConfig.grad;
            if (modConfig.image && !modConfig.overrideRoleDisplay) {
                modContainer.style.backgroundSize = 'cover';
                modContainer.style.backgroundPosition = 'center';
            }
            modContainer.style.border = `2px solid ${modConfig.textColor}`;

            const modTitle = document.createElement('h4');
            modTitle.className = 'titan-one-regular';
            modTitle.textContent = `Modifier: ${modConfig.label}`;
            modTitle.style.color = modConfig.textColor;
            modTitle.style.fontSize = '1.5rem';
            modTitle.style.margin = '0 0 10px 0';
            modTitle.style.textShadow = '0 2px 4px #00000080';

            const modTip = document.createElement('p');
            
            let tipText = modConfig.tip;
            if (modConfig.appendRandomLetter) {
                tipText += `[${getRandomLetter()}]`;
            }

            if (modConfig.hasTarget) {
                const targets = getStorageJson(`${getBaseRoleId(modKey)}Targets`, {});
                const targetName = targets[playerName];
                if (targetName) {
                    tipText += `\n\nYOUR TARGET: ${targetName}`;
                }
            }

            modTip.textContent = tipText;
            const activeSubColor = modConfig.subTextColor || '#fff';
            modTip.style.color = activeSubColor;
            modTip.style.textShadow = '0 1px 3px #00000066';
            
            modTip.style.margin = '0';
            modTip.style.fontSize = '1.1rem';
            modTip.style.whiteSpace = 'pre-line';

            modContainer.appendChild(modTitle);
            modContainer.appendChild(modTip);

            modsWrapper.appendChild(modContainer);
        });
    }

    function getInspectorClue() {
        const BlacklistedImposterRoles = Object.keys(ROLE_DATA_LOCAL).filter(k => ROLE_DATA_LOCAL[k].showWord === false);
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

    // Run standard initial setup UI
    updateUi(activeUiConfig);

    if (config.isShapeshifter) {
        const selectionList = document.createElement('div');
        selectionList.id = 'roles-list'; 
        selectionList.style.marginTop = '30px';

        const selectableRoles = Object.keys(ROLE_DATA_LOCAL).filter(k => ROLE_DATA_LOCAL[k].selectable);

        selectableRoles.forEach(roleKey => {
            const roleCfg = ROLE_DATA_LOCAL[roleKey];
            const roleBtn = document.createElement('div');
            roleBtn.className = 'player-view-role';
            roleBtn.textContent = roleCfg.label;
            roleBtn.style.background = roleCfg.grad;

            roleBtn.onclick = () => {
                if (roleKey !== 'innocents') {
                    const roleConfigKey = roleKey;
                    const existingList = getStorageJson(roleConfigKey);
                    if (!existingList.includes(playerName)) {
                        existingList.push(playerName);
                        localStorage.setItem(roleConfigKey, JSON.stringify(existingList));
                    }

                    if (ROLE_DATA_LOCAL[roleConfigKey]?.hasTarget) {
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

                updateUi(roleCfg); 
                selectionList.remove();

                if (roleCfg.hasClue) {
                    const wordDisplay = document.getElementById('word');
                    const playerToShow = getInspectorClue();
                    wordDisplay.textContent = wordDisplay.textContent + `\n\nONE NON-IMPOSTER:\n${playerToShow}`;
                }
            };
            selectionList.appendChild(roleBtn);
        });

        roleDisplay.insertBefore(selectionList, document.getElementById("role-tip"));
    } else if (config.hasClue){
        const playerToShow = getInspectorClue();
        wordDisplay.textContent += `\n\nONE NON-IMPOSTER:\n${playerToShow}`;
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
    roleDisplay.style.backgroundImage = 'radial-gradient(circle, #FFFF00 0%, #808000 100%)';
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
    listContainer.style.width = '100%';
    listContainer.style.display = 'flex';
    listContainer.style.flexWrap = 'wrap';
    listContainer.style.justifyContent = 'center';
    listContainer.style.gap = '15px';
    listContainer.style.marginTop = '20px';

    const wordInfo = document.createElement('div');
    wordInfo.id = 'word-display';
    wordInfo.textContent = `Word: ${selectedWord}`;
    main.insertBefore(wordInfo, document.getElementById('view-roles'));

    players.forEach(p => {
        const el = document.createElement('div');
        el.className = 'player-view-role';
        const name = p.player_name;
        
        const activeRoleKeys = Object.keys(ROLE_DATA_LOCAL).filter(k => k !== 'shapeshifters');
        let foundKey = activeRoleKeys.find(key => getStorageJson(key).includes(name));
        
        const isshapeshifter = getStorageJson('shapeshifters').includes(name);
        const isUnselected = getStorageJson('unselected_shapeshifters').includes(name);

        if (!foundKey && isshapeshifter && isUnselected) {
            foundKey = 'shapeshifters';
        }

        const roleConfig = (foundKey && ROLE_DATA_LOCAL[foundKey]) ? ROLE_DATA_LOCAL[foundKey] : INNOCENT_CONFIG;

        // Main player row container
        el.style.background = 'rgba(255, 255, 255, 0.05)';
        el.style.marginBottom = '15px';
        el.style.padding = '15px';
        el.style.borderRadius = '15px';
        el.style.border = '1px solid rgba(255, 255, 255, 0.1)';
        el.style.display = 'flex';
        el.style.flexDirection = 'column';
        el.style.alignItems = 'center';
        el.style.height = 'auto';
        el.style.minHeight = 'fit-content';
        el.style.width = 'fit-content';
        el.style.minWidth = '220px';
        el.style.margin = '0'; 
        el.style.boxSizing = 'border-box';
        el.style.wordBreak = 'break-word';
        el.style.gap = '10px';

        // Player Name
        const nameSpan = document.createElement('span');
        nameSpan.textContent = name;
        nameSpan.style.fontSize = '1.2rem';
        nameSpan.style.fontWeight = 'bold';
        nameSpan.style.color = 'white';
        nameSpan.style.textAlign = 'center';
        nameSpan.style.width = '100%';
        el.appendChild(nameSpan);

        // Wrapper for badges
        const badgeWrapper = document.createElement('div');
        badgeWrapper.style.display = 'flex';
        badgeWrapper.style.flexWrap = 'wrap';
        badgeWrapper.style.justifyContent = 'center';
        badgeWrapper.style.gap = '8px';
        badgeWrapper.style.width = '100%';

        const createBadge = (label, config) => {
            const badge = document.createElement('div');
            badge.textContent = label.toUpperCase();
            badge.style.background = config.grad;
            badge.style.color = config.textColor || 'white';
            badge.style.padding = '6px 14px';
            badge.style.borderRadius = '10px';
            badge.style.fontSize = '1.1rem';
            badge.style.fontWeight = 'bold';
            badge.style.textShadow = '0 1px 2px rgba(0,0,0,0.5)';
            badge.style.border = `1px solid ${config.textColor === 'white' ? 'rgba(255,255,255,0.3)' : config.textColor}`;
            badge.style.wordBreak = 'break-word';
            badge.className = 'titan-one-regular'
            return badge;
        };

        // Add Role Badge
        const roleName = foundKey ? ROLE_DATA_LOCAL[foundKey].label : 'Innocent';
        badgeWrapper.appendChild(createBadge(roleName, roleConfig));

        // Add Modifier Badges
        Object.keys(ROLE_MODIFIERS_LOCAL).forEach(modKey => {
            if (getStorageJson(modKey).includes(name)) {
                badgeWrapper.appendChild(createBadge(ROLE_MODIFIERS_LOCAL[modKey].label, ROLE_MODIFIERS_LOCAL[modKey]));
            }
        });

        el.appendChild(badgeWrapper);

        let roleExtra = '';
        
        if (isshapeshifter && !isUnselected) {
            roleExtra += ' (Shapeshifter)';
        }
        
        Object.keys(ROLE_DATA_LOCAL).forEach(key => {
            if (ROLE_DATA_LOCAL[key].hasTarget) {
                const target = getStorageJson(`${getBaseRoleId(key)}Targets`, {})[name];
                if (target) roleExtra += ` [TARGET: ${target}]`;
            }
        });

        const inspectorClues = getStorageJson('inspectorClues', {});
        if (inspectorClues[name]) {
            roleExtra += ` [CLUE: ${inspectorClues[name]}]`;
        }

        if (roleExtra) {
            const extraEl = document.createElement('div');
            extraEl.textContent = roleExtra.trim();
            extraEl.style.fontSize = '0.85rem';
            extraEl.style.opacity = '0.7';
            extraEl.style.textAlign = 'center';
            extraEl.style.width = '100%';
            extraEl.style.overflowWrap = 'break-word';
            el.appendChild(extraEl);
        }

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
    Object.keys(ROLE_DATA_LOCAL).forEach(key => {
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
