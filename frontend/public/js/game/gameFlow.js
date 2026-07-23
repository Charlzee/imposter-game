// Main controller for the discussion, timer, reveal, and ready-state flow.
export function createGameFlowController(dependencies) {
    const {
        mainElement,
        roleDisplayElement,
        readyButtonElement,
        rules,
        getSelectedWord,
        setSelectedWord,
        getCurrentIndex,
        setCurrentIndex,
        getGameTimer,
        setGameTimer,
        displayRole,
        hideRole,
        getRoleOfPlayer,
        startVote,
        fetchGameData,
        createSelectedWord,
        decidePlayerList,
        getStorageJson,
        getBaseRoleId,
        ROLE_DATA,
        INNOCENT_CONFIG,
        gameState,
        setSelectedTopic,
        setWords,
        setSelectedVoteTarget
    } = dependencies;

    // Build and insert the rules panel into the page.
    function createRulesList() {
        const rulesContainer = document.createElement('div');
        rulesContainer.id = 'rules-container';
        rulesContainer.className = 'titan-one-regular';
        mainElement.insertBefore(rulesContainer, document.getElementById('start-vote'));

        const rulesTitle = document.createElement('h2');
        rulesTitle.textContent = 'Game Rules';
        rulesContainer.appendChild(rulesTitle);

        const rulesList = document.createElement('ul');
        rulesList.id = 'rules-list';
        rulesList.innerHTML = `${rules.map((rule) => `<li>${rule}</li>`).join('')}`;
        rulesContainer.appendChild(rulesList);
    }

    // Start the discussion phase, timer, and reveal flow.
    async function startGame(updateStats = true) {
        const maxTime = 120;
        let time = maxTime;
        const timerDisplay = document.createElement('div');
        timerDisplay.id = 'timer-display';
        timerDisplay.innerHTML = `Time Remaining: ${time}s`;
        timerDisplay.style.fontSize = '1.5rem';
        mainElement.insertBefore(timerDisplay, document.getElementById('back-button'));

        const startVoteBtn = document.createElement('button');
        startVoteBtn.id = 'start-vote';
        startVoteBtn.className = 'titan-one-regular';
        startVoteBtn.innerHTML = 'Start Vote';
        startVoteBtn.onclick = startVote;

        mainElement.insertBefore(startVoteBtn, document.getElementById('back-button'));

        document.getElementById('big-text').innerHTML = 'DISCUSS';

        createRulesList();

        const activeEvents = JSON.parse(localStorage.getItem('active_random_events') || '[]');
        const visibleEvents = activeEvents.filter((eventKey) => !window.RANDOM_EVENTS?.[eventKey]?.displayEventOnShowRoles);

        if (visibleEvents.length > 0) {
            const eventBanner = document.createElement('div');
            eventBanner.id = 'active-events-banner';
            eventBanner.style.display = 'flex';
            eventBanner.style.justifyContent = 'center';
            eventBanner.style.gap = '10px';
            eventBanner.style.marginBottom = '20px';

            visibleEvents.forEach((eventKey) => {
                const eventCfg = window.RANDOM_EVENTS?.[eventKey];
                const badge = document.createElement('div');
                badge.className = 'badge-events titan-one-regular';
                badge.innerHTML = (eventCfg?.label || eventKey).toUpperCase();
                badge.style.background = eventCfg?.grad || 'linear-gradient(135deg, #FFD700 0%, #B8860B 100%)';
                badge.style.color = eventCfg?.textColor || 'white';
                badge.style.textShadow = '0 1px 2px rgba(0,0,0,0.5)';
                badge.style.border = `1px solid ${eventCfg?.textColor || '#FFD700'}`;
                eventBanner.appendChild(badge);
            });
            mainElement.insertBefore(eventBanner, timerDisplay);
        }

        Object.keys(ROLE_DATA).forEach((roleKey) => {
            const roleCfg = ROLE_DATA[roleKey];
            if (roleCfg.enableManualButton) {
                const baseRoleId = getBaseRoleId(roleCfg.class);
                if (sessionStorage.getItem(`manualActionCompleted_${baseRoleId}`) === 'true') return;

                const playersWithRole = getStorageJson(roleKey);
                playersWithRole.forEach((playerName) => {
                    const manualBtn = document.createElement('button');
                    manualBtn.id = `manual-action-btn-${playerName}`;
                    manualBtn.className = 'titan-one-regular manual-action-btn';
                    manualBtn.innerHTML = roleCfg.buttonText || 'Perform Action';

                    manualBtn.onclick = () => {
                        roleCfg.manualActionFunction({
                            playerName,
                            roleCfg,
                            getStorageJson,
                            getBaseRoleId,
                            manualBtn
                        });
                    };

                    mainElement.insertBefore(manualBtn, startVoteBtn);
                });
            }
        });

        const reveals = [];
        Object.keys(ROLE_DATA).forEach((roleKey) => {
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
                            const chosenEffect = effects.find((effect) => Math.random() < (cumulativeChance += effect.chance));

                            if (chosenEffect) {
                                currentReveal.names = chosenEffect.text.replace('<player>', targetPlayer.toUpperCase());

                                if (currentReveal.names.includes('<otherPlayer>')) {
                                    const allPlayers = getStorageJson('current_players');
                                    const otherPlayers = allPlayers.filter((player) => player.player_name !== sourcePlayer && player.player_name !== targetPlayer);
                                    let randomPlayerName = 'NO ONE ELSE';
                                    if (otherPlayers.length > 0) {
                                        const randomPlayer = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
                                        randomPlayerName = randomPlayer.player_name;
                                    }
                                    currentReveal.names = currentReveal.names.replace('<otherPlayer>', randomPlayerName.toUpperCase());

                                    if (chosenEffect.killOtherPlayer && randomPlayerName !== 'NO ONE ELSE') {
                                        const ninjaConfig = ROLE_DATA.ninja;
                                        reveals.push({
                                            label: ninjaConfig.revealText,
                                            names: randomPlayerName,
                                            grad: ninjaConfig.grad,
                                            textColor: ninjaConfig.textColor
                                        });
                                    }
                                }

                                if (chosenEffect.killPlayer) {
                                    currentReveal.label = ROLE_DATA.ninja.revealText;
                                    currentReveal.names = targetPlayer;
                                    currentReveal.grad = ROLE_DATA.ninja.grad;
                                    currentReveal.textColor = ROLE_DATA.ninja.textColor;
                                }
                            }
                        }

                        reveals.push(currentReveal);

                        if (roleCfg.alsoKillsSelf) {
                            const ninjaConfig = ROLE_DATA.ninja;
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
        reveals.forEach((reveal) => {
            if (reveal.label === ROLE_DATA.ninja.revealText) {
                const victim = reveal.names;
                ninjaKills[`kill_${victim}`] = victim;
            }
        });
        localStorage.setItem('ninjaSelectedTargets', JSON.stringify(ninjaKills));

        const playGlobalAnimation = () => new Promise((resolve) => {
            const allPlayers = getStorageJson('current_players');
            const animationPath = allPlayers
                .map((player) => getRoleOfPlayer(player.player_name))
                .map((roleKey) => ROLE_DATA[roleKey]?.animation)
                .find((path) => path);

            if (!animationPath || sessionStorage.getItem('globalAnimationPlayed') === 'true') return resolve();

            const video = document.createElement('video');
            video.id = 'role-animation-video';
            video.src = animationPath;
            video.autoplay = true;
            video.muted = true;
            video.playsInline = true;
            document.body.appendChild(video);
            video.play();

            const onFinish = (duration = 4000) => {
                setTimeout(() => {
                    video.style.opacity = '0';
                    setTimeout(() => {
                        sessionStorage.setItem('globalAnimationPlayed', 'true');
                        video.remove();
                        resolve();
                    }, 500);
                }, duration);
            };

            video.onloadedmetadata = () => onFinish(video.duration ? video.duration * 1000 : 4000);
            video.onerror = () => { console.warn('Video failed to load.'); onFinish(); };
        });

        const consolidatedReveals = [];
        const killedPlayers = new Set();
        const ninjaConfig = ROLE_DATA.ninja;

        reveals.forEach((reveal) => {
            if (reveal.label === ninjaConfig.revealText) {
                const playersInReveal = reveal.names.split(',').map((name) => name.trim());
                playersInReveal.forEach((playerName) => killedPlayers.add(playerName));
            } else {
                consolidatedReveals.push(reveal);
            }
        });

        if (killedPlayers.size > 0) {
            const names = Array.from(killedPlayers).join(', ');
            consolidatedReveals.unshift({ label: ninjaConfig.revealText, names, grad: ninjaConfig.grad, textColor: ninjaConfig.textColor });
        }

        await playGlobalAnimation();

        if (reveals.length > 0 && sessionStorage.getItem('revealContainerShown') !== 'true') {
            sessionStorage.setItem('revealContainerShown', 'true');
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
                const overlayElement = document.getElementById('reveal-overlay');
                if (container && overlayElement) {
                    container.style.transition = 'opacity 0.5s ease';
                    overlayElement.style.transition = 'opacity 0.5s ease';
                    container.style.opacity = '0';
                    overlayElement.style.opacity = '0';
                    setTimeout(() => {
                        container.remove();
                        overlayElement.remove();
                    }, 500);
                }
            };

            const closeBtn = document.createElement('button');
            closeBtn.id = 'close-reveal-btn';
            closeBtn.className = 'titan-one-regular';
            closeBtn.innerHTML = 'CLOSE';
            closeBtn.onclick = closeRevealPopup;
            revealContainer.appendChild(closeBtn);

            consolidatedReveals.forEach((data) => {
                const roleBox = document.createElement('div');
                roleBox.classList.add('role-box');
                roleBox.style.background = data.grad || 'linear-gradient(135deg, #009a79, #001e60)';
                roleBox.style.border = `4px solid ${data.textColor || '#2ea19b'}`;

                roleBox.innerHTML = `
                    <h1 class="titan-one-regular" style="font-size: 1.8rem; margin: 0 0 10px 0; text-shadow: 0 4px 10px rgba(0,0,0,0.5);">${data.label}</h1>
                    <div class="titan-one-regular" style="font-size: 1.4rem;">${data.names}</div>
                `;
                revealContainer.appendChild(roleBox);
            });

            requestAnimationFrame(() => {
                overlay.style.opacity = '1';
                revealContainer.style.opacity = '1';
            });

            revealTimeout = setTimeout(closeRevealPopup, 15000);
        }

        const timer = setInterval(() => {
            time -= 1;
            timerDisplay.innerHTML = `Time Remaining: ${time}s`;
            if (time <= 0) {
                timerDisplay.innerHTML = "Time's up!";
                clearInterval(timer);
            }
        }, 1000);
        setGameTimer(timer);

        if (updateStats) {
            const token = localStorage.getItem('token');
            if (token) {
                fetch('https://imposter-gm.com/api/auth/update-stats', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ local_plays: 1 })
                }).catch(() => {});
            }
        }
    }

    // Return to the lobby and stop the timer.
    function lobby() {
        if (confirm('Are you sure you want to go back to lobby?')) {
            const timer = getGameTimer();
            if (timer) clearInterval(timer);
            window.location.href = 'create/local.html';
        }
    }

    // Load game data and prepare the initial screen.
    async function init() {
        await fetchGameData(gameState);
        setSelectedTopic(gameState.selectedTopic);
        setWords(gameState.words);
        window.lobby = lobby;

        if (localStorage.getItem('game_started') === 'true') {
            roleDisplayElement.remove();
            readyButtonElement.remove();
            setSelectedWord(decodeURIComponent(atob(localStorage.getItem('selected_word'))));
            await startGame(false);
            return;
        }

        sessionStorage.removeItem('globalAnimationPlayed');
        sessionStorage.removeItem('revealContainerShown');
        Object.keys(localStorage).forEach((key) => {
            if (key.startsWith('gambler_')) {
                if (key !== 'gambler_count' && key !== 'gambler_percent') {
                    localStorage.removeItem(key);
                }
            }
        });

        localStorage.removeItem('inspectorClues');
        localStorage.removeItem('innocents');
        localStorage.removeItem('justificationWords');
        localStorage.removeItem('original_venom');
        Object.keys(ROLE_DATA).forEach((roleKey) => {
            const baseId = getBaseRoleId(roleKey);
            if (ROLE_DATA[roleKey].hasTarget) localStorage.removeItem(`${baseId}Targets`);
            if (ROLE_DATA[roleKey].selectPlayer) localStorage.removeItem(`${baseId}SelectedTargets`);
            if (ROLE_DATA[roleKey].selectCustom) localStorage.removeItem(`${baseId}CustomSelection`);
        });

        const dynamicCounts = {};
        Object.keys(ROLE_DATA).forEach((roleKey) => {
            const baseId = getBaseRoleId(roleKey);
            dynamicCounts[baseId] = localStorage.getItem(`${baseId}_count`);
        });

        const selectedWordValue = createSelectedWord(gameState);
        setSelectedWord(selectedWordValue);
        await decidePlayerList(localStorage.getItem('current_players'), dynamicCounts, {
            words: gameState.words,
            selectedWord: selectedWordValue
        });
        hideRole(getCurrentIndex());
    }

    // Connect the ready button to the role reveal flow.
    function attachReadyHandler() {
        readyButtonElement.addEventListener('click', () => {
            const players = getStorageJson('current_players');
            const name = players[getCurrentIndex() - 1]?.player_name;

            const isUnselected = getStorageJson('unselected_shapeshifters').includes(name);
            const baseRoleKey = Object.keys(ROLE_DATA).find((roleKey) => getStorageJson(roleKey).includes(name)) || (isUnselected ? 'shapeshifters' : null);
            const config = ROLE_DATA[baseRoleKey] || INNOCENT_CONFIG;

            if (!document.getElementById('role-status').classList.contains('hidden')) {
                if (isUnselected) {
                    return alert('Please select a role first!');
                }
                if (config.selectPlayer && !getStorageJson(`${getBaseRoleId(baseRoleKey)}SelectedTargets`, {})[name]) {
                    return alert('Please select a target first!');
                }
            }

            if (sessionStorage.getItem('current_player_is_ready') !== 'true') {
                sessionStorage.setItem('current_player_is_ready', 'true');
                displayRole(getCurrentIndex());
            } else {
                if (getCurrentIndex() < players.length) {
                    setCurrentIndex(getCurrentIndex() + 1);
                    hideRole(getCurrentIndex());
                } else {
                    localStorage.setItem('game_started', 'true');
                    roleDisplayElement.remove();
                    readyButtonElement.remove();
                    startGame();
                }
            }
        });
    }

    return {
        createRulesList,
        startGame,
        lobby,
        init,
        attachReadyHandler
    };
}
