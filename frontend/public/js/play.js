// Import game logic and constants
import getWords from './words.js';
import { getURLParameter, getRandomInt, toTitleCase, getRandomLetter, getRandomLetterOrNumber } from '../js/global.js';
import { ROLE_MODIFIERS, ROLE_DATA, INNOCENT_CONFIG, getBaseRoleId, RANDOM_EVENTS } from './roles.js';

// === VARIABLES ===
const RULES = [
    "<p style='font-size: 32px'>BREAKING ANY OF THESE RULES WILL MAKE YOU INSTANTLY LOSE AND YOU WILL GET SHOT AND DIE </p>",
    "1. No cheating or revealing your role to other players.",
    "2. No saying single letters",
    "3. No saying opinions",
    "4. No saying 'food' or 'drink' or 'good' or 'bad' (unless NPC modifier)",
    "5. No saying sizes (unless NPC modifier)",
    "6. No saying colours (unless NPC modifier)",
    "7. No saying 67 or charlie kirk (sorry elijah)",
    "8. No teaming",
    "9. No saying who you know is innocent (e.g. Inspector, Innocent+, King, etc.)"
]

// === DEBUG ===
const FORCE_ALL_MODIFIERS = false;

// ==== GLOBAL STATE ====
let data, selectedTopic, words, selectedWord = null;
let currentIndex = 1;
let viewingRoles = false;
let gameTimer = null;
let selectedVoteTarget = null;
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
                const roleKey = Object.keys(assignedRolesData).find(rk => (assignedRolesData[rk] || []).includes(p.player_name));
                const roleConfig = ROLE_DATA[roleKey];

                if (roleConfig?.immuneToModifiers) return;

                Object.keys(ROLE_MODIFIERS).forEach(modKey => {
                    if (modKey === 'amnesias' && roleConfig?.immuneToAmnesia) return;

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

    // Handle Mastermind recruitment
    const masterminds = assignedRolesData['mastermind'] || [];
    if (masterminds.length > 0) {
        const innocentPlayers = players.filter(p => {
            // Check if player has any role other than innocent
            for (const roleKey in assignedRolesData) {
                if (roleKey === 'innocents') continue;
                if (assignedRolesData[roleKey].includes(p.player_name)) {
                    return false;
                }
            }
            return true;
        }).map(p => p.player_name);

        if (innocentPlayers.length > 0) {
            const mastermindTargets = {};
            masterminds.forEach(mastermindName => {
                const availableTargets = innocentPlayers.filter(p => p !== mastermindName && !Object.values(mastermindTargets).includes(p));
                if (availableTargets.length > 0) {
                    const targetName = availableTargets[Math.floor(Math.random() * availableTargets.length)];
                    mastermindTargets[mastermindName] = targetName;

                    // Change target's role to Recruited Imposter
                    assignedRolesData['recruited_imposters'].push(targetName);
                }
            });
            localStorage.setItem('mastermindTargets', JSON.stringify(mastermindTargets));
        }
    }

    localStorage.removeItem('inspectorClues');
    localStorage.removeItem('innocents');
    Object.keys(ROLE_DATA).forEach(k => { if (ROLE_DATA[k].hasTarget) localStorage.removeItem(`${getBaseRoleId(k)}Targets`); });
    localStorage.removeItem('justificationWords');
    localStorage.removeItem('original_venom');
    Object.keys(ROLE_MODIFIERS).forEach(k => { if (ROLE_MODIFIERS[k].hasTarget) localStorage.removeItem(`${getBaseRoleId(k)}Targets`); });
    Object.keys(ROLE_DATA).forEach(k => { if (ROLE_DATA[k].selectPlayer) localStorage.removeItem(`${getBaseRoleId(k)}SelectedTargets`); });
    Object.keys(ROLE_DATA).forEach(k => { if (ROLE_DATA[k].selectCustom) localStorage.removeItem(`${getBaseRoleId(k)}CustomSelection`); });


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

    if (assignedRolesData['venom'] && assignedRolesData['venom'].length > 0) {
        localStorage.setItem('original_venom', JSON.stringify(assignedRolesData['venom']));
    }

    Object.keys(ROLE_MODIFIERS).forEach(modKey => {
        localStorage.setItem(modKey, JSON.stringify(modifierLists[modKey]));
        if (ROLE_MODIFIERS[modKey].hasTarget) assignTargets(modifierLists[modKey], `${getBaseRoleId(modKey)}Targets`);
    });

    // pre-assign justification words if needed
    (async () => {
        const justificationPlayers = modifierLists['justification'] || [];
        if (justificationPlayers.length > 0) {
            try {
                const response = await fetch('js/english_language.json');
                const englishData = await response.json();
                const sourceWords = englishData[0]?.words || words.filter(w => w !== selectedWord);
                const justificationWords = {};
                justificationPlayers.forEach(playerName => {
                    const randomWord = sourceWords[Math.floor(Math.random() * sourceWords.length)];
                    justificationWords[playerName] = randomWord;
                });
                localStorage.setItem('justificationWords', JSON.stringify(justificationWords));
            } catch (error) {
                console.error("Failed to load english_language.json for Justification modifier:", error);
            }
        }
    })();
    
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
        document.getElementById('role-animation-video')?.remove();
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

        // Hide all text
        const roleTypeEl = document.getElementById('role-type');
        if (configUi.hideAllText) {
            if (roleTypeEl) roleTypeEl.style.display = 'none';
            roleTitle.style.display = 'none';
            roleStatus.style.display = 'none';
            roleTip.style.display = 'none';
        } else {
            if (roleTypeEl) roleTypeEl.style.display = 'block';
            roleTitle.style.display = 'block';
            roleStatus.style.display = 'block';
            roleTip.style.display = 'block';
        }

        roleTitle.innerHTML = `${playerName}'s role:`;
        
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
            const justificationWords = getStorageJson('justificationWords', {});
            const justificationWord = justificationWords[playerName];
            if (justificationWord) {
                content = `YOUR FAKE WORD IS:\n${justificationWord}`;
                if (config.showWord) content += `\n\nTHE REAL WORD IS:\n${selectedWord}`;
            } else {
                content = displayTheWord ? selectedWord : '';
            }
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
            const selectionAmount = config.selectionAmount || 1;
            const currentSelections = getStorageJson(storageKey, {});
            const playerSelections = currentSelections[playerName] || (selectionAmount > 1 ? [] : null);

            const isSelectionComplete = selectionAmount > 1 ? playerSelections.length >= selectionAmount : !!playerSelections;

            if (!isSelectionComplete) {
                const selectionList = document.createElement('div');
                selectionList.id = 'roles-list';
                if (config.selectionListColor) selectionList.style.background = config.selectionListColor;
                
                const updatePrompt = () => {
                    const remaining = selectionAmount - (Array.isArray(playerSelections) ? playerSelections.length : 0);
                    const promptText = `${config.selectionText || 'SELECT A PLAYER'} ${selectionAmount > 1 ? `(${remaining} REMAINING)` : ''}`;
                    selectionList.querySelector('h3').innerHTML = promptText;
                };

                selectionList.innerHTML = `<h3 class="titan-one-regular manual-button-selection" style="color: ${config.textColor || '#fff'}"></h3>`;

                const players = getStorageJson('current_players');
                players.forEach(p => {
                    if (p.player_name === playerName && !config.canSelectSelf) return;
                    const btn = document.createElement('div');
                    btn.className = 'player-view-role';
                    btn.dataset.playerName = p.player_name;
                    btn.innerHTML = p.player_name;
                    btn.style.background = config.grad;
                    btn.onclick = () => {
                        if (selectionAmount > 1) {
                            if (!playerSelections.includes(p.player_name)) {
                                playerSelections.push(p.player_name);
                                btn.classList.add('disabled');
                            }
                            if (playerSelections.length >= selectionAmount) {
                                currentSelections[playerName] = playerSelections;
                                localStorage.setItem(storageKey, JSON.stringify(currentSelections));
                                displayRole(playerIndex);
                            } else {
                                updatePrompt();
                            }
                        } else {
                            currentSelections[playerName] = p.player_name;
                            localStorage.setItem(storageKey, JSON.stringify(currentSelections));
                            displayRole(playerIndex);
                        }
                    };
                    selectionList.appendChild(btn);
                });
                updatePrompt(); // Initial prompt text
                roleDisplay.insertBefore(selectionList, document.getElementById("role-tip"));
            } else {
                const selectedDisplay = Array.isArray(playerSelections) ? playerSelections.join(', ') : playerSelections;
                wordDisplay.innerHTML += `\n\nSELECTED: ${selectedDisplay}`;
            }
        }

        if (config.selectCustom) {
            const storageKey = `${getBaseRoleId(baseRoleKey)}CustomSelection`;
            const storageKeyTip = `${getBaseRoleId(baseRoleKey)}CustomSelectionTip`;
            const selectionAmount = config.selectionAmount || 1;
            const currentSelections = getStorageJson(storageKey, {});
            const optionSelections = currentSelections[playerName] || (selectionAmount > 1 ? [] : null);

            const isSelectionComplete = selectionAmount > 1 ?optionSelections.length >= selectionAmount : !!optionSelections;

            let selectedOptionTip = 'hi';

            if (!isSelectionComplete) {
                const selectionList = document.createElement('div');
                selectionList.id = 'roles-list';
                if (config.selectionListColor) selectionList.style.background = config.selectionListColor;
                
                const updatePrompt = () => {
                    const remaining = selectionAmount - (Array.isArray(optionSelections) ? optionSelections.length : 0);
                    const promptText = `${config.selectionText || 'SELECT AN OPTION'} ${selectionAmount > 1 ? `(${remaining} REMAINING)` : ''}`;
                    selectionList.querySelector('h3').innerHTML = promptText;
                };

                selectionList.innerHTML = `<h3 class="titan-one-regular manual-button-selection" style="color: ${config.textColor || '#fff'}"></h3>`;

                const options = config.customOptions || [];
                options.forEach(option => {
                    const btn = document.createElement('div');
                    btn.className = 'player-view-role';
                    btn.dataset.optionName = option.display;
                    btn.innerHTML = option.display;
                    btn.style.background = option.color || '#fff';
                    btn.style.color = '#fff'
                    btn.onclick = () => {
                        localStorage.setItem(storageKeyTip, option.tip || 'no text');
                        console.log("Selected option tip:", localStorage.getItem(storageKeyTip));
                        if (selectionAmount > 1) {
                            if (!optionSelections.includes(option.display)) {
                                optionSelections.push(option.display);
                                btn.classList.add('disabled');
                            }
                            if (optionSelections.length >= selectionAmount) {
                                currentSelections[playerName] = optionSelections;
                                localStorage.setItem(storageKey, JSON.stringify(currentSelections));
                                displayRole(playerIndex);
                            } else {
                                updatePrompt();
                            }
                        } else {
                            currentSelections[playerName] = option.display;
                            localStorage.setItem(storageKey, JSON.stringify(currentSelections));
                            displayRole(playerIndex);
                        }
                    };
                    selectionList.appendChild(btn);
                });
                updatePrompt(); // Initial prompt text
                roleDisplay.insertBefore(selectionList, document.getElementById("role-tip"));
            } else {
                const selectedDisplay = Array.isArray(optionSelections) ? optionSelections.join(', ') : optionSelections;
                wordDisplay.innerHTML += `\n\nSELECTED: ${selectedDisplay}`;
                wordDisplay.innerHTML += `\n\n${localStorage.getItem(storageKeyTip) || 'error'}`;
                console.log(localStorage.getItem(storageKeyTip))
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
            modTitle.innerHTML = modConfig.label;
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
                roleStatus.innerHTML += `<span style="color: #29D1FF; font-weight: bold; font-size: 150%;"> +</span>`;
                const playerRoleConfig = ROLE_DATA[playerRole] || INNOCENT_CONFIG;

                if (playerRole === "innocents") {
                    tipText += `[All other innocents know you are innocent]`
                } else if (playerRoleConfig.roleType === "imposter") {
                    tipText += `[Your final vote count will be 1 less]`
                } else if (playerRole === "shapeshifters") {
                    if (getStorageJson('unselected_shapeshifters').includes(playerName)) {
                        tipText += `[You can select 1 extra role modifier to have]`
                    } else {
                        tipText += `[Used to select extra modifier]`
                    }
                } else if (playerRole === "divine_art") {
                    tipText += `[You can redirect any votes cast onto you to whoever you vote for]`
                } else if (playerRole === "gold_roger") {
                    tipText += `[The player you give your will to will receive 2 votes instead of 1]`
                } else if (playerRole === "alphas") {
                    tipText += `[Votes from Imposter roles against you are ignored]`
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
    
    if (config.isVenom && baseRoleKey === 'venom') {
        const venomTargets = getStorageJson('venomSelectedTargets', {});
        const myTarget = venomTargets[playerName];

        if (myTarget) {
            // Kill the target
            const ninjaKills = getStorageJson('ninjaSelectedTargets', {});
            ninjaKills[`kill_${myTarget}`] = myTarget;
            localStorage.setItem('ninjaSelectedTargets', JSON.stringify(ninjaKills));

            // Find target's role
            const allRoleKeys = Object.keys(ROLE_DATA);
            let targetRoleKey = allRoleKeys.find(key => getStorageJson(key).includes(myTarget));
            if (!targetRoleKey) {
                targetRoleKey = 'innocents'; // Default to innocent if no special role
            }

            // Transfer role to player
            if (targetRoleKey !== 'innocents') {
                const targetRoleList = getStorageJson(targetRoleKey);
                if (!targetRoleList.includes(playerName)) {
                    targetRoleList.push(playerName);
                    localStorage.setItem(targetRoleKey, JSON.stringify(targetRoleList));
                }
            }

            // Remove Venom role from player
            const venomPlayers = getStorageJson('venom').filter(p => p !== playerName);
            localStorage.setItem('venom', JSON.stringify(venomPlayers));

            // Refresh the UI to show the new role
            displayRole(playerIndex)
            return;
        }
    }

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
    const players = getStorageJson('current_players');
    const playerName = players[playerIndex - 1]?.player_name || "Player";

    const roleStatus = document.getElementById('role-status');
    const roleTip = document.getElementById('role-tip');
    const roleTitle = document.getElementById('role-title');
    const wordDisplay = document.getElementById('word');

    const roleTypeEl = document.getElementById('role-type');
    if (roleTypeEl) roleTypeEl.innerHTML = '';

    if (roleTypeEl) roleTypeEl.style.display = 'block';
    roleTitle.style.display = 'block';
    roleStatus.style.display = 'block';
    roleTip.style.display = 'block';

    roleStatus.style.color = '';
    roleStatus.style.textShadow = '';
    
    document.querySelectorAll('.modifier-container').forEach(el => el.remove());
    document.getElementById('role-animation-video')?.remove();
    document.getElementById('roles-list')?.remove();
    document.getElementById('gamble-container')?.remove();

    roleStatus.className = 'hidden';
    roleStatus.innerHTML = '???';
    roleTip.innerHTML = 'Turn the device away from other players.';
    roleTip.style.fontSize = '2em';
    roleTitle.innerHTML = `${playerName}'s role:`;
    wordDisplay.innerHTML = "Click 'Next' to reveal!";
    roleDisplay.style.backgroundImage = 'radial-gradient(circle, #FFFF00 0%, #808000 100%)';
}

// Helper to get players who are not killed
function getLivingPlayers() {
    const allPlayers = getStorageJson('current_players');
    const killedPlayers = Object.values(getStorageJson('ninjaSelectedTargets', {}));
    return allPlayers.filter(p => !killedPlayers.includes(p.player_name));
}

// Start vote
function startVote() {
    document.getElementById('start-vote')?.remove();;
    document.getElementById('big-text').innerHTML = 'VOTE';

    localStorage.setItem('votes', JSON.stringify({}));
    localStorage.setItem('voted_players', JSON.stringify([]));

    const voteContainer = document.createElement('div');
    voteContainer.id = 'vote-container';

    const players = getStorageJson('current_players');
    const playerButtonsContainer = document.createElement('div');
    playerButtonsContainer.id = 'vote-players-grid';
    const killedPlayers = Object.values(getStorageJson('ninjaSelectedTargets', {}));

    players.forEach(p => {
        const playerBtn = document.createElement('div');
        playerBtn.className = 'player-view-role vote-player-btn';
        playerBtn.dataset.playerName = p.player_name;
        playerBtn.innerHTML = p.player_name;
        playerBtn.onclick = () => selectVoteTarget(p.player_name);
        // if (killedPlayers.includes(p.player_name)) {
        // }
        playerButtonsContainer.appendChild(playerBtn);
    });

    voteContainer.appendChild(playerButtonsContainer);

    const confirmBtn = document.createElement('button');
    confirmBtn.id = 'confirm-vote-btn';
    confirmBtn.className = 'titan-one-regular';
    confirmBtn.innerHTML = 'CONFIRM VOTE';
    confirmBtn.disabled = true;
    confirmBtn.onclick = () => {
        if (selectedVoteTarget) {
            castVote(selectedVoteTarget);
            // Reset selection for next voter
            document.querySelectorAll('.vote-player-btn.is-selected').forEach(btn => btn.classList.remove('is-selected'));
            selectedVoteTarget = null;
            confirmBtn.disabled = true;
        }
    };
    voteContainer.appendChild(confirmBtn);

    main.appendChild(voteContainer);
    updateVoterPrompt();
}

// Handles selecting a player to vote for
function selectVoteTarget(playerName) {
    // Clear previous selection
    document.querySelectorAll('.vote-player-btn.is-selected').forEach(btn => btn.classList.remove('is-selected'));

    // Select new target
    const targetBtn = document.querySelector(`.vote-player-btn[data-player-name="${playerName}"]`);
    if (targetBtn) {
        targetBtn.classList.add('is-selected');
        selectedVoteTarget = playerName;
    }

    // Enable confirm button
    const confirmBtn = document.getElementById('confirm-vote-btn');
    if (confirmBtn) {
        confirmBtn.disabled = false;
    }
}

// Update the prompt showing who is currently voting
function updateVoterPrompt() {
    let voterPrompt = document.getElementById('voter-prompt');
    if (!voterPrompt) {
        voterPrompt = document.createElement('h2');
        voterPrompt.id = 'voter-prompt';
        voterPrompt.className = 'titan-one-regular';
        main.insertBefore(voterPrompt, document.getElementById('vote-container'));
    }

    const livingPlayers = getLivingPlayers();
    const votedPlayers = getStorageJson('voted_players');
    const nextVoter = livingPlayers.find(p => !votedPlayers.includes(p.player_name));

    // Reset all buttons
    document.querySelectorAll('.vote-player-btn').forEach(btn => {
        btn.classList.remove('disabled');
    });

    if (nextVoter) {
        voterPrompt.innerHTML = `${nextVoter.player_name}'s VOTE:`;

        // Disable voting for target
        const femboyPlayers = getStorageJson('femboy');
        if (femboyPlayers.includes(nextVoter.player_name)) {
            const femboyTargets = getStorageJson('femboyTargets', {});
            const targetName = femboyTargets[nextVoter.player_name];
            if (targetName) {
                const targetBtn = document.querySelector(`.vote-player-btn[data-player-name="${targetName}"]`);
                if (targetBtn) targetBtn.classList.add('is-killed');
            }
        }
    } else {
        voterPrompt.remove();
    }
}

// Handles a player casting their vote
function castVote(votedFor) {
    const livingPlayers = getLivingPlayers();
    const votedPlayers = getStorageJson('voted_players');
    const nextVoter = livingPlayers.find(p => !votedPlayers.includes(p.player_name));

    if (!nextVoter) return; // All votes are done

    const votes = getStorageJson('votes', {});
    if (!votes[votedFor]) {
        votes[votedFor] = [];
    }
    votes[votedFor].push(nextVoter.player_name);

    localStorage.setItem('votes', JSON.stringify(votes));

    votedPlayers.push(nextVoter.player_name);
    localStorage.setItem('voted_players', JSON.stringify(votedPlayers));

    //alert(`${nextVoter.player_name} voted for ${votedFor}.`);

    if (votedPlayers.length >= livingPlayers.length) {
        tallyVotes();
    } else {
        updateVoterPrompt();
    }
}

// Helper to get the primary role of a player
function getRoleOfPlayer(playerName) {
    const activeRoleKeys = Object.keys(ROLE_DATA).filter(k => k !== 'shapeshifters');
    let roleKey = activeRoleKeys.find(key => getStorageJson(key).includes(playerName));

    const isUnselectedShapeshifter = getStorageJson('unselected_shapeshifters').includes(playerName);
    if (!roleKey && getStorageJson('shapeshifters').includes(playerName) && !isUnselectedShapeshifter) {
        // This player was a shapeshifter but has chosen a role.
        // The above find should have caught it. If it doesnt default to innocent shapeshifter.
    } else if (isUnselectedShapeshifter) {
        roleKey = 'shapeshifters';
    }
    return roleKey || 'innocents';
}

// Tally votes and display the result
function tallyVotes() {
    document.getElementById('vote-container')?.remove();
    document.getElementById('voter-prompt')?.remove();
    document.getElementById('big-text').innerHTML = 'VOTE RESULTS';

    const resultContainer = document.createElement('div');
    resultContainer.id = 'vote-result';
    main.appendChild(resultContainer);

    // Display word
    const wordInfo = document.createElement('div');
    wordInfo.id = 'word-display-result';
    wordInfo.className = 'titan-one-regular';
    wordInfo.innerHTML = `The Word Was: <span style="color: #ffeb3b;">${selectedWord}</span>`;
    resultContainer.appendChild(wordInfo);

    // Display hidden random events
    const activeEvents = getStorageJson('active_random_events', []);
    const hiddenEvents = activeEvents.filter(k => RANDOM_EVENTS[k]?.displayEventOnShowRoles);
    if (hiddenEvents.length > 0) {
        const eventInfo = document.createElement('div');
        eventInfo.id = 'event-display-result';
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
        resultContainer.appendChild(eventInfo);
    }

    const votes = getStorageJson('votes', {});

    // Create a mutable copy of votes to process abilities like Alpha+
    const processedVotes = JSON.parse(JSON.stringify(votes));

    // Pre-process votes for roles that modify incoming votes (e.g., Alpha+)
    Object.keys(processedVotes).forEach(votedForPlayer => {
        const playerRole = getRoleOfPlayer(votedForPlayer);
        const playerModifiers = Object.keys(ROLE_MODIFIERS).filter(modKey => getStorageJson(modKey).includes(votedForPlayer));
        const roleConfig = ROLE_DATA[playerRole] || INNOCENT_CONFIG;

        if (roleConfig.plusAbility && playerModifiers.includes('plus')) {
            const originalVoters = processedVotes[votedForPlayer];
            const filteredVoters = roleConfig.plusAbility(originalVoters, { getRoleOfPlayer, ROLE_DATA, INNOCENT_CONFIG });
            processedVotes[votedForPlayer] = filteredVoters;
        }
    });


    // --- Divine Arts logic ---
    const divinePlayers = getStorageJson('divine_art');
    const plusPlayers = getStorageJson('plus');

    divinePlayers.forEach(divinePlayerName => {
        const isPlus = plusPlayers.includes(divinePlayerName);

        if (isPlus) { // Divine Arts+ redirects votes
            // Find who the divine player voted for
            let divineTarget = null;
            for (const target in processedVotes) {
                if (processedVotes[target].includes(divinePlayerName)) {
                    divineTarget = target;
                    break;
                }
            }

            if (divineTarget && divineTarget !== divinePlayerName) {
                const votesForDivine = processedVotes[divinePlayerName] || [];
                if (votesForDivine.length > 0) {
                    if (!processedVotes[divineTarget]) processedVotes[divineTarget] = [];
                    processedVotes[divineTarget].push(...votesForDivine);
                    processedVotes[divinePlayerName] = []; // Clear votes after redirecting
                }
            }
        } else { // Base Divine Arts nullifies votes
            if (processedVotes[divinePlayerName]) {
                processedVotes[divinePlayerName] = [];
            }
        }
    });

    const voteEntries = Object.entries(processedVotes).map(([player, finalVoters]) => {
        // Recalculate total votes based on the potentially filtered voter list
        let totalVotes = 0;
        finalVoters.forEach(voterName => {
            let voteValue = 1; // Base vote
            const voterRole = getRoleOfPlayer(voterName);
            const activeModifiers = Object.keys(ROLE_MODIFIERS).filter(modKey => getStorageJson(modKey).includes(voterName));

            // Apply modifiers with extraVotes
            activeModifiers.forEach(modKey => {
                const modConfig = ROLE_MODIFIERS[modKey];
                if (modConfig.extraVotes) {
                    voteValue += modConfig.extraVotes;
                }
            });

            // --- Gol D. Roger vote transfer logic ---
            const rogerPlayers = getStorageJson('gold_roger');
            const rogerTargets = getStorageJson('gold_rogerSelectedTargets', {});
            const rogerPlusPlayers = getStorageJson('plus');

            // Check if the current voter is a target of any Gol D. Roger
            for (const rogerName of rogerPlayers) {
                if (rogerTargets[rogerName] === voterName) {
                    const isPlus = rogerPlusPlayers.includes(rogerName);
                    voteValue += isPlus ? 2 : 1;
                    break; // A player can only be a target once
                }
            }

            totalVotes += Math.max(0, voteValue); // vote count doesnt go negative
        });
        return [player, totalVotes];
    }).map(([player, totalVotes]) => {
        // Post-process total votes for abilities of the player being voted for
        const playerRole = getRoleOfPlayer(player);
        const playerModifiers = Object.keys(ROLE_MODIFIERS).filter(modKey => getStorageJson(modKey).includes(player));
        
        // Apply Imposter+ modifier
        if ((ROLE_DATA[playerRole] || INNOCENT_CONFIG).roleType === 'imposter' && playerModifiers.includes('plus')) {
            totalVotes = Math.max(0, totalVotes - 1);
        }
        // Apply Jester+ modifier
        if (playerRole === 'jesters' && playerModifiers.includes('plus')) {
            totalVotes += 1;
        }
        return [player, totalVotes];
    });

    if (voteEntries.length === 0) {
        resultContainer.innerHTML = `<p>No votes were cast.</p>`;
        return;
    }

    // Sort by votes descending
    voteEntries.sort(([, countA], [, countB]) => countB - countA);

    const maxVotes = voteEntries[0][1];

    // Determine game outcome based on who was voted out
    let gameOutcome = 'in_progress';
    let playersOut = voteEntries.filter(([, count]) => count === maxVotes).map(([player]) => player);
    let tieBroken = false;

    if (playersOut.length > 1) {
        // Randomly selecting player for ties
        tieBroken = true;
        const randomIndex = Math.floor(Math.random() * playersOut.length);
        const votedOutPlayer = playersOut[randomIndex];
        playersOut = [votedOutPlayer]; // playersOut will only have one player
    }

    if (playersOut.length === 1) {
        const votedOutPlayer = playersOut[0];
        const votedOutRole = getRoleOfPlayer(votedOutPlayer);
        const roleConfig = ROLE_DATA[votedOutRole] || INNOCENT_CONFIG;

        if (roleConfig.roleType === 'imposter') {
            gameOutcome = 'innocents_win';
        } else if (votedOutRole === 'jesters') {
            gameOutcome = 'jester_wins';
        } else if (getStorageJson('terrorist').includes(votedOutPlayer)) {
            gameOutcome = 'terrorist_event';
        } else {
            gameOutcome = 'imposters_win';
        }
    } else {
        // This case handles no votes or a 0-0 tie where no one is out.
        gameOutcome = 'tie';
    }

    const title = document.createElement('h2');
    title.className = 'titan-one-regular';
    if (tieBroken) {
        title.innerHTML = `TIE-BREAKER! <span style="font-size: 1rem; opacity: 0.8;">(Randomly Selected)</span>`;
    } else {
        title.textContent = 'Total Votes';
    }
    title.textContent = 'Total Votes';
    resultContainer.appendChild(title);

    const allWinStates = {};
    const allPlayers = getStorageJson('current_players');

    allPlayers.forEach(player => {
        const playerName = player.player_name;
        allWinStates[playerName] = false; // Default to loss
    });

    // Handle game-overriding modifiers (Cheater, Happy)
    const cheaters = getStorageJson('cheater');
    const happyPlayers = getStorageJson('happy');

    if (cheaters.length > 0) {
        // If a cheater exists, only they win.
        cheaters.forEach(cheaterName => allWinStates[cheaterName] = true);
    } else if (happyPlayers.length > 0) {
        // If a happy person exists (and no cheater), everyone wins.
        Object.keys(allWinStates).forEach(pName => allWinStates[pName] = true);
    } else {
        // --- REGULAR WIN CONDITION LOGIC ---
        allPlayers.forEach(player => {
            const playerRole = getRoleOfPlayer(player.player_name);
            const roleConfig = ROLE_DATA[playerRole] || INNOCENT_CONFIG; 

            // Determine individual win/loss
            let playerWins = false;
            if (roleConfig.winCondition) {
                playerWins = roleConfig.winCondition({
                    player: player,
                    playersOut: playersOut,
                    votes: processedVotes, // Use the processed votes for win conditions
                    gameOutcome: gameOutcome,
                    allWinStates: allWinStates, // For roles like cheater/happy
                    getStorageJson: getStorageJson
                });
            } else {
                // Default team-based win conditions
                if (gameOutcome === 'jester_wins') {
                    // Jester already handled by its winCondition, so non-jesters lose
                    playerWins = false;
                } else if (gameOutcome === 'innocents_win') {
                    playerWins = roleConfig.roleType === 'innocent';
                } else if (gameOutcome === 'imposters_win') {
                    playerWins = roleConfig.roleType === 'imposter';
                } else if (gameOutcome === 'terrorist_event') {
                    playerWins = false; // Everyone loses
                }
            }

            allWinStates[player.player_name] = playerWins;
        });
    }
    
    allPlayers.forEach(player => {
        const playerName = player.player_name;
        // Find the final calculated vote count for this player from voteEntries
        const voteEntry = voteEntries.find(([pName]) => pName === playerName);
        const finalVoteCount = voteEntry ? voteEntry[1] : 0;

        const playerRole = getRoleOfPlayer(playerName);
        const roleConfig = ROLE_DATA[playerRole] || INNOCENT_CONFIG;
        let playerWins = allWinStates[playerName];
        const killedPlayers = Object.values(getStorageJson('ninjaSelectedTargets', {}));
        const isKilled = killedPlayers.includes(playerName);

        //if (isKilled) playerWins = false; // Killed players can't win

        // Special win conditions
        if (playerRole === 'hitmans' && playersOut.includes(getStorageJson('hitmanTargets', {})[playerName])) {
            playerWins = true; // Hitman wins if their target is voted out
        }

        const isVotedOut = playersOut.includes(playerName);
        const playerVoteDiv = document.createElement('div');
        playerVoteDiv.className = 'player-vote-result';
        if (isVotedOut) {
            playerVoteDiv.classList.add('is-max-vote');
        }
        if (playerWins) {
            playerVoteDiv.classList.add('is-winner');
        }

        const createBadgeHTML = (label, config) => {
            const bgColor = config.grad;
            const textColor = config.textColor || 'white';
            const borderColor = textColor === 'white' ? 'rgba(255,255,255,0.3)' : textColor;
            return `<div class="badge titan-one-regular" style="background: ${bgColor}; color: ${textColor}; border: 1px solid ${borderColor};">${label.toUpperCase()}</div>`;
        };

        // Get modifiers
        const activeModifiers = Object.keys(ROLE_MODIFIERS).filter(modKey => getStorageJson(modKey).includes(playerName));

        let roleAndModsHTML = `<div class="player-role-info">`;
        roleAndModsHTML += createBadgeHTML(roleConfig.label, roleConfig);

        if (activeModifiers.length > 0) {
            activeModifiers.forEach(modKey => {
                const modConfig = ROLE_MODIFIERS[modKey];
                roleAndModsHTML += createBadgeHTML(modConfig.label, modConfig);
            });
        }
        roleAndModsHTML += `</div>`;

        let extraInfoHTML = '';
        const wasShapeshifter = getStorageJson('shapeshifters').includes(playerName);
        const isUnselected = getStorageJson('unselected_shapeshifters').includes(playerName);
        const wasVenom = getStorageJson('original_venom').includes(playerName);
        const isStillVenom = getStorageJson('venom').includes(playerName);

        let roleExtra = '';
        if (wasShapeshifter && !isUnselected) roleExtra += ' (Shapeshifter)';
        if (wasVenom && !isStillVenom) roleExtra += ' (Venom)';
        
        Object.keys(ROLE_DATA).forEach(key => {
            if (ROLE_DATA[key].hasTarget) {
                const target = getStorageJson(`${getBaseRoleId(key)}Targets`, {})[playerName];
                if (target) roleExtra += ` [TARGET: ${target}]`;
            }
        });

        const inspectorClues = getStorageJson('inspectorClues', {});
        if (inspectorClues[playerName]) {
            roleExtra += ` [CLUE: ${inspectorClues[playerName]}]`;
        }

        if (roleExtra) {
            extraInfoHTML = `<div class="player-extra-info">${roleExtra.trim()}</div>`;
        }

        let killedStatusHTML = '';
        if (isKilled) {
            killedStatusHTML = `<div class="player-killed-status">KILLED</div>`; // Always show if killed
        }

        const winLossBadge = `<span class="win-loss-badge ${playerWins ? 'winner' : 'loser'}">${playerWins ? 'WINNER' : 'LOSER'}</span>`;

        playerVoteDiv.innerHTML = `
            <div class="player-details">
                <div class="player-info">${winLossBadge}<span class="player-name">${playerName}</span></div>
                ${killedStatusHTML}
                ${roleAndModsHTML}
                ${extraInfoHTML}
            </div>
            <span class="vote-count">${finalVoteCount} vote${finalVoteCount !== 1 ? 's' : ''}</span>`;
        resultContainer.appendChild(playerVoteDiv);
    });
}

function createRulesList() {
    const rulesContainer = document.createElement('div');
    rulesContainer.id = 'rules-container';
    rulesContainer.className = 'titan-one-regular';
    main.insertBefore(rulesContainer, document.getElementById('start-vote'));

    const rulesTitle = document.createElement('h2');
    rulesTitle.textContent = 'Game Rules';
    rulesContainer.appendChild(rulesTitle);

    const rulesList = document.createElement('ul');
    rulesList.id = 'rules-list';
    rulesList.innerHTML = `${RULES.map(rule => `<li>${rule}</li>`).join('')}`;
    rulesContainer.appendChild(rulesList);
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
    const startVoteBtn = document.createElement('button');
    startVoteBtn.id = 'start-vote';
    startVoteBtn.className = 'titan-one-regular';
    startVoteBtn.innerHTML = 'Start Vote';
    startVoteBtn.onclick = startVote;

    main.insertBefore(startVoteBtn, document.getElementById('back-button'));

    document.getElementById('big-text').innerHTML = 'DISCUSS';

    createRulesList();

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

    // Display Manual Action Buttons for roles like Pirate
    Object.keys(ROLE_DATA).forEach(roleKey => {
        const roleCfg = ROLE_DATA[roleKey];
        if (roleCfg.enableManualButton) {
            const playersWithRole = getStorageJson(roleKey);
            playersWithRole.forEach(playerName => {
                const manualBtn = document.createElement('button');
                manualBtn.id = `manual-action-btn-${playerName}`;
                manualBtn.className = 'titan-one-regular manual-action-btn';
                manualBtn.innerHTML = roleCfg.buttonText || 'Perform Action';
                manualBtn.onclick = () => {
                    // Call the function defined in roles.js
                    roleCfg.manualActionFunction({
                        playerName,
                        roleCfg,
                        getStorageJson,
                        getBaseRoleId,
                        manualBtn // Pass the button itself so it can be removed
                    });
                };

                main.insertBefore(manualBtn, startVoteBtn);
            });
        }
    });

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

                    const currentReveal = {
                        label: labelText,
                        names: targetPlayer,
                        grad: roleCfg.grad,
                        textColor: roleCfg.textColor
                    };

                    if (roleCfg.selectionRevealEffects) {
                        const effects = roleCfg.selectionRevealEffects;
                        let cumulativeChance = 0;
                        const chosenEffect = effects.find(effect => Math.random() < (cumulativeChance += effect.chance));

                        if (chosenEffect) {
                            currentReveal.names = chosenEffect.text.replace('<player>', targetPlayer.toUpperCase());

                            if (currentReveal.names.includes('<otherPlayer>')) {
                                const allPlayers = getStorageJson('current_players');
                                const otherPlayers = allPlayers.filter(p => p.player_name !== sourcePlayer && p.player_name !== targetPlayer);
                                let randomPlayerName = 'NO ONE ELSE';
                                if (otherPlayers.length > 0) {
                                    const randomPlayer = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
                                    randomPlayerName = randomPlayer.player_name;
                                }
                                currentReveal.names = currentReveal.names.replace('<otherPlayer>', randomPlayerName.toUpperCase());

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
                                currentReveal.label = ROLE_DATA['ninja'].revealText;
                                currentReveal.names = targetPlayer;
                                currentReveal.grad = ROLE_DATA['ninja'].grad;
                                currentReveal.textColor = ROLE_DATA['ninja'].textColor;
                            }
                        }
                    }

                    reveals.push(currentReveal);

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

    // Promise-based function to handle the global animation
    const playGlobalAnimation = () => new Promise(resolve => {
        const allPlayers = getStorageJson('current_players');
        const animationPath = allPlayers.map(p => getRoleOfPlayer(p.player_name))
            .map(roleKey => ROLE_DATA[roleKey]?.animation)
            .find(path => path);

        if (!animationPath) return resolve();

        const video = document.createElement('video');
        video.id = 'role-animation-video';
        video.src = animationPath;
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        document.body.appendChild(video);

        const onFinish = (duration = 4000) => {
            setTimeout(() => {
                video.style.opacity = '0';
                setTimeout(() => {
                    video.remove();
                    resolve();
                }, 500);
            }, duration);
        };

        video.onloadedmetadata = () => onFinish(video.duration ? video.duration * 1000 : 4000);
        video.onerror = () => { console.warn("Video failed to load."); onFinish(); };
    });

    // Move all "KILLED" reveals into one box
    const consolidatedReveals = [];
    const killedPlayers = new Set();
    const ninjaConfig = ROLE_DATA['ninja'];

    reveals.forEach(reveal => {
        if (reveal.label === ninjaConfig.revealText) {
            // Split names in case a reveal contains multiple
            const playersInReveal = reveal.names.split(',').map(n => n.trim());
            playersInReveal.forEach(p => killedPlayers.add(p));
        } else {
            consolidatedReveals.push(reveal);
        }
    });

    if (killedPlayers.size > 0) {
        const names = Array.from(killedPlayers).join(', ');
        consolidatedReveals.unshift({ label: ninjaConfig.revealText, names, grad: ninjaConfig.grad, textColor: ninjaConfig.textColor });
    }

    // Wait for the animation to finish before proceeding with timed popups
    await playGlobalAnimation();

    if (reveals.length > 0) {
        const overlay = document.createElement('div');
        overlay.id = 'reveal-overlay';
        document.body.appendChild(overlay);

        const revealContainer = document.createElement('div');
        revealContainer.id = 'reveal-container';
        document.body.appendChild(revealContainer);

        let revealTimeout;

        const closeRevealPopup = () => {
            if (revealTimeout) clearTimeout(revealTimeout);
            const container = document.getElementById('reveal-container');
            const ov = document.getElementById('reveal-overlay');
            if (container && ov) {
                container.style.transition = 'opacity 0.5s ease';
                ov.style.transition = 'opacity 0.5s ease';
                container.style.opacity = '0';
                ov.style.opacity = '0';
                setTimeout(() => {
                    container.remove();
                    ov.remove();
                }, 500);
            }
        };

        const closeBtn = document.createElement('button');
        closeBtn.id = 'close-reveal-btn';
        closeBtn.className = 'titan-one-regular';
        closeBtn.innerHTML = 'CLOSE';
        closeBtn.onclick = closeRevealPopup;
        revealContainer.appendChild(closeBtn);

        consolidatedReveals.forEach(data => {
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
        revealTimeout = setTimeout(closeRevealPopup, 15000);
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
