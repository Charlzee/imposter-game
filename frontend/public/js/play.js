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
        const occupiedIndices = new Set();
        Object.keys(ROLE_DATA).forEach(roleKey => {
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
                    if (modKey === 'amnesias' && (assignedRolesData.shapeshifters || []).includes(p.player_name)) return;
                    const saved = localStorage.getItem(`${modKey}_percent`);
                    const chance = FORCE_ALL_MODIFIERS ? 1 : (saved ? parseFloat(saved) / 100 : ROLE_MODIFIERS[modKey].chance);
                    if (Math.random() < chance) helpers.addModifier(idx, modKey);
                });
            });
        }
    };

    if (!activeEvents.some(k => RANDOM_EVENTS[k]?.skipDefaultAssignment)) runDefaultRoleAssignment();

    activeEvents.forEach(eventKey => {
        const event = RANDOM_EVENTS[eventKey];
        if (event?.onTrigger) event.onTrigger({ players, assignedRolesData, modifierLists, ...helpers });
    });

    runDefaultModifierAssignment();

    localStorage.removeItem('inspectorClues');
    localStorage.removeItem('innocents');
    Object.keys(ROLE_DATA).forEach(k => { if (ROLE_DATA[k].hasTarget) localStorage.removeItem(`${getBaseRoleId(k)}Targets`); });
    Object.keys(ROLE_MODIFIERS).forEach(k => { if (ROLE_MODIFIERS[k].hasTarget) localStorage.removeItem(`${getBaseRoleId(k)}Targets`); });

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

        if (document.getElementById("shapeshifter-role-selection")) document.getElementById("shapeshifter-role-selection").remove();

        let displayTheWord = configUi.showWord;
        activeModifiers.forEach(modKey => {
            if (ROLE_MODIFIERS[modKey].overrideWordVisibility) {
                displayTheWord = ROLE_MODIFIERS[modKey].showWord;
            }
        });

        let content = displayTheWord ? selectedWord : '';

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
            const modConfig = ROLE_MODIFIERS[modKey];
            
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
            modTitle.innerHTML = `Modifier: ${modConfig.label}`;
            modTitle.style.color = modConfig.textColor;
            modTitle.style.fontSize = '1.5rem';
            modTitle.style.margin = '0 0 10px 0';
            modTitle.style.textShadow = '0 2px 4px #00000080';

            const modTip = document.createElement('p');
            
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
                    tipText += `[Your final vote count will be 1 less (temporary ability for now)]`
                } else if (playerRole === "shapeshifters") {
                    if (getStorageJson('unselected_shapeshifters').includes(playerName)) {
                        tipText += `[You can select 1 extra role modifier to have]`
                    } else {
                        tipText += `[Used to select extra modifier]`
                    }
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
                    updateUi(roleCfg); 
                    selectionList.remove();
                    if (roleCfg.hasClue) {
                        const wordDisplay = document.getElementById('word');
                        const playerToShow = getInspectorClue();
                        wordDisplay.innerHTML = wordDisplay.innerHTML + `\n\nONE NON-IMPOSTER:\n${playerToShow}`;
                    }
                }
            };
            selectionList.appendChild(roleBtn);
        });

        roleDisplay.insertBefore(selectionList, document.getElementById("role-tip"));
    } else if (config.hasClue){
        const playerToShow = getInspectorClue();
        wordDisplay.innerHTML += `\n\nONE NON-IMPOSTER:\n${playerToShow}`;
    }
}

// Reset UI between player turns
function hideRole(playerIndex) {
    sessionStorage.setItem('current_player_is_ready', 'false');
    const roleStatus = document.getElementById('role-status');
    const wordDisplay = document.getElementById('word');

    roleStatus.style.color = '';
    roleStatus.style.textShadow = '';
    
    document.querySelectorAll('.modifier-container').forEach(el => el.remove());

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
        eventInfo.style.display = 'flex';
        eventInfo.style.justifyContent = 'center';
        eventInfo.style.gap = '10px';
        eventInfo.style.marginBottom = '20px';

        hiddenEvents.forEach(k => {
            const eventCfg = RANDOM_EVENTS[k];
            const badge = document.createElement('div');
            badge.className = 'titan-one-regular';
            badge.innerHTML = (eventCfg?.label || k).toUpperCase();
            badge.style.background = eventCfg?.grad || 'linear-gradient(135deg, #FFD700 0%, #B8860B 100%)';
            badge.style.color = eventCfg?.textColor || 'white';
            badge.style.padding = '6px 14px';
            badge.style.borderRadius = '10px';
            badge.style.fontSize = '1.1rem';
            badge.style.fontWeight = 'bold';
            badge.style.textShadow = '0 1px 2px rgba(0,0,0,0.5)';
            badge.style.border = `1px solid ${eventCfg?.textColor || '#FFD700'}`;
            eventInfo.appendChild(badge);
        });
        main.insertBefore(eventInfo, document.getElementById('view-roles'));
    }

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
        nameSpan.innerHTML = name;
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
            badge.innerHTML = label.toUpperCase();
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
            badge.className = 'titan-one-regular';
            badge.innerHTML = (eventCfg?.label || k).toUpperCase();
            badge.style.background = eventCfg?.grad || 'linear-gradient(135deg, #FFD700 0%, #B8860B 100%)';
            badge.style.color = eventCfg?.textColor || 'white';
            badge.style.padding = '6px 14px';
            badge.style.borderRadius = '10px';
            badge.style.fontSize = '1.1rem';
            badge.style.fontWeight = 'bold';
            badge.style.textShadow = '0 1px 2px rgba(0,0,0,0.5)';
            badge.style.border = `1px solid ${eventCfg?.textColor || '#FFD700'}`;
            eventBanner.appendChild(badge);
        });
        main.insertBefore(eventBanner, timerDisplay);
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
