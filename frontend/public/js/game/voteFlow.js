import { ROLE_MODIFIERS, ROLE_DATA, INNOCENT_CONFIG, getBaseRoleId } from '../roles.js';
import { getStorageJson } from './storage.js';
import { getLivingPlayers, getRoleOfPlayer } from './playerUtils.js';

// Controller for the vote screen, vote selection, and vote results display.
export function createVoteController({ mainElement, getSelectedWord, getSelectedVoteTarget, setSelectedVoteTarget }) {
    // Build the vote UI and reset vote state.
    function startVote() {
        document.getElementById('start-vote')?.remove();
        document.getElementById('big-text').innerHTML = 'VOTE';

        localStorage.setItem('votes', JSON.stringify({}));
        localStorage.setItem('voted_players', JSON.stringify([]));

        const voteContainer = document.createElement('div');
        voteContainer.id = 'vote-container';

        const players = getStorageJson('current_players');
        const playerButtonsContainer = document.createElement('div');
        playerButtonsContainer.id = 'vote-players-grid';

        players.forEach((player) => {
            const playerBtn = document.createElement('div');
            playerBtn.className = 'player-view-role vote-player-btn';
            playerBtn.dataset.playerName = player.player_name;
            playerBtn.innerHTML = player.player_name;
            playerBtn.onclick = () => selectVoteTarget(player.player_name);
            playerButtonsContainer.appendChild(playerBtn);
        });

        voteContainer.appendChild(playerButtonsContainer);

        const confirmBtn = document.createElement('button');
        confirmBtn.id = 'confirm-vote-btn';
        confirmBtn.className = 'titan-one-regular';
        confirmBtn.innerHTML = 'CONFIRM VOTE';
        confirmBtn.disabled = true;
        confirmBtn.onclick = () => {
            const selectedTarget = getSelectedVoteTarget();
            if (selectedTarget) {
                castVote(selectedTarget);
                document.querySelectorAll('.vote-player-btn.is-selected').forEach((button) => button.classList.remove('is-selected'));
                setSelectedVoteTarget(null);
                confirmBtn.disabled = true;
            }
        };

        voteContainer.appendChild(confirmBtn);

        mainElement.appendChild(voteContainer);
        updateVoterPrompt();
    }

    // Mark the selected player as the current vote target.
    function selectVoteTarget(playerName) {
        document.querySelectorAll('.vote-player-btn.is-selected').forEach((button) => button.classList.remove('is-selected'));

        const targetBtn = document.querySelector(`.vote-player-btn[data-player-name="${playerName}"]`);
        if (targetBtn) {
            targetBtn.classList.add('is-selected');
            setSelectedVoteTarget(playerName);
        }

        const confirmBtn = document.getElementById('confirm-vote-btn');
        if (confirmBtn) {
            confirmBtn.disabled = false;
        }
    }

    // Show whose turn it is to vote.
    function updateVoterPrompt() {
        let voterPrompt = document.getElementById('voter-prompt');
        if (!voterPrompt) {
            voterPrompt = document.createElement('h2');
            voterPrompt.id = 'voter-prompt';
            voterPrompt.className = 'titan-one-regular';
            mainElement.insertBefore(voterPrompt, document.getElementById('vote-container'));
        }

        const livingPlayers = getLivingPlayers();
        const votedPlayers = getStorageJson('voted_players');
        const nextVoter = livingPlayers.find((player) => !votedPlayers.includes(player.player_name));

        document.querySelectorAll('.vote-player-btn').forEach((button) => {
            button.classList.remove('disabled');
            button.classList.remove('is-killed');
        });

        if (nextVoter) {
            voterPrompt.innerHTML = `${nextVoter.player_name}'s VOTE:`;

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

    // Store one vote and advance to the next voter.
    function castVote(votedFor) {
        const livingPlayers = getLivingPlayers();
        const votedPlayers = getStorageJson('voted_players');
        const nextVoter = livingPlayers.find((player) => !votedPlayers.includes(player.player_name));

        if (!nextVoter) return;

        let finalVotedFor = votedFor;
        const voterName = nextVoter.player_name;

        const gamblerEffects = getStorageJson('gambler_effects', {});
        const voterEffects = gamblerEffects[voterName] || [];

        if (voterEffects.includes('vote_controlled_by_imposter')) {
            const imposterRoles = Object.keys(ROLE_DATA).filter((key) => ROLE_DATA[key].roleType === 'imposter');
            const allImposters = imposterRoles.flatMap((key) => getStorageJson(key));
            const currentVotes = getStorageJson('votes', {});
            let imposterTarget = null;

            for (const target in currentVotes) {
                const votersForTarget = currentVotes[target];
                const imposterVoter = votersForTarget.find((name) => allImposters.includes(name));
                if (imposterVoter) {
                    imposterTarget = target;
                    break;
                }
            }

            if (imposterTarget) {
                finalVotedFor = imposterTarget;
            } else {
                const allPlayers = getStorageJson('current_players').map((player) => player.player_name);
                const innocentPlayers = allPlayers.filter((player) => !allImposters.includes(player) && player !== voterName);

                if (innocentPlayers.length > 0) {
                    const randomInnocent = innocentPlayers[Math.floor(Math.random() * innocentPlayers.length)];
                    finalVotedFor = randomInnocent;
                }
            }
        }

        const votes = getStorageJson('votes', {});
        if (!votes[finalVotedFor]) {
            votes[finalVotedFor] = [];
        }
        votes[finalVotedFor].push(voterName);

        localStorage.setItem('votes', JSON.stringify(votes));

        votedPlayers.push(voterName);
        localStorage.setItem('voted_players', JSON.stringify(votedPlayers));

        if (votedPlayers.length >= livingPlayers.length) {
            tallyVotes();
        } else {
            updateVoterPrompt();
        }
    }

    // Calculate totals and render the final vote summary.
    function tallyVotes() {
        document.getElementById('vote-container')?.remove();
        document.getElementById('voter-prompt')?.remove();
        document.getElementById('big-text').innerHTML = 'VOTE RESULTS';

        const resultContainer = document.createElement('div');
        resultContainer.id = 'vote-result';
        mainElement.appendChild(resultContainer);

        const wordInfo = document.createElement('div');
        wordInfo.id = 'word-display-result';
        wordInfo.className = 'titan-one-regular';
        wordInfo.innerHTML = `The Word Was: <span style="color: #ffeb3b;">${getSelectedWord()}</span>`;
        resultContainer.appendChild(wordInfo);

        const activeEvents = getStorageJson('active_random_events', []);
        const hiddenEvents = activeEvents.filter((key) => window.RANDOM_EVENTS?.[key]?.displayEventOnShowRoles);
        if (hiddenEvents.length > 0) {
            const eventInfo = document.createElement('div');
            eventInfo.id = 'event-display-result';
            hiddenEvents.forEach((key) => {
                const eventCfg = window.RANDOM_EVENTS?.[key];
                const badge = document.createElement('div');
                badge.className = 'random-event-badge titan-one-regular';
                badge.innerHTML = (eventCfg?.label || key).toUpperCase();
                badge.style.background = eventCfg?.grad || 'linear-gradient(135deg, #FFD700 0%, #B8860B 100%)';
                badge.style.color = eventCfg?.textColor || 'white';
                badge.style.border = `1px solid ${eventCfg?.textColor || '#FFD700'}`;
                eventInfo.appendChild(badge);
            });
            resultContainer.appendChild(eventInfo);
        }

        const votes = getStorageJson('votes', {});
        const processedVotes = JSON.parse(JSON.stringify(votes));

        Object.keys(processedVotes).forEach((votedForPlayer) => {
            const playerRole = getRoleOfPlayer(votedForPlayer);
            const playerModifiers = Object.keys(ROLE_MODIFIERS).filter((modifierKey) => getStorageJson(modifierKey).includes(votedForPlayer));
            const roleConfig = ROLE_DATA[playerRole] || INNOCENT_CONFIG;

            if (roleConfig.plusAbility && playerModifiers.includes('plus')) {
                const originalVoters = processedVotes[votedForPlayer];
                const filteredVoters = roleConfig.plusAbility(originalVoters, { getRoleOfPlayer, ROLE_DATA, INNOCENT_CONFIG });
                processedVotes[votedForPlayer] = filteredVoters;
            }
        });

        const divinePlayers = getStorageJson('divine_art');
        const plusPlayers = getStorageJson('plus');

        divinePlayers.forEach((divinePlayerName) => {
            const isPlus = plusPlayers.includes(divinePlayerName);

            if (isPlus) {
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
                        processedVotes[divinePlayerName] = [];
                    }
                }
            } else if (processedVotes[divinePlayerName]) {
                processedVotes[divinePlayerName] = [];
            }
        });

        const livingPlayers = getLivingPlayers().map((player) => player.player_name);

        const voteEntries = livingPlayers.map((player) => {
            let totalVotes = 0;
            const finalVoters = processedVotes[player] || [];
            finalVoters.forEach((voterName) => {
                let voteValue = 1;
                const voterRole = getRoleOfPlayer(voterName);
                const activeModifiers = Object.keys(ROLE_MODIFIERS).filter((modifierKey) => getStorageJson(modifierKey).includes(voterName));

                activeModifiers.forEach((modifierKey) => {
                    const modifierConfig = ROLE_MODIFIERS[modifierKey];
                    if (modifierConfig.extraVotes) {
                        voteValue += modifierConfig.extraVotes;
                    }
                });

                const rogerPlayers = getStorageJson('gold_roger');
                const rogerTargets = getStorageJson('gold_rogerSelectedTargets', {});
                const rogerPlusPlayers = getStorageJson('plus');

                for (const rogerName of rogerPlayers) {
                    if (rogerTargets[rogerName] === voterName) {
                        const isPlus = rogerPlusPlayers.includes(rogerName);
                        voteValue += isPlus ? 2 : 1;
                        break;
                    }
                }

                totalVotes += Math.max(0, voteValue);
            });

            const playerRole = getRoleOfPlayer(player);
            const playerModifiers = Object.keys(ROLE_MODIFIERS).filter((modifierKey) => getStorageJson(modifierKey).includes(player));
            const gamblerEffects = getStorageJson('gambler_effects', {});
            const playerGambleEffects = gamblerEffects[player] || [];
            const extraVotesFromGambler = playerGambleEffects.filter((effect) => effect === 'extra_vote_received').length;
            if (extraVotesFromGambler > 0) {
                totalVotes += extraVotesFromGambler;
            }

            const selfVotesFromGambler = playerGambleEffects.filter((effect) => effect === 'voted_against_self').length;
            if (selfVotesFromGambler > 0) {
                totalVotes += selfVotesFromGambler;
            }

            if ((ROLE_DATA[playerRole] || INNOCENT_CONFIG).roleType === 'imposter' && playerModifiers.includes('plus')) {
                totalVotes = Math.max(0, totalVotes - 1);
            }
            if (playerRole === 'jesters' && playerModifiers.includes('plus')) {
                totalVotes += 1;
            }
            return [player, totalVotes];
        });

        if (voteEntries.length === 0) {
            resultContainer.innerHTML = '<p>No votes were cast.</p>';
            return;
        }

        voteEntries.sort(([, countA], [, countB]) => countB - countA);
        const maxVotes = voteEntries[0][1];

        let gameOutcome = 'in_progress';
        let playersOut = voteEntries.filter(([, count]) => count === maxVotes).map(([player]) => player);
        let tieBroken = false;

        if (playersOut.length > 1) {
            tieBroken = true;
            const randomIndex = Math.floor(Math.random() * playersOut.length);
            const votedOutPlayer = playersOut[randomIndex];
            playersOut = [votedOutPlayer];
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
            gameOutcome = 'tie';
        }

        const title = document.createElement('h2');
        title.className = 'titan-one-regular';
        title.textContent = 'Total Votes';
        if (tieBroken) {
            title.innerHTML = `TIE-BREAKER! <span style="font-size: 1rem; opacity: 0.8;">(Randomly Selected)</span>`;
        }
        resultContainer.appendChild(title);

        const allWinStates = {};
        const allPlayers = getStorageJson('current_players');

        allPlayers.forEach((player) => {
            allWinStates[player.player_name] = false;
        });

        const cheaters = getStorageJson('cheater');
        const happyPlayers = getStorageJson('happy');

        if (cheaters.length > 0) {
            cheaters.forEach((cheaterName) => {
                allWinStates[cheaterName] = true;
            });
        } else if (happyPlayers.length > 0) {
            Object.keys(allWinStates).forEach((playerName) => {
                allWinStates[playerName] = true;
            });
        } else {
            allPlayers.forEach((player) => {
                const playerRole = getRoleOfPlayer(player.player_name);
                const roleConfig = ROLE_DATA[playerRole] || INNOCENT_CONFIG;

                let playerWins = false;
                if (roleConfig.winCondition) {
                    playerWins = roleConfig.winCondition({
                        player,
                        playersOut,
                        votes: processedVotes,
                        gameOutcome,
                        allWinStates,
                        getStorageJson
                    });
                } else if (gameOutcome === 'jester_wins') {
                    playerWins = false;
                } else if (gameOutcome === 'innocents_win') {
                    playerWins = roleConfig.roleType === 'innocent';
                } else if (gameOutcome === 'imposters_win') {
                    playerWins = roleConfig.roleType === 'imposter';
                } else if (gameOutcome === 'terrorist_event') {
                    playerWins = false;
                }

                allWinStates[player.player_name] = playerWins;
            });
        }

        allPlayers.forEach((player) => {
            const playerName = player.player_name;
            const voteEntry = voteEntries.find(([name]) => name === playerName);
            const finalVoteCount = voteEntry ? voteEntry[1] : 0;
            const playerRole = getRoleOfPlayer(playerName);
            const roleConfig = ROLE_DATA[playerRole] || INNOCENT_CONFIG;
            let playerWins = allWinStates[playerName];
            const killedPlayers = Object.values(getStorageJson('ninjaSelectedTargets', {}));
            const isKilled = killedPlayers.includes(playerName);

            if (playerRole === 'hitmans' && playersOut.includes(getStorageJson('hitmanTargets', {})[playerName])) {
                playerWins = true;
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

            const activeModifiers = Object.keys(ROLE_MODIFIERS).filter((modifierKey) => getStorageJson(modifierKey).includes(playerName));

            let roleAndModsHTML = '<div class="player-role-info">';
            roleAndModsHTML += createBadgeHTML(roleConfig.label, roleConfig);

            if (activeModifiers.length > 0) {
                activeModifiers.forEach((modifierKey) => {
                    const modifierConfig = ROLE_MODIFIERS[modifierKey];
                    roleAndModsHTML += createBadgeHTML(modifierConfig.label, modifierConfig);
                });
            }
            roleAndModsHTML += '</div>';

            let extraInfoHTML = '';
            const wasShapeshifter = getStorageJson('shapeshifters').includes(playerName);
            const isUnselected = getStorageJson('unselected_shapeshifters').includes(playerName);
            const wasVenom = getStorageJson('original_venom').includes(playerName);
            const isStillVenom = getStorageJson('venom').includes(playerName);

            let roleExtra = '';
            if (wasShapeshifter && !isUnselected) roleExtra += ' (Shapeshifter)';
            if (wasVenom && !isStillVenom) roleExtra += ' (Venom)';

            Object.keys(ROLE_DATA).forEach((roleKey) => {
                if (ROLE_DATA[roleKey].hasTarget) {
                    const target = getStorageJson(`${getBaseRoleId(roleKey)}Targets`, {})[playerName];
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
                killedStatusHTML = '<div class="player-killed-status">KILLED</div>';
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

    return {
        startVote,
        selectVoteTarget,
        updateVoterPrompt,
        castVote,
        tallyVotes
    };
}
