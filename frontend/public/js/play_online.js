import { getURLParameter, getRandomLetter, toTitleCase } from './global.js';
import { ROLE_DATA_ONLINE, ROLE_MODIFIERS_ONLINE, INNOCENT_CONFIG, getBaseRoleId } from './roles.js';

let myUsername = '';
let lastFetchedMessageId = 0;
let chatPollInterval;
let votePollInterval;
let currentPlayersInRoom = [];
let hasVoted = false;
const CHAT_POLL_INTERVAL_MS = 1500; // 1.5 seconds

async function initOnlinePlay() {
    const code = getURLParameter('code');
    const token = localStorage.getItem('token');

    const meRes = await fetch("https://imposter-gm.com/api/auth/me", {
        headers: { "Authorization": `Bearer ${token}` }
    });
    const meData = await meRes.json();
    myUsername = meData.user;

    // Fetch assigned roles
    const roomRes = await fetch(`https://imposter-gm.com/api/auth/rooms/${code}/status`, {
        headers: { "Authorization": `Bearer ${token}` }
    });
    const game = await roomRes.json();

    let myRoleKey = Object.keys(ROLE_DATA_ONLINE).find(key => game[key]?.includes(myUsername));
    const activeModifiers = Object.keys(ROLE_MODIFIERS_ONLINE).filter(key => game[key]?.includes(myUsername));
    let config = ROLE_DATA_ONLINE[myRoleKey] || INNOCENT_CONFIG;
    const myWord = game.word;

    const roleTitle = document.getElementById('role-title');
    const roleStatus = document.getElementById('role-status');
    const wordDisplay = document.getElementById('word');
    const roleTip = document.getElementById('role-tip');
    const roleDisplay = document.getElementById('role-display');

    // Voting UI elements
    const main = document.getElementById('main');
    const voteSection = document.createElement('div');

    const chatInput = document.getElementById('chat-input');
    const sendChatButton = document.getElementById('send-chat');
    const chatMessagesContainer = document.getElementById('chat-messages');

    const allRoleClasses = [...Object.values(ROLE_DATA_ONLINE).map(r => r.class), ...Object.values(ROLE_MODIFIERS_ONLINE).map(m => m.class), 'innocent', 'hidden'];

    roleStatus.classList.remove('hidden');
    roleTitle.textContent = `YOUR ROLE IS:`;

    function updateUi(configUi) {
        roleStatus.classList.remove(...allRoleClasses);
        document.querySelectorAll('.modifier-container').forEach(el => el.remove());

        const hasAmnesia = activeModifiers.includes('amnesias');
        if (hasAmnesia) {
            roleStatus.textContent = "%?$?£$";
            roleStatus.classList.add('amnesia');
            const darkAmnesiaColor = 'rgb(30, 110, 150)';
            roleStatus.style.color = darkAmnesiaColor;
            roleStatus.style.textShadow = `7px 7px 4px rgba(0, 0, 0, 0.4), 6px 6px 10px ${darkAmnesiaColor}`;
            roleDisplay.style.backgroundImage = ROLE_MODIFIERS_ONLINE.amnesias.grad;
            roleTip.textContent = ROLE_MODIFIERS_ONLINE.amnesias.tip;
        } else {
            roleStatus.textContent = configUi.label;
            roleStatus.classList.add(configUi.class);
            const activeColor = configUi.textColor || 'white';
            roleStatus.style.color = activeColor;
            roleStatus.style.textShadow = `7px 7px 4px rgba(0, 0, 0, 0.4), 6px 6px 10px ${activeColor}`;
            roleDisplay.style.backgroundImage = configUi.grad;
            roleTip.textContent = configUi.tip;
        }

        let displayTheWord = configUi.showWord;
        activeModifiers.forEach(modKey => {
            if (ROLE_MODIFIERS_ONLINE[modKey].overrideWordVisibility) {
                displayTheWord = ROLE_MODIFIERS_ONLINE[modKey].showWord;
            }
        });

        let content = displayTheWord ? myWord : '';

        // Theme Visibility logic
        if (configUi.showTheme || config.showTheme || activeModifiers.some(m => ROLE_MODIFIERS_ONLINE[m].showTheme)) {
            const theme = localStorage.getItem('selected_topic') || "Unknown";
            content += `\nTHEME: ${theme}`;
        }

        if (game.hitmanTargets?.[myUsername]) content += `\n\nYOUR TARGET: ${game.hitmanTargets[myUsername]}`;
        if (game.guardian_angelTargets?.[myUsername]) content += `\n\nYOUR TARGET: ${game.guardian_angelTargets[myUsername]}`;
        if (game.annoyingTargets?.[myUsername]) content += `\n\nYOUR TARGET: ${game.annoyingTargets[myUsername]}`;
        if (game.inspectorClues?.[myUsername]) content += `\n\nONE NON-IMPOSTER:\n[${game.inspectorClues[myUsername]}]`;

        wordDisplay.textContent = content;
        renderModifiers();
    }

    function renderModifiers() {
        activeModifiers.forEach(modKey => {
            const modConfig = ROLE_MODIFIERS_ONLINE[modKey];
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
            modTip.textContent = (modKey === 'monkey') ? `${modConfig.tip}[${getRandomLetter()}]` : modConfig.tip;
            const activeSubColor = modConfig.subTextColor || '#fff';
            modTip.style.color = activeSubColor;
            modTip.style.textShadow = `5px 5px 3px rgba(0, 0, 0, 0.4), 4px 4px 8px ${activeSubColor}`;
            modTip.style.margin = '0';
            modTip.style.fontSize = '1.1rem';
            modTip.style.whiteSpace = 'pre-line';

            modContainer.appendChild(modTitle);
            modContainer.appendChild(modTip);
            roleDisplay.insertBefore(modContainer, wordDisplay);
        });
    }

    // Shapeshifter Selection UI
    if (myRoleKey === 'shapeshifters') {
        const exclude = ["shapeshifter", "hidden", "amnesia", "mime"];
        const selectionContainer = document.createElement('div');
        selectionContainer.id = 'shapeshifter-role-selection';
        selectionContainer.classList.add('shapeshifter-role-selection');

        const addRoleBtn = (roleClass, roleConfigKey, customConfig = null) => {
            const roleBtn = document.createElement('button');
            roleBtn.className = 'titan-one-regular';
            roleBtn.textContent = toTitleCase(roleClass.replace('_', ' '));
            roleBtn.onclick = () => {
                updateUi(customConfig || ROLE_DATA_ONLINE[roleConfigKey]);
                selectionContainer.remove();
            };
            selectionContainer.appendChild(roleBtn);
        };

        addRoleBtn('innocent', 'innocents', INNOCENT_CONFIG);
        Object.keys(ROLE_DATA_ONLINE)
            .filter(k => !exclude.includes(ROLE_DATA_ONLINE[k].class))
            .forEach(key => addRoleBtn(ROLE_DATA_ONLINE[key].class, key));

        roleDisplay.insertBefore(selectionContainer, roleTip);
    }

    updateUi(config);

    sendChatButton.onclick = () => sendChatMessage(code, token, chatInput);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendChatMessage(code, token, chatInput);
        }
    });

    // Start polling chat messages
    await fetchChatMessages(code, token);
    chatPollInterval = setInterval(() => fetchChatMessages(code, token), CHAT_POLL_INTERVAL_MS);

    voteSection.id = 'vote-section';
    voteSection.innerHTML = `
        <h2 class="titan-one-regular">Who do you want to vote out?</h2>
        <div id="player-vote-list" class="shapeshifter-role-selection"></div>
        <button id="submit-vote-btn" class="titan-one-regular" disabled>SUBMIT VOTE</button>
        <div id="vote-tallies" class="titan-one-regular"></div>
    `;
    document.querySelector('.role-section').appendChild(voteSection);

    // Fetch current players for voting list
    const playersRes = await fetch(`https://imposter-gm.com/api/auth/rooms/${code}/players`, {
        headers: { "Authorization": `Bearer ${token}` }
    });
    if (playersRes.ok) {
        const playersData = await playersRes.json();
        currentPlayersInRoom = playersData.map(p => p.username);
        const playerVoteList = document.getElementById('player-vote-list');
        currentPlayersInRoom.forEach(player => {
            if (player === myUsername) return; // Can't vote for self
            const voteButton = document.createElement('button');
            voteButton.className = 'titan-one-regular vote-player-btn';
            voteButton.textContent = player;
            voteButton.onclick = () => selectPlayerToVote(player, token, code);
            playerVoteList.appendChild(voteButton);
        });
    }

    // Start polling for votes
    await fetchVoteCounts(code, token);
    votePollInterval = setInterval(() => fetchVoteCounts(code, token), CHAT_POLL_INTERVAL_MS);
}

