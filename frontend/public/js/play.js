// Import game logic and constants
import getWords from './words.js';
import { getURLParameter, getRandomInt, toTitleCase, getRandomLetter, getRandomLetterOrNumber } from '../js/global.js';
import { ROLE_MODIFIERS, ROLE_DATA, INNOCENT_CONFIG, getBaseRoleId, RANDOM_EVENTS } from './roles.js';

// === DEBUG ===
const FORCE_ALL_MODIFIERS = false;

// ==== GLOBAL STATE ====
let data, selectedTopic, words, selectedWord = null;
let currentIndex = 1;
let viewingRoles = false;
let gameTimer = null;
const main = document.getElementById('main');
const roleDisplay = document.getElementById('role-display');

// Retrieve JSON data from localStorage
const getStorageJson = (key, fallback = []) => JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));


// Load word topics and select one
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

// Pick a random secret word
function createSelectedWord() {
    const word = words[getRandomInt(words.length)];
    localStorage.setItem('selected_word', btoa(encodeURIComponent(word)));
    return word;
}

// Randomly assign roles and modifiers
function decidePlayerList(playersJson, roleCounts = {}) {
    const players = JSON.parse(playersJson || '[]');
    if (!players.length) return;

    console.log(localStorage)

    const assessableRoleKeys = Object.keys(ROLE_DATA);
    const activeEvents = [];
    if (localStorage.getItem("random_events_enabled") === "true") {
        Object.keys(RANDOM_EVENTS).forEach(k => {
            const saved = localStorage.getItem(`event_${k}_percent`);
            const chance = saved ? parseFloat(saved) / 100 : (RANDOM_EVENTS[k].chance || 0.05);
            if (Math.random() < chance) activeEvents.push(k);
        });
    }
    localStorage.setItem('active_random_events', JSON.stringify(activeEvents));

    const assignedRolesData = {};
    Object.keys(ROLE_DATA).forEach(k => assignedRolesData[k] = []);
    const modifierLists = {};
    Object.keys(ROLE_MODIFIERS).forEach(k => modifierLists[k] = []);

    const helpers = {
        setRole: (playerIdx, roleKey) => {
            const player = players[playerIdx];
            if (!player) return;
            Object.keys(assignedRolesData).forEach(k => {
                assignedRolesData[k] = assignedRolesData[k].filter(n => n !== player.player_name);
            });
            if (assignedRolesData[roleKey]) assignedRolesData[roleKey].push(player.player_name);
        },
        addModifier: (playerIdx, modKey) => {
            const player = players[playerIdx];
            if (player && modifierLists[modKey] && !modifierLists[modKey].includes(player.player_name)) {
                modifierLists[modKey].push(player.player_name);
            }
        }
    };

    const runDefaultRoleAssignment = () => {
        const subImposterRoles = Object.keys(ROLE_DATA).filter(k => 
            ROLE_DATA[k].roleType === 'imposter' && k !== 'imposters'
        );

        const occupiedIndices = new Set();
        Object.keys(ROLE_DATA).forEach(roleKey => {
            if (subImposterRoles.includes(roleKey)) return;

            const baseId = getBaseRoleId(roleKey);
            const count = parseInt(roleCounts[baseId]) || 0;
            const chance = parseFloat((localStorage.getItem(`${baseId}_percent`) || "100%").replace('%', '')) / 100;
            for (let i = 0; i < count; i++) {
                if (occupiedIndices.size >= players.length) break;
                if (Math.random() < chance) {
                    let idx; do { idx = Math.floor(Math.random() * players.length); } while (occupiedIndices.has(idx));
                    occupiedIndices.add(idx);
                    assignedRolesData[roleKey].push(players[idx].player_name);
                }
            }
        });
    };

    const runDefaultModifierAssignment = () => {
        if (localStorage.getItem("role_modifers_enabled") === "true" || FORCE_ALL_MODIFIERS) {
            players.forEach((p, idx) => {
                Object.keys(ROLE_MODIFIERS).forEach(modKey => {
                    if (modKey === 'amnesias') {
                        const roleKey = Object.keys(assignedRolesData).find(rk => (assignedRolesData[rk] || []).includes(p.player_name));
                        if (ROLE_DATA[roleKey]?.immuneToAmnesia) return;
                    }

                    const saved = localStorage.getItem(`${modKey}_percent`);
                    const chance = FORCE_ALL_MODIFIERS ? 1 : (saved ? parseFloat(saved) / 100 : ROLE_MODIFIERS[modKey].chance);
                    if (Math.random() < chance) helpers.addModifier(idx, modKey);
                });
            });
        }
    };

    const upgradeImposters = () => {
        const subImposterRoles = Object.keys(ROLE_DATA).filter(k => 
            ROLE_DATA[k].roleType === 'imposter' && k !== 'imposters'
        );
        const baseImposterNames = [...assignedRolesData['imposters']];
        assignedRolesData['imposters'] = [];

        baseImposterNames.forEach(name => {
            let roleToAssign = 'imposters';
            for (const subKey of subImposterRoles) {
                const subBaseId = getBaseRoleId(subKey);
                const subChanceStr = localStorage.getItem(`${subBaseId}_percent`) || "0%";
                const subChance = parseFloat(subChanceStr.replace('%', '')) / 100;
                if (Math.random() < subChance) {
                    roleToAssign = subKey;
                    break;
                }
            }
            assignedRolesData[roleToAssign].push(name);
        });
    };

    if (!activeEvents.some(k => RANDOM_EVENTS[k]?.skipDefaultAssignment)) runDefaultRoleAssignment();

    activeEvents.forEach(eventKey => {
        const event = RANDOM_EVENTS[eventKey];
        if (event?.onTrigger) event.onTrigger({ players, assignedRolesData, modifierLists, ...helpers });
    });

    upgradeImposters();

    runDefaultModifierAssignment();

    localStorage.removeItem('inspectorClues');
    localStorage.removeItem('innocents');
    Object.keys(ROLE_DATA).forEach(k => { if (ROLE_DATA[k].hasTarget) localStorage.removeItem(`${getBaseRoleId(k)}Targets`); });
    Object.keys(ROLE_MODIFIERS).forEach(k => { if (ROLE_MODIFIERS[k].hasTarget) localStorage.removeItem(`${getBaseRoleId(k)}Targets`); });
    Object.keys(ROLE_DATA).forEach(k => { if (ROLE_DATA[k].selectPlayer) localStorage.removeItem(`${getBaseRoleId(k)}SelectedTargets`); });


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
        localStorage.setItem(roleKey, JSON.stringify(assignedRolesData[roleKey]));
        if (ROLE_DATA[roleKey].hasTarget) assignTargets(assignedRolesData[roleKey], `${getBaseRoleId(roleKey)}Targets`);
    });

    Object.keys(ROLE_MODIFIERS).forEach(modKey => {
        localStorage.setItem(modKey, JSON.stringify(modifierLists[modKey]));
        if (ROLE_MODIFIERS[modKey].hasTarget) assignTargets(modifierLists[modKey], `${getBaseRoleId(modKey)}Targets`);
    });
    
    localStorage.setItem("unselected_shapeshifters", JSON.stringify(assignedRolesData.shapeshifters || []));
}

