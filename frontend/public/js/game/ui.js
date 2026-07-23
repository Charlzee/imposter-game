import { ROLE_MODIFIERS, ROLE_DATA, INNOCENT_CONFIG, getBaseRoleId } from '../roles.js';
import { getStorageJson } from './storage.js';
import { getRandomLetter, getRandomLetterOrNumber } from '../global.js';
import { getRoleOfPlayer } from './playerUtils.js';

// Controller for rendering role cards, words, and role-specific UI sections.
export function createRoleUiController() {
    let currentWords = [];
    let currentSelectedWord = null;
    let roleDisplay = null;

    // Store the current word list and chosen word for the active role view.
    function setGameContext({ words = [], selectedWord = null } = {}) {
        currentWords = words;
        currentSelectedWord = selectedWord;
    }

    // Connect the UI controller to the DOM role display container.
    function initialize({ roleDisplayElement }) {
        roleDisplay = roleDisplayElement;
    }

    // Show the role UI for the selected player.
    function displayRole(playerIndex) {
        if (!roleDisplay) {
            roleDisplay = document.getElementById('role-display');
        }

        const players = getStorageJson('current_players');
        const playerName = players[playerIndex - 1]?.player_name || 'Unknown';

        const roleTitle = document.getElementById('role-title');
        const roleStatus = document.getElementById('role-status');
        const roleTip = document.getElementById('role-tip');
        const wordDisplay = document.getElementById('word');

        const allRoleClasses = [...Object.values(ROLE_DATA).map((role) => role.class), ...Object.values(ROLE_MODIFIERS).map((modifier) => modifier.class), 'innocent', 'hidden'];

        let baseRoleKey = getRoleOfPlayer(playerName);

        const activeModifiers = Object.keys(ROLE_MODIFIERS).filter((modifierKey) => getStorageJson(modifierKey).includes(playerName));
        const config = ROLE_DATA[baseRoleKey] || INNOCENT_CONFIG;

        let activeUiConfig = config;
        const overridingModifierKey = activeModifiers.find((modifierKey) => ROLE_MODIFIERS[modifierKey].overrideRoleDisplay);
        if (overridingModifierKey) {
            activeUiConfig = ROLE_MODIFIERS[overridingModifierKey];
        }

        function updateUi(configUi, forcedRoleClass = null) {
            roleStatus.classList.remove(...allRoleClasses);

            document.getElementById('modifiers-wrapper')?.remove();
            document.getElementById('role-animation-video')?.remove();
            document.getElementById('roles-list')?.remove();

            if (!overridingModifierKey) {
                let roleTypeEl = document.getElementById('role-type');
                if (!roleTypeEl) {
                    roleTypeEl = document.createElement('div');
                    roleTypeEl.id = 'role-type';
                    roleStatus.parentNode.insertBefore(roleTypeEl, roleStatus);
                }
                roleTypeEl.innerHTML = configUi.roleType ? `TYPE: ${configUi.roleType}` : '';
            }

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
            activeModifiers.forEach((modifierKey) => {
                if (ROLE_MODIFIERS[modifierKey].overrideWordVisibility) {
                    displayTheWord = ROLE_MODIFIERS[modifierKey].showWord;
                }
            });

            let content = '';
            if (configUi.showsOtherWords && currentWords && currentWords.length > 0) {
                const otherWords = currentWords.filter((word) => word !== currentSelectedWord);
                const shuffledOthers = [...otherWords].sort(() => 0.5 - Math.random());
                const selection = [currentSelectedWord, ...shuffledOthers.slice(0, 4)];
                const finalDisplay = selection.sort(() => 0.5 - Math.random());
                content = `ONE OF THESE IS THE WORD:\n- ${finalDisplay.join('\n- ')}`;
            } else {
                const justificationWords = getStorageJson('justificationWords', {});
                const justificationWord = justificationWords[playerName];
                if (justificationWord) {
                    content = `YOUR FAKE WORD IS:\n${justificationWord}`;
                    if (config.showWord) content += `\n\nTHE REAL WORD IS:\n${currentSelectedWord}`;
                } else {
                    content = displayTheWord ? currentSelectedWord : '';
                }
            }

            Object.keys(ROLE_DATA).forEach((roleKey) => {
                const roleCfg = ROLE_DATA[roleKey];
                if (roleCfg.revealRoleToInnocents) {
                    const publicPlayers = getStorageJson(roleKey);
                    publicPlayers.forEach((name) => {
                        if (playerName !== name && (!baseRoleKey || baseRoleKey === 'innocents')) {
                            content += (content ? '\n\n' : '') + `THE ${roleCfg.label.toUpperCase()} IS: ${name}`;
                        }
                    });
                }
            });

            const plusPlayers = getStorageJson('plus');
            plusPlayers.forEach((name) => {
                const roleKeys = Object.keys(ROLE_DATA).filter((key) => key !== 'shapeshifters');
                let playerRoleKey = roleKeys.find((key) => getStorageJson(key).includes(name));
                if (!playerRoleKey && getStorageJson('shapeshifters').includes(name) && getStorageJson('unselected_shapeshifters').includes(name)) {
                    playerRoleKey = 'shapeshifters';
                }

                const isActuallyInnocent = (!playerRoleKey || playerRoleKey === 'innocents') && !getStorageJson('shapeshifters').includes(name);
                if (isActuallyInnocent && playerName !== name && (!baseRoleKey || baseRoleKey === 'innocents')) {
                    content += (content ? '\n\n' : '') + `CONFIRMED INNOCENT [Plus Ability]: ${name}`;
                }
            });

            let displayTheTheme = configUi.showTheme || config.showTheme;
            activeModifiers.forEach((modifierKey) => {
                if (ROLE_MODIFIERS[modifierKey].showTheme) {
                    displayTheTheme = true;
                }
            });

            if (displayTheTheme) {
                const currentTheme = (localStorage.getItem('selected_theme') || 'Unknown Theme').replace('_', ' ');
                if (content) {
                    content += `\nTHEME: ${currentTheme}`;
                } else {
                    content = `THEME: ${currentTheme}`;
                }
            }

            Object.keys(ROLE_DATA).forEach((key) => {
                const roleConfig = ROLE_DATA[key];
                if (roleConfig.hasTarget) {
                    const targets = getStorageJson(`${getBaseRoleId(key)}Targets`, {});
                    if (targets[playerName]) {
                        content += `\n\nYOUR TARGET: ${targets[playerName]}`;
                    }
                }
            });

            wordDisplay.innerHTML = content;

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
                    players.forEach((player) => {
                        if (player.player_name === playerName && !config.canSelectSelf) return;
                        const btn = document.createElement('div');
                        btn.className = 'player-view-role';
                        btn.dataset.playerName = player.player_name;
                        btn.innerHTML = player.player_name;
                        btn.style.background = config.grad;
                        btn.onclick = () => {
                            if (selectionAmount > 1) {
                                if (!playerSelections.includes(player.player_name)) {
                                    playerSelections.push(player.player_name);
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
                                currentSelections[playerName] = player.player_name;
                                localStorage.setItem(storageKey, JSON.stringify(currentSelections));
                                displayRole(playerIndex);
                            }
                        };
                        selectionList.appendChild(btn);
                    });
                    updatePrompt();
                    roleDisplay.insertBefore(selectionList, document.getElementById('role-tip'));
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
                const isSelectionComplete = selectionAmount > 1 ? optionSelections.length >= selectionAmount : !!optionSelections;

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
                    options.forEach((option) => {
                        const btn = document.createElement('div');
                        btn.className = 'player-view-role';
                        btn.dataset.optionName = option.display;
                        btn.innerHTML = option.display;
                        btn.style.background = option.color || '#fff';
                        btn.style.color = '#fff';
                        btn.onclick = () => {
                            localStorage.setItem(storageKeyTip, option.tip || 'no text');
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
                    updatePrompt();
                    roleDisplay.insertBefore(selectionList, document.getElementById('role-tip'));
                } else {
                    const selectedDisplay = Array.isArray(optionSelections) ? optionSelections.join(', ') : optionSelections;
                    wordDisplay.innerHTML += `\n\nSELECTED: ${selectedDisplay}`;
                    wordDisplay.innerHTML += `\n\n${localStorage.getItem(storageKeyTip) || 'error'}`;
                }
            }

            let modsWrapper = null;
            if (activeModifiers.length > 0) {
                modsWrapper = document.createElement('div');
                modsWrapper.id = 'modifiers-wrapper';
                roleDisplay.insertBefore(modsWrapper, document.getElementById('word-area-wrapper') || wordDisplay);
            }

            activeModifiers.forEach((modifierKey) => {
                const modConfig = ROLE_MODIFIERS[modifierKey];
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
                modTitle.id = 'mod-title';
                modTitle.innerHTML = modConfig.label;
                modTitle.style.color = modConfig.textColor;

                const modTip = document.createElement('p');
                modTip.id = 'mod-tip';

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

                    if (playerRole === 'innocents') {
                        tipText += '[All other innocents know you are innocent]';
                    } else if (playerRoleConfig.roleType === 'imposter') {
                        tipText += '[Your final vote count will be 1 less]';
                    } else if (playerRole === 'shapeshifters') {
                        if (getStorageJson('unselected_shapeshifters').includes(playerName)) {
                            tipText += '[You can select 1 extra role modifier to have]';
                        } else {
                            tipText += '[Used to select extra modifier]';
                        }
                    } else if (playerRole === 'divine_art') {
                        tipText += '[You can redirect any votes cast onto you to whoever you vote for]';
                    } else if (playerRole === 'gold_roger') {
                        tipText += '[The player you give your will to will receive 2 votes instead of 1]';
                    } else if (playerRole === 'alphas') {
                        tipText += '[Votes from Imposter roles against you are ignored]';
                    } else {
                        tipText += '[NONE]';
                    }
                }

                if (modConfig.hasTarget) {
                    const targets = getStorageJson(`${getBaseRoleId(modifierKey)}Targets`, {});
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
            const blacklistedImposterRoles = Object.keys(ROLE_DATA).filter((key) => ROLE_DATA[key].showWord === false);
            const allPlayers = getStorageJson('current_players');
            const combinedImposters = [];
            blacklistedImposterRoles.forEach((key) => {
                combinedImposters.push(...getStorageJson(key));
            });

            const nonImposters = allPlayers.filter((player) => player.player_name !== playerName && !combinedImposters.includes(player.player_name));
            if (nonImposters.length > 0) {
                const randomIdx = Math.floor(Math.random() * nonImposters.length);
                const clueName = nonImposters[randomIdx].player_name;

                const inspectorClues = getStorageJson('inspectorClues', {});
                inspectorClues[playerName] = clueName;
                localStorage.setItem('inspectorClues', JSON.stringify(inspectorClues));
                return clueName;
            }
            return 'No matching players found';
        }

        updateUi(activeUiConfig);

        if (config.isVenom && baseRoleKey === 'venom') {
            const venomTargets = getStorageJson('venomSelectedTargets', {});
            const myTarget = venomTargets[playerName];

            if (myTarget) {
                const ninjaKills = getStorageJson('ninjaSelectedTargets', {});
                ninjaKills[`kill_${myTarget}`] = myTarget;
                localStorage.setItem('ninjaSelectedTargets', JSON.stringify(ninjaKills));

                const allRoleKeys = Object.keys(ROLE_DATA);
                let targetRoleKey = allRoleKeys.find((key) => getStorageJson(key).includes(myTarget));
                if (!targetRoleKey) targetRoleKey = 'innocents';

                if (targetRoleKey !== 'innocents') {
                    const targetRoleList = getStorageJson(targetRoleKey);
                    if (!targetRoleList.includes(playerName)) {
                        targetRoleList.push(playerName);
                        localStorage.setItem(targetRoleKey, JSON.stringify(targetRoleList));
                    }
                }

                const venomPlayers = getStorageJson('venom').filter((name) => name !== playerName);
                localStorage.setItem('venom', JSON.stringify(venomPlayers));

                displayRole(playerIndex);
                return;
            }
        }

        if (config.isShapeshifter) {
            const selectionList = document.createElement('div');
            selectionList.id = 'roles-list';
            if (config.selectionListColor) selectionList.style.background = config.selectionListColor;
            selectionList.style.marginTop = '30px';

            const selectableRoles = Object.keys(ROLE_DATA).filter((key) => ROLE_DATA[key].selectable);
            selectableRoles.forEach((roleKey) => {
                const roleCfg = ROLE_DATA[roleKey];
                const roleBtn = document.createElement('div');
                const isPlus = activeModifiers.some((modifierKey) => ROLE_MODIFIERS[modifierKey].isPlus);

                roleBtn.className = 'player-view-role';
                roleBtn.innerHTML = roleCfg.label;
                roleBtn.style.background = roleCfg.grad;

                roleBtn.onclick = () => {
                    if (roleKey !== 'innocents') {
                        const existingList = getStorageJson(roleKey);
                        if (!existingList.includes(playerName)) {
                            existingList.push(playerName);
                            localStorage.setItem(roleKey, JSON.stringify(existingList));
                        }

                        if (ROLE_DATA[roleKey]?.hasTarget) {
                            const targetKey = `${getBaseRoleId(roleKey)}Targets`;
                            const targets = getStorageJson(targetKey, {});
                            if (!targets[playerName]) {
                                const allPlayers = getStorageJson('current_players');
                                const myIdx = allPlayers.findIndex((p) => p.player_name === playerName);
                                let targetIdx;
                                do { targetIdx = Math.floor(Math.random() * allPlayers.length); } while (targetIdx === myIdx && allPlayers.length > 1);
                                targets[playerName] = allPlayers[targetIdx].player_name;
                                localStorage.setItem(targetKey, JSON.stringify(targets));
                            }
                        }
                    }

                    const currentUnselected = getStorageJson('unselected_shapeshifters').filter((name) => name !== playerName);
                    localStorage.setItem('unselected_shapeshifters', JSON.stringify(currentUnselected));

                    if (isPlus) {
                        selectionList.innerHTML = '<h3 class="titan-one-regular" style="color: #29D1FF; width: 100%; text-align: center; margin-bottom: 15px; font-weight: bold;">SELECT EXTRA MODIFIER</h3>';

                        const plusCfg = ROLE_MODIFIERS.plus;
                        if (plusCfg && plusCfg.selectionListColor) {
                            selectionList.style.background = plusCfg.selectionListColor;
                        }

                        Object.keys(ROLE_MODIFIERS).forEach((modifierKey) => {
                            const modCfg = ROLE_MODIFIERS[modifierKey];
                            if (modCfg.isPlus || modifierKey === 'amnesias' || modifierKey === 'happy' || modifierKey === 'cheater') return;

                            const modBtn = document.createElement('div');
                            modBtn.className = 'player-view-role';
                            modBtn.innerHTML = modCfg.label;
                            modBtn.style.background = modCfg.grad;

                            modBtn.onclick = (event) => {
                                event.stopPropagation();
                                const modStorage = getStorageJson(modifierKey);
                                if (!modStorage.includes(playerName)) {
                                    modStorage.push(playerName);
                                    localStorage.setItem(modifierKey, JSON.stringify(modStorage));
                                }

                                if (modCfg.hasTarget) {
                                    const targetKey = `${getBaseRoleId(modifierKey)}Targets`;
                                    const targets = getStorageJson(targetKey, {});
                                    if (!targets[playerName]) {
                                        const allPlayers = getStorageJson('current_players');
                                        const myIdx = allPlayers.findIndex((p) => p.player_name === playerName);
                                        let targetIdx;
                                        do { targetIdx = Math.floor(Math.random() * allPlayers.length); } while (targetIdx === myIdx && allPlayers.length > 1);
                                        targets[playerName] = allPlayers[targetIdx].player_name;
                                        localStorage.setItem(targetKey, JSON.stringify(targets));
                                    }
                                }

                                selectionList.remove();
                                displayRole(playerIndex);
                            };
                            selectionList.appendChild(modBtn);
                        });
                    } else {
                        displayRole(playerIndex);
                    }
                };
                selectionList.appendChild(roleBtn);
            });

            roleDisplay.insertBefore(selectionList, document.getElementById('role-tip'));
        } else if (config.hasClue) {
            const playerToShow = getInspectorClue();
            wordDisplay.innerHTML += `\n\nONE NON-IMPOSTER:\n${playerToShow}`;
        }

        if (config.isGambler) {
            let gambleContainer = document.getElementById('gamble-container');
            let gambleBtn;
            let gambleChanceDisplay;
            let gambleHistoryContainer;

            const deathChanceKey = `gambler_death_chance_${playerName}`;
            const historyKey = `gambler_history_${playerName}`;
            const effectsKey = `gambler_effects`;
            let gambleHistory;

            if (!gambleContainer) {
                gambleContainer = document.createElement('div');
                gambleContainer.id = 'gamble-container';

                gambleBtn = document.createElement('button');
                gambleBtn.id = 'gamble-btn';
                gambleBtn.className = 'titan-one-regular';
                gambleBtn.innerHTML = 'Gamble';

                gambleChanceDisplay = document.createElement('div');
                gambleChanceDisplay.id = 'gamble-chance-display';
                gambleChanceDisplay.className = 'titan-one-regular';

                gambleHistoryContainer = document.createElement('div');
                gambleHistoryContainer.id = 'gamble-history';

                gambleContainer.appendChild(gambleBtn);
                gambleContainer.appendChild(gambleChanceDisplay);
                gambleContainer.appendChild(gambleHistoryContainer);
                roleDisplay.insertBefore(gambleContainer, document.getElementById('role-tip'));
            } else {
                gambleBtn = document.getElementById('gamble-btn');
                gambleChanceDisplay = document.getElementById('gamble-chance-display');
                gambleHistoryContainer = document.getElementById('gamble-history');
            }

            const gambleActions = config.gambleActions || [];
            gambleBtn.onclick = () => {
                if (gambleActions.length === 0) {
                    gambleHistory.innerHTML += 'No gamble actions defined!<br>';
                    return;
                }

                let currentDeathChance = parseFloat(localStorage.getItem(deathChanceKey) || '0');
                if (Math.random() < currentDeathChance) {
                    const ninjaKills = getStorageJson('ninjaSelectedTargets', {});
                    ninjaKills[`kill_${playerName}`] = playerName;
                    localStorage.setItem('ninjaSelectedTargets', JSON.stringify(ninjaKills));
                    alert('You gambled and died! WOMP WOMP');
                    displayRole(playerIndex);
                    return;
                }

                localStorage.setItem(deathChanceKey, Math.min(1, currentDeathChance + 0.07));

                const action = gambleActions[Math.floor(Math.random() * gambleActions.length)];
                const history = getStorageJson(historyKey, []);
                history.push(action.name);
                localStorage.setItem(historyKey, JSON.stringify(history));

                if (action.action) {
                    const liveHelpers = {
                        players,
                        playerIndex: playerIndex - 1,
                        playerName,
                        getImposter: () => {
                            const imposterRoles = Object.keys(ROLE_DATA).filter((key) => ROLE_DATA[key].roleType === 'imposter');
                            const allImposters = imposterRoles.flatMap((key) => getStorageJson(key));
                            return allImposters.length > 0 ? allImposters[Math.floor(Math.random() * allImposters.length)] : 'No One';
                        },
                        getInnocent: () => {
                            const allPlayers = getStorageJson('current_players').map((entry) => entry.player_name);
                            const goodPlayerRoles = Object.keys(ROLE_DATA).filter((key) => ROLE_DATA[key].roleType === 'innocent');
                            const allGoodPlayers = goodPlayerRoles.flatMap((key) => getStorageJson(key));
                            const baseInnocents = allPlayers.filter((entry) => getRoleOfPlayer(entry) === 'innocents');
                            const combinedGood = [...new Set([...allGoodPlayers, ...baseInnocents])];
                            const potentialTargets = combinedGood.filter((entry) => entry !== playerName);
                            return potentialTargets.length > 0 ? potentialTargets[Math.floor(Math.random() * potentialTargets.length)] : 'No One';
                        },
                        displayRole: () => displayRole(playerIndex),
                        addHistory: (text) => {
                            const historyEntries = getStorageJson(historyKey, []);
                            historyEntries.push(text);
                            localStorage.setItem(historyKey, JSON.stringify(historyEntries));
                        },
                        setGambleEffect: (targetPlayer, effect) => {
                            const effects = getStorageJson(effectsKey, {});
                            if (!effects[targetPlayer]) effects[targetPlayer] = [];
                            effects[targetPlayer].push(effect);
                            localStorage.setItem(effectsKey, JSON.stringify(effects));
                        },
                        modifyDeathChance: (targetName, amount) => {
                            const key = `gambler_death_chance_${targetName}`;
                            const current = parseFloat(localStorage.getItem(key) || '0');
                            localStorage.setItem(key, Math.max(0, current + amount));
                        },
                        killPlayer: (targetName) => {
                            const kills = getStorageJson('ninjaSelectedTargets', {});
                            kills[`kill_${targetName}`] = targetName;
                            localStorage.setItem('ninjaSelectedTargets', JSON.stringify(kills));
                        },
                        setRole: (idx, roleKey) => {
                            const name = players[idx]?.player_name;
                            if (!name) return;
                            Object.keys(ROLE_DATA).forEach((roleKeyName) => {
                                const list = getStorageJson(roleKeyName).filter((entryName) => entryName !== name);
                                localStorage.setItem(roleKeyName, JSON.stringify(list));
                            });
                            const unselected = getStorageJson('unselected_shapeshifters').filter((entryName) => entryName !== name);
                            localStorage.setItem('unselected_shapeshifters', JSON.stringify(unselected));
                            const targetList = getStorageJson(roleKey);
                            if (!targetList.includes(name)) {
                                targetList.push(name);
                                localStorage.setItem(roleKey, JSON.stringify(targetList));
                            }
                        },
                        addModifier: (idx, modifierKey) => {
                            const name = players[idx]?.player_name;
                            if (!name) return;
                            const list = getStorageJson(modifierKey);
                            if (!list.includes(name)) {
                                list.push(name);
                                localStorage.setItem(modifierKey, JSON.stringify(list));
                            }
                        }
                    };
                    action.action(liveHelpers);
                }
                displayRole(playerIndex);
            };

            const currentDeathChance = parseFloat(localStorage.getItem(deathChanceKey) || '0');
            gambleChanceDisplay.innerHTML = `CHANCE OF DEATH: <span style="color: #ff4444;">${(currentDeathChance * 100).toFixed(0)}%</span>`;

            const history = getStorageJson(historyKey, []);
            gambleHistoryContainer.innerHTML = '<h3>Gamble History:</h3>' + (history.length > 0 ? `<ul>${history.map((item) => `<li>${item}</li>`).join('')}</ul>` : '<p>No gambles yet.</p>');

            const effects = getStorageJson(effectsKey, {});
            const playerEffects = effects[playerName] || [];

            if (playerEffects.includes('no_more_gambling')) {
                gambleBtn.disabled = true;
                gambleBtn.innerHTML = 'No More Gambling';
                gambleBtn.style.filter = 'grayscale(1)';
            }

            const killedPlayers = Object.values(getStorageJson('ninjaSelectedTargets', {}));
            if (killedPlayers.includes(playerName)) {
                gambleBtn.disabled = true;
                gambleBtn.innerHTML = 'You are Dead';
                gambleBtn.style.filter = 'grayscale(1)';
                gambleChanceDisplay.style.display = 'none';
            }
        }
    }

    // Hide the visible role UI for the current player.
    function hideRole(playerIndex) {
        if (!roleDisplay) {
            roleDisplay = document.getElementById('role-display');
        }

        sessionStorage.setItem('current_player_is_ready', 'false');
        const players = getStorageJson('current_players');
        const playerName = players[playerIndex - 1]?.player_name || 'Player';

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

        document.querySelectorAll('.modifier-container').forEach((el) => el.remove());
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

    return {
        setGameContext,
        initialize,
        displayRole,
        hideRole
    };
}