async function sendChatMessage(code, token, chatInput) {
    const message = chatInput.value.trim();
    if (!message) return;

    try {
        const response = await fetch(`https://imposter-gm.com/api/auth/rooms/${code}/chat`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message })
        });

        if (response.ok) {
            chatInput.value = ''; // Clear input

            await fetchChatMessages(code, token);
        } else {
            console.error("Failed to send message:", response.status, await response.text());
            alert("Failed to send message.");
        }
    } catch (error) {
        console.error("Error sending message:", error);
        alert("Error sending message.");
    }
}

async function fetchChatMessages(code, token) {
    const chatMessagesContainer = document.getElementById('chat-messages');
    const response = await fetch(`https://imposter-gm.com/api/auth/rooms/${code}/chat?last_id=${lastFetchedMessageId}`, {
        headers: { "Authorization": `Bearer ${token}` }
    });
    if (response.ok) {
        const newMessages = await response.json();
        newMessages.forEach(msg => {
            const messageElement = document.createElement('div');
            messageElement.className = 'chat-message';
            messageElement.innerHTML = `<strong>${msg.username}:</strong> ${msg.message}`;
            chatMessagesContainer.appendChild(messageElement);
            lastFetchedMessageId = msg.id; // Update last fetched ID
        });
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight; // Scroll to bottom
    } else {
        console.error("Failed to fetch chat messages:", response.status, await response.text());
    }
}