// Update the role card UI
function displayRole(playerIndex) {
    const players = getStorageJson('current_players');
    const playerName = players[playerIndex - 1]?.player_name || "Unknown";

    const roleTitle = document.getElementById('role-title');
    const roleStatus = document.getElementById('role-status');
    const roleTip = document.getElementById('role-tip');
    const wordDisplay = document.getElementById('word');

    const allRoleClasses = [...Object.values(ROLE_DATA).map(r => r.class), ...Object.values(ROLE_MODIFIERS).map(m => m.class), 'innocent', 'hidden'];

    const activeRoleKeys = Object.keys(ROLE_DATA).filter(k => k !== 'shapeshifters');
    let baseRoleKey = activeRoleKeys.find(key => getStorageJson(key).includes(playerName));
    const isUnselected = getStorageJson('unselected_shapeshifters').includes(playerName);
    if (!baseRoleKey && getStorageJson('shapeshifters').includes(playerName) && isUnselected) {
        baseRoleKey = 'shapeshifters';
    }

    const activeModifiers = Object.keys(ROLE_MODIFIERS).filter(modKey => getStorageJson(modKey).includes(playerName));

    const config = ROLE_DATA[baseRoleKey] || INNOCENT_CONFIG;

    let activeUiConfig = config;

    const overridingModifierKey = activeModifiers.find(modKey => ROLE_MODIFIERS[modKey].overrideRoleDisplay);
    if (overridingModifierKey) {
        activeUiConfig = ROLE_MODIFIERS[overridingModifierKey];
    }

    function updateUi(configUi, forcedRoleClass = null) {
        roleStatus.classList.remove(...allRoleClasses);
        
        document.getElementById('modifiers-wrapper')?.remove();
        document.getElementById('roles-list')?.remove();

        // Display roleType above the role name
        if (!overridingModifierKey){
            let roleTypeEl = document.getElementById('role-type');
            if (!roleTypeEl) {
                roleTypeEl = document.createElement('div');
                roleTypeEl.id = 'role-type';
                roleStatus.parentNode.insertBefore(roleTypeEl, roleStatus);
            }
            roleTypeEl.innerHTML = configUi.roleType ? `TYPE: ${configUi.roleType}` : '';
        }

        roleTitle.innerHTML = `Player ${playerIndex} role:`;
        
        roleStatus.innerHTML = configUi.displayLabel || configUi.label;
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

        roleTip.innerHTML = configUi.tip;

        let displayTheWord = configUi.showWord;
        activeModifiers.forEach(modKey => {
            if (ROLE_MODIFIERS[modKey].overrideWordVisibility) {
                displayTheWord = ROLE_MODIFIERS[modKey].showWord;
            }
        });

        let content = '';
        if (configUi.showsOtherWords && words && words.length > 0) {
            const otherWords = words.filter(w => w !== selectedWord);
            const shuffledOthers = [...otherWords].sort(() => 0.5 - Math.random());
            const selection = [selectedWord, ...shuffledOthers.slice(0, 4)];
            const finalDisplay = selection.sort(() => 0.5 - Math.random());
            content = `ONE OF THESE IS THE WORD:\n- ${finalDisplay.join('\n- ')}`;
        } else {
            content = displayTheWord ? selectedWord : '';
        }

        // === ROLES REVEAL ===
        Object.keys(ROLE_DATA).forEach(roleKey => {
            const roleCfg = ROLE_DATA[roleKey];
            if (roleCfg.revealRoleToInnocents) {
                const publicPlayers = getStorageJson(roleKey);
                publicPlayers.forEach(pName => {
                    if (playerName !== pName && (!baseRoleKey || baseRoleKey === 'innocents')) {
                        content += (content ? '\n\n' : '') + `THE ${roleCfg.label.toUpperCase()} IS: ${pName}`;
                    }
                });
            }
        });

        // === PLUS INNOCENT REVEAL ===
        const plusPlayers = getStorageJson('plus');
        plusPlayers.forEach(pName => {
            const roleKeys = Object.keys(ROLE_DATA).filter(k => k !== 'shapeshifters');
            let pRoleKey = roleKeys.find(rk => getStorageJson(rk).includes(pName));
            if (!pRoleKey && getStorageJson('shapeshifters').includes(pName) && getStorageJson('unselected_shapeshifters').includes(pName)) {
                pRoleKey = 'shapeshifters';
            }

            const isActuallyInnocent = (!pRoleKey || pRoleKey === 'innocents') && !getStorageJson('shapeshifters').includes(pName);

            if (isActuallyInnocent && playerName !== pName && (!baseRoleKey || baseRoleKey === 'innocents')) {
                content += (content ? '\n\n' : '') + `CONFIRMED INNOCENT [Plus Ability]: ${pName}`;
            }
        });

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
            const config = ROLE_DATA[key];
            if (config.hasTarget) {
                const targets = getStorageJson(`${getBaseRoleId(key)}Targets`, {});
                if (targets[playerName]) {
                    content += `\n\nYOUR TARGET: ${targets[playerName]}`;
                }
            }
        });

        wordDisplay.innerHTML = content;

        // === CUSTOM PLAYER SELECTION ===
        if (config.selectPlayer) {
            const storageKey = `${getBaseRoleId(baseRoleKey)}SelectedTargets`;
            const targets = getStorageJson(storageKey, {});
            if (!targets[playerName]) {
                const selectionList = document.createElement('div');
                selectionList.id = 'roles-list';
                if (config.selectionListColor) selectionList.style.background = config.selectionListColor;
                const promptText = config.selectionText || (config.revealText ? `SELECT SOMEONE TO MAKE THEM \"${config.revealText}\"` : 'SELECT A PLAYER');
                selectionList.innerHTML = `<h3 class="titan-one-regular" style="color: ${config.textColor || '#fff'}; width: 100%; text-align: center; margin-bottom: 10px; text-shadow: 5px 5px 3px rgba(0,0,0,0.5);">${promptText}</h3>`;

                const players = getStorageJson('current_players');
                players.forEach(p => {
                    if (p.player_name === playerName && !config.canSelectSelf) return;
                    const btn = document.createElement('div');
                    btn.className = 'player-view-role';
                    btn.innerHTML = p.player_name;
                    btn.style.background = config.grad;
                    btn.onclick = () => {
                        targets[playerName] = p.player_name;
                        localStorage.setItem(storageKey, JSON.stringify(targets));
                        displayRole(playerIndex); // Refresh card
                    };
                    selectionList.appendChild(btn);
                });
                roleDisplay.insertBefore(selectionList, document.getElementById("role-tip"));
            } else {
                wordDisplay.innerHTML += `\n\nSELECTED PLAYER: ${targets[playerName]}`;
            }
        }

        let modsWrapper = null;
        if (activeModifiers.length > 0) {
            modsWrapper = document.createElement('div');
            modsWrapper.id = 'modifiers-wrapper';
            roleDisplay.insertBefore(modsWrapper, document.getElementById("word-area-wrapper") || wordDisplay);
        }

        activeModifiers.forEach(modKey => {
            const modConfig = ROLE_MODIFIERS[modKey];
            
            const modContainer = document.createElement('div');
            modContainer.className = 'modifier-container';
            
            modContainer.style.backgroundImage = (modConfig.image && !modConfig.overrideRoleDisplay) ? `url(${modConfig.image})` : modConfig.grad;
            if (modConfig.image && !modConfig.overrideRoleDisplay) {
                modContainer.style.backgroundSize = 'cover';
                modContainer.style.backgroundPosition = 'center';
            }
            modContainer.style.border = `2px solid ${modConfig.textColor}`;

            const modTitle = document.createElement('h4');
            modTitle.className = 'titan-one-regular';
            modTitle.id = 'mod-title'
            modTitle.innerHTML = `Modifier: ${modConfig.label}`;
            modTitle.style.color = modConfig.textColor;

            const modTip = document.createElement('p');
            modTip.id = 'mod-tip'

            let tipText = modConfig.tip;
            if (modConfig.appendRandomLetter) {
                tipText += `[${getRandomLetter()}]`;
            }
            if (modConfig.appendRandomLetterOrNumber) {
                tipText += `[${getRandomLetterOrNumber()}]`;
            }

            if (modConfig.isPlus) {
                const wasShapeshifter = getStorageJson('shapeshifters').includes(playerName);
                const playerRole = wasShapeshifter ? 'shapeshifters' : (baseRoleKey || 'innocents');
                tipText += '\n\n<span style="text-decoration: underline;">PLUS ABILITY:</span>\n';
                roleStatus.innerHTML += `<span style="color: #29D1FF; font-weight: bold; font-size: 150%;"> +</span>`

                if (playerRole === "innocents") {
                    tipText += `[All other innocents know you are innocent]`
                } else if (playerRole === "imposters") {
                    tipText += `[Your final vote count will be 1 less]`
                } else if (playerRole === "shapeshifters") {
                    if (getStorageJson('unselected_shapeshifters').includes(playerName)) {
                        tipText += `[You can select 1 extra role modifier to have]`
                    } else {
                        tipText += `[Used to select extra modifier]`
                    }
                } else if (playerRole === "divine_art") {
                    tipText += `[You can redirect any votes cast onto you]`
                } else {
                    tipText += `[NONE]`
                }
            }

            if (modConfig.hasTarget) {
                const targets = getStorageJson(`${getBaseRoleId(modKey)}Targets`, {});
                const targetName = targets[playerName];
                if (targetName) {
                    tipText += `\n\nYOUR TARGET: ${targetName}`;
                }
            }

            modTip.innerHTML = tipText;
            const activeSubColor = modConfig.subTextColor || '#fff';
            modTip.style.color = activeSubColor;

            modContainer.appendChild(modTitle);
            modContainer.appendChild(modTip);

            modsWrapper.appendChild(modContainer);
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

    updateUi(activeUiConfig);

    if (config.isShapeshifter) {
        const selectionList = document.createElement('div');
        selectionList.id = 'roles-list'; 
        if (config.selectionListColor) selectionList.style.background = config.selectionListColor;
        selectionList.style.marginTop = '30px';

        const selectableRoles = Object.keys(ROLE_DATA).filter(k => ROLE_DATA[k].selectable);

        selectableRoles.forEach(roleKey => {
            const roleCfg = ROLE_DATA[roleKey];
            const roleBtn = document.createElement('div');
            const isPlus = activeModifiers.some(m => ROLE_MODIFIERS[m].isPlus);
            
            roleBtn.className = 'player-view-role';
            roleBtn.innerHTML = roleCfg.label;
            roleBtn.style.background = roleCfg.grad;

            roleBtn.onclick = () => {
                if (roleKey !== 'innocents') {
                    const roleConfigKey = roleKey;
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

                if (isPlus) {
                    // Transitions to Modifier Selection for plus ability
                    selectionList.innerHTML = '<h3 class="titan-one-regular" style="color: #29D1FF; width: 100%; text-align: center; margin-bottom: 15px; font-weight: bold;">SELECT EXTRA MODIFIER</h3>';
                    
                    const plusCfg = ROLE_MODIFIERS['plus'];
                    if (plusCfg && plusCfg.selectionListColor) {
                        selectionList.style.background = plusCfg.selectionListColor;
                    }

                    Object.keys(ROLE_MODIFIERS).forEach(modKey => {
                        const modCfg = ROLE_MODIFIERS[modKey];
                        // Skip plus
                        if (modCfg.isPlus || modKey === 'amnesias' || modKey === 'happy' || modKey === 'cheater') return;
                        
                        const modBtn = document.createElement('div');
                        modBtn.className = 'player-view-role';
                        modBtn.innerHTML = modCfg.label;
                        modBtn.style.background = modCfg.grad;
                        
                        modBtn.onclick = (e) => {
                            e.stopPropagation();
                            const modStorage = getStorageJson(modKey);
                            if (!modStorage.includes(playerName)) {
                                modStorage.push(playerName);
                                localStorage.setItem(modKey, JSON.stringify(modStorage));
                            }
                            
                            // Setup target logic if the selected modifier requires it
                            if (modCfg.hasTarget) {
                                const targetKey = `${getBaseRoleId(modKey)}Targets`;
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

                            selectionList.remove();
                            displayRole(playerIndex); // Refresh card with new modifier
                        };
                        selectionList.appendChild(modBtn);
                    });
                } else {
                    displayRole(playerIndex);
                }
            };
            selectionList.appendChild(roleBtn);
        });

        roleDisplay.insertBefore(selectionList, document.getElementById("role-tip"));
    } else if (config.hasClue){
        const playerToShow = getInspectorClue();
        wordDisplay.innerHTML += `\n\nONE NON-IMPOSTER:\n${playerToShow}`;
    }

    if (config.isGambler) { // Gamble logic
        let gambleContainer = document.getElementById('gamble-container');
        let gambleBtn;
        let gambleHistory;

        if (!gambleContainer) {
            gambleContainer = document.createElement('div');
            gambleContainer.id = 'gamble-container';

            gambleBtn = document.createElement('button');
            gambleBtn.id = 'gamble-btn';
            gambleBtn.className = 'titan-one-regular';
            gambleBtn.innerHTML = 'Gamble';

            gambleHistory = document.createElement('div');
            gambleHistory.id = 'gamble-history';

            gambleContainer.appendChild(gambleBtn);
            gambleContainer.appendChild(gambleHistory);
            roleDisplay.insertBefore(gambleContainer, document.getElementById("role-tip"));
        } else {
            gambleBtn = document.getElementById('gamble-btn');
            gambleHistory = document.querySelector('#gamble-container div');
        }

        const gambleActions = config.gambleActions || [];
        gambleBtn.onclick = () => {
            if (gambleActions.length === 0) {
                gambleHistory.innerHTML += `No gamble actions defined!<br>`;
                return;
            }
            const action = gambleActions[Math.floor(Math.random() * gambleActions.length)];
            gambleHistory.innerHTML += `You got: ${action.name}<br>`;
            if (action.action) {
                const liveHelpers = {
                    players,
                    playerIndex: playerIndex - 1, // 0-based index for logic
                    setRole: (idx, roleKey) => {
                        const name = players[idx]?.player_name;
                        if (!name) return;
                        // Remove player from all existing role lists
                        Object.keys(ROLE_DATA).forEach(rk => {
                            const list = getStorageJson(rk).filter(n => n !== name);
                            localStorage.setItem(rk, JSON.stringify(list));
                        });
                        // Clean up shapeshifter tracking if they were one
                        const unselected = getStorageJson('unselected_shapeshifters').filter(n => n !== name);
                        localStorage.setItem('unselected_shapeshifters', JSON.stringify(unselected));
                        // Add to new role list
                        const targetList = getStorageJson(roleKey);
                        if (!targetList.includes(name)) {
                            targetList.push(name);
                            localStorage.setItem(roleKey, JSON.stringify(targetList));
                        }
                    },
                    addModifier: (idx, modKey) => {
                        const name = players[idx]?.player_name;
                        if (!name) return;
                        const list = getStorageJson(modKey);
                        if (!list.includes(name)) {
                            list.push(name);
                            localStorage.setItem(modKey, JSON.stringify(list));
                        }
                    }
                };
                action.action(liveHelpers);
            }
            displayRole(playerIndex);
        }
    }
}

// Reset UI between player turns
function hideRole(playerIndex) {
    sessionStorage.setItem('current_player_is_ready', 'false');
    const roleStatus = document.getElementById('role-status');
    const wordDisplay = document.getElementById('word');

    const roleTypeEl = document.getElementById('role-type');
    if (roleTypeEl) roleTypeEl.innerHTML = '';

    roleStatus.style.color = '';
    roleStatus.style.textShadow = '';
    
    document.querySelectorAll('.modifier-container').forEach(el => el.remove());
    document.getElementById('roles-list')?.remove();
    document.getElementById('gamble-container')?.remove();

    roleStatus.className = 'hidden';
    roleStatus.innerHTML = '???';
    document.getElementById('role-tip').innerHTML = 'Turn the device away from other players.';
    document.getElementById('role-tip').style.fontSize = '2em';
    document.getElementById('role-title').innerHTML = `Player ${playerIndex} role:`;
    wordDisplay.innerHTML = "Click 'Next' to reveal!";
    roleDisplay.style.backgroundImage = 'radial-gradient(circle, #FFFF00 0%, #808000 100%)';
}

// Show summary of all roles
function viewRoles() {
    if (viewingRoles) {
        document.getElementById('roles-list')?.remove();
        document.getElementById('word-display')?.remove();
        document.getElementById('event-display')?.remove();
        viewingRoles = false;
        return;
    }
    viewingRoles = true;

    const activeEvents = JSON.parse(localStorage.getItem('active_random_events') || '[]');
    const hiddenEvents = activeEvents.filter(k => RANDOM_EVENTS[k]?.displayEventOnShowRoles);

    if (hiddenEvents.length > 0) {
        const eventInfo = document.createElement('div');
        eventInfo.id = 'event-display';

        hiddenEvents.forEach(k => {
            const eventCfg = RANDOM_EVENTS[k];
            const badge = document.createElement('div');
            badge.className = 'random-event-badge titan-one-regular';
            badge.innerHTML = (eventCfg?.label || k).toUpperCase();
            badge.style.background = eventCfg?.grad || 'linear-gradient(135deg, #FFD700 0%, #B8860B 100%)';
            badge.style.color = eventCfg?.textColor || 'white';
            badge.style.border = `1px solid ${eventCfg?.textColor || '#FFD700'}`;
            eventInfo.appendChild(badge);
        });
        main.insertBefore(eventInfo, document.getElementById('view-roles'));
    }

    const players = getStorageJson('current_players');
    const listContainer = document.createElement('div');
    listContainer.id = 'roles-list';

    const wordInfo = document.createElement('div');
    wordInfo.id = 'word-display';
    wordInfo.innerHTML = `Word: ${selectedWord}`;
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

        const roleConfig = (foundKey && ROLE_DATA[foundKey]) ? ROLE_DATA[foundKey] : INNOCENT_CONFIG;

        // Player Name
        const nameSpan = document.createElement('span');
        nameSpan.innerHTML = name;
        nameSpan.className = 'player-name'
        el.appendChild(nameSpan);

        // Add roleType text in summary
        if (roleConfig.roleType) {
            const alignSpan = document.createElement('span');
            alignSpan.innerHTML = `${roleConfig.roleType.toUpperCase()}`;
            alignSpan.className = 'role-type-summary'
            el.appendChild(alignSpan);
        }

        // Wrapper for badges
        const badgeWrapper = document.createElement('div');
        badgeWrapper.className = "badge-wrapper"

        const createBadge = (label, config) => {
            const badge = document.createElement('div');
            badge.innerHTML = label.toUpperCase();
            badge.style.background = config.grad;
            badge.style.color = config.textColor || 'white';
            badge.style.border = `1px solid ${config.textColor === 'white' ? 'rgba(255,255,255,0.3)' : config.textColor}`;
            badge.className = 'badge titan-one-regular'
            return badge;
        };

        // Add Role Badge
        const roleName = foundKey ? ROLE_DATA[foundKey].label : 'Innocent';
        badgeWrapper.appendChild(createBadge(roleName, roleConfig));

        // Add Modifier Badges
        Object.keys(ROLE_MODIFIERS).forEach(modKey => {
            if (getStorageJson(modKey).includes(name)) {
                badgeWrapper.appendChild(createBadge(ROLE_MODIFIERS[modKey].label, ROLE_MODIFIERS[modKey]));
            }
        });

        el.appendChild(badgeWrapper);

        let roleExtra = '';
        
        if (isshapeshifter && !isUnselected) {
            roleExtra += ' (Shapeshifter)';
        }
        
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

        if (roleExtra) {
            const extraEl = document.createElement('div');
            extraEl.innerHTML = roleExtra.trim();
            extraEl.className = "role-extra"
            el.appendChild(extraEl);
        }

        listContainer.appendChild(el);
    });
    main.appendChild(listContainer);
}

// Trigger the discussion phase
async function startGame(updateStats = true) {
    const maxTime = 120;
    let time = maxTime;
    const timerDisplay = document.createElement('div');
    timerDisplay.id = 'timer-display';
    timerDisplay.innerHTML = `Time Remaining: ${time}s`;
    timerDisplay.style.fontSize = '1.5rem';
    main.insertBefore(timerDisplay, document.getElementById('back-button'));

    const viewRolesBtn = document.createElement('button');
    viewRolesBtn.id = 'view-roles';
    viewRolesBtn.className = 'titan-one-regular';
    viewRolesBtn.innerHTML = "View Roles";
    viewRolesBtn.onclick = viewRoles;
    main.insertBefore(viewRolesBtn, document.getElementById('back-button'));

    document.getElementById('big-text').innerHTML = 'DISCUSS';

    // Display active global events
    const activeEvents = JSON.parse(localStorage.getItem('active_random_events') || '[]');
    // Only show events if it doesnt have display on show roles
    const visibleEvents = activeEvents.filter(k => !RANDOM_EVENTS[k]?.displayEventOnShowRoles);

    if (visibleEvents.length > 0) {
        const eventBanner = document.createElement('div');
        eventBanner.id = 'active-events-banner';
        eventBanner.style.display = 'flex';
        eventBanner.style.justifyContent = 'center';
        eventBanner.style.gap = '10px';
        eventBanner.style.marginBottom = '20px';

        visibleEvents.forEach(k => {
            const eventCfg = RANDOM_EVENTS[k];
            const badge = document.createElement('div');
            badge.className = 'badge-events titan-one-regular';
            badge.innerHTML = (eventCfg?.label || k).toUpperCase();
            badge.style.background = eventCfg?.grad || 'linear-gradient(135deg, #FFD700 0%, #B8860B 100%)';
            badge.style.color = eventCfg?.textColor || 'white';
            badge.style.textShadow = '0 1px 2px rgba(0,0,0,0.5)';
            badge.style.border = `1px solid ${eventCfg?.textColor || '#FFD700'}`;
            eventBanner.appendChild(badge);
        });
        main.insertBefore(eventBanner, timerDisplay);
    }

    // Display Role Reveal Popups
    const reveals = [];
    Object.keys(ROLE_DATA).forEach(roleKey => {
        const roleCfg = ROLE_DATA[roleKey];
        if (roleCfg.revealSelectedPlayer) {
            const targets = getStorageJson(`${getBaseRoleId(roleKey)}SelectedTargets`, {});
            Object.entries(targets).forEach(([sourcePlayer, targetPlayer]) => {
                if (targetPlayer) {
                    let labelText = roleCfg.revealText || 'SELECTED';
                    if (labelText.includes('<player>')) {
                        labelText = labelText.replace('<player>', sourcePlayer.toUpperCase());
                    }

                    reveals.push({
                        label: labelText,
                        names: targetPlayer,
                        grad: roleCfg.grad,
                        textColor: roleCfg.textColor
                    });

                    if (roleCfg.selectionRevealEffects) {
                        const effects = roleCfg.selectionRevealEffects;
                        const rand = Math.random();
                        let cumulativeChance = 0;
                        let chosenEffect = null;

                        for (const effect of effects) {
                            cumulativeChance += effect.chance;
                            if (rand < cumulativeChance) {
                                chosenEffect = effect;
                                break;
                            }
                        }

                        if (chosenEffect) {
                            const lastReveal = reveals[reveals.length - 1];
                            if (lastReveal) {
                                lastReveal.names = chosenEffect.text.replace('<player>', targetPlayer.toUpperCase());

                                if (lastReveal.names.includes('<otherPlayer>')) {
                                    const allPlayers = getStorageJson('current_players');
                                    const otherPlayers = allPlayers.filter(p => p.player_name !== sourcePlayer && p.player_name !== targetPlayer);
                                    let randomPlayerName = 'NO ONE ELSE';
                                    if (otherPlayers.length > 0) {
                                        const randomPlayer = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
                                        randomPlayerName = randomPlayer.player_name;
                                    }
                                    lastReveal.names = lastReveal.names.replace('<otherPlayer>', randomPlayerName.toUpperCase());

                                    if (chosenEffect.killOtherPlayer && randomPlayerName !== 'NO ONE ELSE') {
                                        const ninjaConfig = ROLE_DATA['ninja'];
                                        reveals.push({
                                            label: ninjaConfig.revealText,
                                            names: randomPlayerName,
                                            grad: ninjaConfig.grad,
                                            textColor: ninjaConfig.textColor
                                        });
                                    }
                                }

                                if (chosenEffect.killPlayer) {
                                    lastReveal.label = ROLE_DATA['ninja'].revealText;
                                    lastReveal.names = targetPlayer;
                                }
                            }
                        }
                    }

                    if (roleCfg.alsoKillsSelf) {
                        const ninjaConfig = ROLE_DATA['ninja'];
                        reveals.push({
                            label: ninjaConfig.revealText,
                            names: sourcePlayer,
                            grad: ninjaConfig.grad,
                            textColor: ninjaConfig.textColor
                        });
                    }
                }
            });
        }
    });

    const ninjaKills = getStorageJson('ninjaSelectedTargets', {});
    reveals.forEach(reveal => {
        if (reveal.label === ROLE_DATA['ninja'].revealText) {
            const victim = reveal.names;
            ninjaKills[`kill_${victim}`] = victim;
        }
    });
    localStorage.setItem('ninjaSelectedTargets', JSON.stringify(ninjaKills));

    if (reveals.length > 0) {
        const overlay = document.createElement('div');
        overlay.id = 'reveal-overlay';
        document.body.appendChild(overlay);

        const revealContainer = document.createElement('div');
        revealContainer.id = 'reveal-container';
        document.body.appendChild(revealContainer);

        [...new Map(reveals.map(item => [item.label, item])).values()].forEach(data => {
            const roleBox = document.createElement('div');
            roleBox.classList.add('role-box');
            roleBox.style.background = data.grad || 'linear-gradient(135deg, #009a79, #001e60)'; // Fallback gradient
            roleBox.style.border = `4px solid ${data.textColor || '#2ea19b'}`;

            roleBox.innerHTML = `
                <h1 class="titan-one-regular" style="font-size: 1.8rem; margin: 0 0 10px 0; text-shadow: 0 4px 10px rgba(0,0,0,0.5);">${data.label}</h1>
                <div class="titan-one-regular" style="font-size: 1.4rem;">${data.names}</div>
            `;
            revealContainer.appendChild(roleBox);
        });

        // Trigger fade in
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            revealContainer.style.opacity = '1';
        });

        // Trigger exit animation
        setTimeout(() => {
            revealContainer.style.transition = 'opacity 1s ease';
            overlay.style.transition = 'opacity 1s ease';
            revealContainer.style.opacity = '0';
            overlay.style.opacity = '0';
            setTimeout(() => {
                revealContainer.remove();
                overlay.remove();
            }, 1000);
        }, 15000);
    }

    gameTimer = setInterval(() => {
        time--;
        timerDisplay.innerHTML = `Time Remaining: ${time}s`;
        if (time <= 0) {
            timerDisplay.innerHTML = "Time's up!";
            clearInterval(gameTimer);
        }
    }, 1000);

    // Record game play in stats
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

// Return to the setup screen
function lobby() {
    if (confirm("Are you sure you want to go back to lobby?")) {
        if (gameTimer) clearInterval(gameTimer);
        window.location.href = 'create/local.html';
    }
}

// Initialize logic when page loads
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

// Handle role reveal button clicks
document.getElementById('ready-button').addEventListener('click', () => {
    const players = getStorageJson('current_players');
    const name = players[currentIndex - 1]?.player_name;
    
    const isUnselected = getStorageJson('unselected_shapeshifters').includes(name);
    const baseRoleKey = Object.keys(ROLE_DATA).find(key => getStorageJson(key).includes(name)) || (isUnselected ? 'shapeshifters' : null);
    const config = ROLE_DATA[baseRoleKey] || INNOCENT_CONFIG;

    if (!document.getElementById('role-status').classList.contains('hidden')) {
        if (isUnselected) {
            return alert("Please select a role first!");
        }
        if (config.selectPlayer && !getStorageJson(`${getBaseRoleId(baseRoleKey)}SelectedTargets`, {})[name]) {
            return alert(`Please select a target first!`);
        }
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
