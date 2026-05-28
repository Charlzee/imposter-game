import { getRandomInt } from './global.js';
import getWords from './words.js';
import { ROLE_DATA, ROLE_MODIFIERS, getBaseRoleId, getPluralKey } from './roles.js';

export function generateJoinCode() {
    return Math.floor(Math.random() * 10000).toString().padStart(4, '0');
}

export async function hostOnlineGame(retries = 5) {
    const code = generateJoinCode();
    const token = localStorage.getItem('token');
    if (!token) {
        alert("You must be logged in to host a game.");
        window.location.href = '../login.html';
        return;
    }
    const topic = localStorage.getItem('selected_topic') || 'foods_and_drinks';

    const response = await fetch("https://imposter-gm.com/api/auth/rooms/create", {
        method: "POST",
        headers: { 
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json" 
        },
        body: JSON.stringify({ 
            code, 
            settings: { topic } 
        })
    });

    if (response.ok) {
        window.location.href = `/create/online.html?code=${code}&isHost=true`;
    } else if (response.status === 409 && retries > 0) {
        // If code is taken, try again automatically with a new code
        return hostOnlineGame(retries - 1);
    } else {
        const contentType = response.headers.get("content-type");
        try {
            if (contentType && contentType.includes("application/json")) {
                const data = await response.json();
                alert(`${data.error || "Failed to create online room."}\n\nDetails: ${data.details || "No details provided"}`);
            } else {
                alert(`Server Error: ${response.status} ${response.statusText}`);
            }
        } catch (e) {
            alert("Failed to create online room. Connection error.");
        }
    }
}

export async function joinOnlineGame(code) {
    const token = localStorage.getItem('token');
    if (!token) {
        alert("You must be logged in to join a game.");
        window.location.href = './login.html';
        return;
    }

    const response = await fetch("https://imposter-gm.com/api/auth/rooms/join", {
        method: "POST",
        headers: { 
            "Authorization": `Bearer ${token}`, 
            "Content-Type": "application/json" 
        },
        body: JSON.stringify({ code })
    });

    if (response.ok) {
        window.location.href = `/create/online.html?code=${code}&isHost=false`;
    } else {
        try {
            const data = await response.json();
            alert(data.error || "Room not found.");
        } catch (e) {
            alert("An error occurred while joining the room.");
        }
    }
}

export async function updatePlayerList(code) {
    const token = localStorage.getItem('token');
    const response = await fetch(`https://imposter-gm.com/api/auth/rooms/${code}/players`, {
        headers: { "Authorization": `Bearer ${token}` }
    });
    
    if (response.ok) {
        const players = await response.json();
        const list = document.getElementById('player-list');
        if (list) {
            list.innerHTML = players.map(p => `<div class="player-tile"><span>${p.username}</span></div>`).join('');
            localStorage.setItem('current_players', JSON.stringify(players.map(p => ({ player_name: p.username }))));
        }
    }
}