function selectPlayerToVote(player, token, code) {
    document.querySelectorAll('.vote-player-btn').forEach(btn => btn.classList.remove('is-selected'));
    const selectedBtn = Array.from(document.querySelectorAll('.vote-player-btn')).find(btn => btn.textContent === player);
    if (selectedBtn) selectedBtn.classList.add('is-selected');

    const submitVoteBtn = document.getElementById('submit-vote-btn');
    submitVoteBtn.disabled = false;
    submitVoteBtn.onclick = () => castVote(code, token, player);
}

async function castVote(code, token, votedForUsername) {
    if (hasVoted) return; // Prevent double voting

    try {
        const response = await fetch(`https://imposter-gm.com/api/auth/rooms/${code}/vote`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ voted_for_username: votedForUsername })
        });

        if (response.ok) {
            hasVoted = true;
            const submitBtn = document.getElementById('submit-vote-btn');
            submitBtn.disabled = true;
            submitBtn.textContent = "VOTE CAST!";
            document.querySelectorAll('.vote-player-btn').forEach(btn => btn.disabled = true);
            await fetchVoteCounts(code, token); // Update tallies immediately
        } else {
            const errorData = await response.json();
            alert(errorData.error || "Failed to cast vote.");
        }
    } catch (error) {
        console.error("Error casting vote:", error);
    }
}

async function fetchVoteCounts(code, token) {
    const voteTalliesContainer = document.getElementById('vote-tallies');
    if (!voteTalliesContainer) return;

    const response = await fetch(`https://imposter-gm.com/api/auth/rooms/${code}/votes`, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (response.ok) {
        const voteResults = await response.json();
        if (voteResults.length > 0) {
            voteTalliesContainer.innerHTML = `<h3>Current Votes:</h3>`;
            voteResults.forEach(result => {
                voteTalliesContainer.innerHTML += `<p>${result.voted_for_username}: ${result.votes}</p>`;
            });
        } else {
            voteTalliesContainer.innerHTML = `<p>No votes cast yet.</p>`;
        }
    }
}

document.addEventListener('DOMContentLoaded', initOnlinePlay);
