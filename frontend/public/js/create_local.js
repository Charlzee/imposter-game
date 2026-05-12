let cachedPlayers = null;
let topic_container;
let player_container;
let player_name_input;

// ==== Player Management ====
function getPlayers() {
    if (cachedPlayers === null) {
        try {
            cachedPlayers = JSON.parse(localStorage.getItem("current_players")) || [];
        } catch (e) {
            cachedPlayers = [];
        }
    }
    return cachedPlayers;
}

function invalidatePlayersCache() {
    cachedPlayers = null;
}

// ==== Topic Logic ====
async function fetchTopics() {
    try {
        const response = await fetch("https://imposter-gm.com/api/words");
        const topics = await response.json();

        if (Array.isArray(topics)) {
            topic_container.innerHTML = "";
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
        console.error("Failed to fetch topics:", error);
        topic_container.innerHTML = "<span>Error loading topics.</span>";
    }

    const savedTopic = localStorage.getItem("selected_topic");
    if (savedTopic) selectTopic(savedTopic);

    renderPlayers();
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

// ==== Player Management ====
function renderPlayers() {
    player_container.innerHTML = "";
    const players = getPlayers();

    if (players.length === 0) {
        player_container.innerHTML = `<span style="color: #ccc; font-size: 0.8rem; grid-column: 1/-1; text-align: center;">No players added yet.</span>`;
        return;
    }

    const fragment = document.createDocumentFragment();
    players.forEach((player, index) => {
        const tile = document.createElement("div");
        tile.className = "player-tile";
        tile.onclick = () => removePlayer(index);
        tile.innerHTML = `
            <span>${player.player_name}</span>
            <span class="player-number">Player ${index + 1}</span>
        `;
        fragment.appendChild(tile);
    });
    player_container.appendChild(fragment);
}

function updateNameValue(name = "Player", auto = false) {
    const players = getPlayers();
    player_name_input.value = auto ? `Player ${players.length + 1}` : name;
}

async function addPlayer() {
    const name = player_name_input.value.trim();
    let players = getPlayers();

    if (!name || players.some(p => p.player_name.toLowerCase() === name.toLowerCase())) {
        alert("Please enter a unique name.");
        return;
    }

    players.push({ player_name: name });
    localStorage.setItem("current_players", JSON.stringify(players));
    invalidatePlayersCache();
    updateNameValue(null, true);
    renderPlayers();
}

function removePlayer(index) {
    let players = getPlayers();
    players.splice(index, 1);
    localStorage.setItem("current_players", JSON.stringify(players));
    invalidatePlayersCache();
    renderPlayers();
}

// ==== Settings ====
async function startGame() {
    const players = getPlayers();
    if (players.length < 1) return alert("Not enough players!");
    if (!localStorage.getItem("selected_topic")) return alert("Select a topic!");

    // Grab all role counts
    const roles = ['imposter', 'jester', 'hitman', 'shapeshifter', 'guardian_angel'];
    let totalRoles = 0;

    roles.forEach(role => {
        const val = parseInt(document.getElementById(`${role}-count`).value) || 0;
        const percent_val = document.getElementById(`${role}-percent`).value
        localStorage.setItem(`${role}_count`, val);
        localStorage.setItem(`${role}_percent`, percent_val);

        localStorage.setItem(`${role}s`, JSON.stringify([]));
        localStorage.setItem(`innocents`, JSON.stringify([]));
        localStorage.setItem(`unselected_shapeshifters`, JSON.stringify([]));


        totalRoles += val;
    });

    localStorage.setItem("random_events_enabled", document.getElementById("random-events-enabled").checked);

    //if (totalRoles > players.length) return alert("Too many roles for player count!");

    window.location.href = "../play.html?local=true";
}

window.openSettings = () => document.getElementById('settings-overlay')?.classList.add('active');
window.closeSettings = () => document.getElementById('settings-overlay')?.classList.remove('active');

// ==== Init ====
function init() {
    topic_container = document.getElementById("topic-container");
    player_container = document.getElementById("player-container");
    player_name_input = document.getElementById("player-name-input");
    cachedPlayers = null;

    // Role Settings UI
    const roles = [
        { id: 'imposter', label: 'IMPOSTER', default: 1 },
        { id: 'jester', label: 'JESTER', default: 0 },
        { id: 'hitman', label: 'HITMAN', default: 0 },
        { id: 'shapeshifter', label: 'SHAPESHIFTER', default: 0 },
        { id: 'guardian_angel', label: 'GUARDIAN ANGEL', default: 0 }
    ];

    const settingsGroup = document.getElementById('role-settings-container');
    if (settingsGroup) {
        settingsGroup.innerHTML = roles.map(role => `
            <div class="role-row">
                <p class="titan-one-regular count">${role.label} AMOUNT</p>
                <input class="titan-one-regular amount-input setting-input" id="${role.id}-count" type="text" inputmode="numeric">
                <input class="titan-one-regular percent-input setting-input" id="${role.id}-percent" type="text" inputmode="numeric" value="100%">
            </div>
        `).join('');

        roles.forEach(role => {
            const input = document.getElementById(`${role.id}-count`);
            const percent_input = document.getElementById(`${role.id}-percent`);
            if (input) {
                const saved = localStorage.getItem(`${role.id}_count`);
                const percent_saved = localStorage.getItem(`${role.id}_percent`);
                input.value = (saved !== null) ? saved : role.default;
                percent_input.value = (percent_saved !== null) ? percent_saved : "100%";
            }
        });
    }

    // Handle Percent Inputs
    document.querySelectorAll('.percent-input').forEach(input => {
        input.onfocus = (e) => e.target.value = e.target.value.replace('%', '');
        
        input.oninput = (e) => {
            let val = e.target.value.replace(/[^0-9]/g, '');
            if (parseInt(val) > 100) val = '100';
            e.target.value = val;
        };

        input.onblur = (e) => {
            let val = e.target.value.trim();
            e.target.value = (val === "" || isNaN(val) ? "0" : val) + "%";
        };
    });

    // Global Setup
    window.addPlayer = addPlayer;
    window.startGame = startGame;
    window.updateNameValue = updateNameValue;
    document.getElementById('close-settings-btn')?.addEventListener('click', window.closeSettings);

    fetchTopics();
    localStorage.setItem('game_started', 'false');
    updateNameValue(null, true);

    const randomEventsEl = document.getElementById("random-events-enabled");
    if (randomEventsEl) {
        const saved = localStorage.getItem("random_events_enabled");
        randomEventsEl.checked = saved !== null ? saved === "true" : true;
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}