export async function startGameServer(code) {
    const token = localStorage.getItem('token');

    const topics = await getWords();
    const topicId = localStorage.getItem('selected_topic') || 'foods_and_drinks';
    const selectedTopic = topics.find(t => t.id === topicId) || topics[0];
    const word = selectedTopic.words[getRandomInt(selectedTopic.words.length)];

    const players = JSON.parse(localStorage.getItem('current_players') || '[]');
    const gameSettings = { word };

    Object.keys(ROLE_DATA).forEach(key => gameSettings[key] = []);
    Object.keys(ROLE_MODIFIERS).forEach(key => gameSettings[key] = []);
    gameSettings.unselected_shapeshifters = [];
    gameSettings.inspectorClues = {};

    const occupiedIndices = new Set();
    const activeRoleKeys = Object.keys(ROLE_DATA);

    activeRoleKeys.forEach(roleKey => {
        const baseId = getBaseRoleId(roleKey);
        const count = parseInt(localStorage.getItem(`${baseId}_count`)) || (roleKey === 'imposters' ? 1 : 0);
        const spawnChance = parseInt((localStorage.getItem(`${baseId}_percent`) || "100%").replace('%', '')) / 100;

        for (let i = 0; i < count; i++) {
            if (occupiedIndices.size >= players.length) break;
            if (Math.random() < spawnChance) {
                let idx;
                do { idx = Math.floor(Math.random() * players.length); } while (occupiedIndices.has(idx));
                occupiedIndices.add(idx);
                gameSettings[roleKey].push(players[idx].player_name);
                
                if (roleKey === 'shapeshifters') {
                    gameSettings.unselected_shapeshifters.push(players[idx].player_name);
                }
            }
        }
    });

    // Assign Modifiers
    players.forEach(player => {
        Object.keys(ROLE_MODIFIERS).forEach(modKey => {
            const modConfig = ROLE_MODIFIERS[modKey];
            if (modKey === 'amnesias' && gameSettings.shapeshifters.includes(player.player_name)) return;

            if (Math.random() < modConfig.chance) {
                gameSettings[modKey].push(player.player_name);
            }
        });
    });

    // Assign Targets and Clues
    const assignTargets = (roleArray, storageKey) => {
        const targets = {};
        roleArray.forEach(name => {
            const myIdx = players.findIndex(p => p.player_name === name);
            let targetIdx;
            do { targetIdx = Math.floor(Math.random() * players.length); } while (targetIdx === myIdx && players.length > 1);
            targets[name] = players[targetIdx].player_name;
        });
        gameSettings[storageKey] = targets;
    };

    if (gameSettings.hitmans.length) assignTargets(gameSettings.hitmans, 'hitmanTargets');
    if (gameSettings.guardian_angels.length) assignTargets(gameSettings.guardian_angels, 'guardian_angelTargets');
    if (gameSettings.annoying.length) assignTargets(gameSettings.annoying, 'annoyingTargets');

    // Inspector Clues
    gameSettings.inspectors.forEach(name => {
        const BlacklistedImposterRoles = Object.keys(ROLE_DATA).filter(k => ROLE_DATA[k].showWord === false);
        const combinedImposters = [];
        BlacklistedImposterRoles.forEach(key => combinedImposters.push(...gameSettings[key]));

        const nonImposters = players.filter(p => 
            p.player_name !== name && !combinedImposters.includes(p.player_name)
        );

        if (nonImposters.length > 0) {
            const randomIdx = Math.floor(Math.random() * nonImposters.length);
            gameSettings.inspectorClues[name] = nonImposters[randomIdx].player_name;
        }
    });

    localStorage.setItem('selected_theme', localStorage.getItem('selected_theme') || "Random");

    // Send to server
    const response = await fetch(`https://imposter-gm.com/api/auth/rooms/${code}/start`, {
        method: "POST",
        headers: { 
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(gameSettings)
    });

    if (response.ok) {
        localStorage.setItem('game_started', 'false');
        window.location.href = `/play_online.html?code=${code}`;
    }
}

async function checkRoomStatus(code) {
    const token = localStorage.getItem('token');
    const response = await fetch(`https://imposter-gm.com/api/auth/rooms/${code}/status`, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (response.ok) {
        const data = await response.json();

        if (data.topic) {
            localStorage.setItem('selected_topic', data.topic);
            const topicElement = document.getElementById(data.topic);
            if (topicElement && !topicElement.classList.contains('is-selected')) {
                applyTopicSelectionUI(data.topic);
            }
        }

        if (data.status === 'playing') {
            localStorage.setItem('game_started', 'false');
            window.location.href = `/play_online.html?code=${code}`;
        }
    }
}

export function initLobby() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const isHost = urlParams.get('isHost') === 'true';

    if (!code) {
        hostOnlineGame();
        return;
    }

    document.getElementById('display-code').textContent = code;
    updatePlayerList(code);
    
    // Poll for player list updates
    setInterval(() => updatePlayerList(code), 1500);

    if (isHost) {
        document.getElementById('start-game-btn').onclick = () => startGameServer(code);
        fetchTopics();
    } else {
        const startBtn = document.getElementById('start-game-btn');
        if (startBtn) startBtn.style.display = 'none';

        const hostSettings = document.getElementById('host-settings');
        if (hostSettings) hostSettings.style.display = 'none';

        setInterval(() => checkRoomStatus(code), 2000);
    }
}

// ==== Topic Logic ====
async function fetchTopics() {
    const topic_container = document.getElementById("topic-container");
    if (!topic_container) return;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        let topics = null; 
        window.lastFetchTimedOut = false;

        try {
            topics = await getWords(controller.signal);
            clearTimeout(timeoutId);
        } catch (error) {
            clearTimeout(timeoutId); 
            console.error("Critical error inside word loader wrapper:", error);
            topic_container.innerHTML = "<span>Error initializing topics.</span>";
            return;
        }

        if (Array.isArray(topics)) {
            topic_container.innerHTML = "";

            if (window.lastFetchTimedOut) {
                console.warn("Request timed out");
                const banner = document.createElement("div");
                banner.className = "error-msg";
                banner.innerHTML = `
                    <span>Connection Timed Out</span>
                    <span style="text-decoration: underline; text-underline-offset: 3px;">Using Local Words Instead</span>
                `;
                document.getElementById("error-box").appendChild(banner);
            }

            const fragment = document.createDocumentFragment();
            for (const topic of topics) {
                const topic_element = document.createElement("div");
                topic_element.className = "topic";
                topic_element.id = topic.id;
                topic_element.onclick = () => selectTopic(topic.id);

                topic_element.innerHTML = `
                    <h2>${topic.display_name}</h2>
                    <div class="topic-stats">
                        <span style="font-size: 0.8rem">Difficulty: ${topic.difficulty_imposter}</span>
                        <span style="font-size: 0.8rem">Word Count: ${topic.words.length}</span>
                    </div>
                `;

                if (topic.id.includes("docs")) {
                    topic_element.style.backgroundImage = "linear-gradient(180deg, rgb(255, 0, 212) 0%, rgb(167, 91, 255) 100%)";
                }
                fragment.appendChild(topic_element);
            }
            topic_container.appendChild(fragment);
        }

        const savedTopic = localStorage.getItem("selected_topic");
        if (savedTopic) selectTopic(savedTopic, true);
    } catch (error) {
        console.error("Failed to render topics component:", error);
        topic_container.innerHTML = "<span>Error displaying topics.</span>";
    }
}

async function selectTopic(topic_id, isFromSync = false) {
    const code = new URLSearchParams(window.location.search).get('code');
    const token = localStorage.getItem('token');

    localStorage.setItem("selected_topic", topic_id);

    if (!isFromSync) {
        await fetch(`https://imposter-gm.com/api/auth/rooms/${code}/settings`, {
            method: "PATCH",
            headers: { 
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ settings: { topic: topic_id } })
        });
    }

    applyTopicSelectionUI(topic_id);
}

function applyTopicSelectionUI(topic_id) {
    const topic_element = document.getElementById(topic_id);
    if (!topic_element) return;

    // Remove selection
    document.querySelectorAll('.topic.is-selected').forEach(el => {
        el.classList.remove("is-selected", "docs");
    });

    topic_element.classList.add("is-selected");
    if (topic_id.includes("docs")) topic_element.classList.add("docs");
    
    topic_element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}


window.hostOnlineGame = hostOnlineGame;
window.joinOnlineGame = joinOnlineGame;