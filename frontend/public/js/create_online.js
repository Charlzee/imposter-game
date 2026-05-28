import { getRandomInt } from './global.js';
import getWords from './words.js';

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
    } else if (response.status === 404) {
        alert("Room connection lost or timed out.");
        window.location.href = "/";
    } else {
        const errData = await response.json().catch(() => ({}));
        console.error("Player List Sync Error:", errData);
    }
}

export async function startGameServer(code) {
    const token = localStorage.getItem('token');
    const topics = await getWords();
    const topicId = localStorage.getItem('selected_topic') || 'foods_and_drinks';
    const selectedTopic = topics.find(t => t.id === topicId) || topics[0];
    const word = selectedTopic.words[getRandomInt(selectedTopic.words.length)];

    const response = await fetch(`https://imposter-gm.com/api/auth/rooms/${code}/start`, {
        method: "POST",
        headers: { 
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ word })
    });

    if (response.ok) {
        localStorage.setItem('selected_word', btoa(encodeURIComponent(word)));
        localStorage.setItem('game_started', 'false');
        window.location.href = `/play.html?online=true&code=${code}`;
    }
}

async function checkRoomStatus(code) {
    const token = localStorage.getItem('token');
    const response = await fetch(`https://imposter-gm.com/api/auth/rooms/${code}/status`, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (response.ok) {
        const data = await response.json();
        if (data.status === 'playing') {
            localStorage.setItem('selected_word', btoa(encodeURIComponent(data.word)));
            localStorage.setItem('game_started', 'false');
            window.location.href = `/play.html?online=true&code=${code}`;
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
    
    // player list updates
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
    } catch (error) {
        console.error("Failed to render topics component:", error);
        topic_container.innerHTML = "<span>Error displaying topics.</span>";
    }

    const savedTopic = localStorage.getItem("selected_topic");
    if (savedTopic) selectTopic(savedTopic);
}

async function selectTopic(topic_id) {
    const topic_element = document.getElementById(topic_id);
    if (!topic_element) return;

    const previousId = localStorage.getItem("selected_topic");
    if (previousId) {
        const prev_element = document.getElementById(previousId);
        if (prev_element) prev_element.classList.remove("is-selected", "docs");
    }

    localStorage.setItem("selected_topic", topic_id);
    topic_element.classList.add("is-selected");
    if (topic_id.includes("docs")) topic_element.classList.add("docs");
    
    topic_element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}


window.hostOnlineGame = hostOnlineGame;
window.joinOnlineGame = joinOnlineGame;