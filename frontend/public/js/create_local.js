const topic_container = document.getElementById("topic-container");

let cachedPlayers = null;

function getPlayers() {
    if (cachedPlayers === null) {
        cachedPlayers = JSON.parse(localStorage.getItem("current_players")) || [];
    }
    return cachedPlayers;
}

function invalidatePlayersCache() {
    cachedPlayers = null;
}

async function fetchTopics() {
    try {
        const response = await fetch("https://imposter-gm.com/api/words");
        const topics = await response.json();

        console.log("Fetched topics:", topics);

        if (Array.isArray(topics)) {
            topic_container.innerHTML = "";
            for (const topic of topics) {
                const topic_element = document.createElement("div");
                topic_element.classList.add("topic");
                topic_element.setAttribute("id", topic.id);
                topic_element.addEventListener("click", () => selectTopic(topic.id));

                const topic_title = document.createElement("h2");
                topic_title.textContent = topic.display_name; 

                const stats_container = document.createElement("div");
                stats_container.classList.add("topic-stats");

                const difficulty = document.createElement("span");
                difficulty.textContent = `Difficulty: ${topic.difficulty_imposter}`;
                difficulty.style.fontSize = "0.8rem";

                const word_count = document.createElement("span");
                word_count.textContent = `Word Count: ${topic.words.length}`;
                word_count.style.fontSize = "0.8rem";

                topic_element.appendChild(topic_title);
                topic_element.appendChild(stats_container);
                stats_container.appendChild(difficulty);
                stats_container.appendChild(word_count);
                topic_container.appendChild(topic_element);

                if (topic.id.includes("docs")) {
                    topic_element.style.backgroundImage = "linear-gradient(180deg, rgb(255, 0, 212) 0%, rgb(167, 91, 255) 100%)";
                }
            }
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
        if (prev_element) {
            prev_element.classList.remove("is-selected", "docs");
        }
    }

    localStorage.setItem("selected_topic", topic_id);

    topic_element.classList.add("is-selected");
    if (topic_id.includes("docs")) {
        topic_element.classList.add("docs");
    }
    topic_element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderPlayers() {
    const player_container = document.getElementById("player-container");
    player_container.innerHTML = "";

    const current_players = getPlayers();

    current_players.forEach((player, index) => {
        const player_element = document.createElement("div");
        player_element.classList.add("player-tile");

        const player_name_element = document.createElement("span");
        player_name_element.textContent = player.player_name;

        const player_number_element = document.createElement("span");
        player_number_element.classList.add("player-number");
        player_number_element.textContent = `Player ${index + 1}`; 

        player_element.addEventListener("click", () => removePlayer(index));

        player_element.appendChild(player_name_element);
        player_element.appendChild(player_number_element);
        player_container.appendChild(player_element);
    });

    if (current_players.length === 0) {
        const empty_msg = document.createElement("span");
        empty_msg.textContent = "No players added yet.";
        empty_msg.style.cssText = "color: #ccc; font-size: 0.8rem; grid-column: 1/-1; text-align: center;";
        player_container.appendChild(empty_msg);
    }
}

function updateNameValue(name="Player", auto=false){
    const input = document.getElementById("player-name-input");
    const current_players = getPlayers();
    if (auto){
        input.value = `Player ${current_players.length + 1}`;
    }else{
        input.value = name
    }
}

async function addPlayer() {
    const input = document.getElementById("player-name-input");
    const player_name = input.value.trim();

    let current_players = getPlayers();

    if (player_name === "" || (current_players.some(p => p.player_name.toLowerCase() === player_name.toLowerCase()))) {
        alert("Please enter a valid name.");
        return;
    }

    current_players.push({ player_name: player_name });
    localStorage.setItem("current_players", JSON.stringify(current_players));

    invalidatePlayersCache();
    updateNameValue(null, true)
    renderPlayers();
}

function removePlayer(index) {
    let current_players = getPlayers();

    current_players.splice(index, 1);

    localStorage.setItem("current_players", JSON.stringify(current_players));
    invalidatePlayersCache();
    renderPlayers();
}

function init() {
    window.addPlayer = addPlayer;
    window.startGame = startGame;
    window.openSettings = openSettings;
    window.updateNameValue = updateNameValue;
    fetchTopics();
    localStorage.setItem('game_started', false);
    updateNameValue(null, true);

    document.getElementById("imposter-count").value = localStorage.getItem("imposter_count") || 1
    document.getElementById("jester-count").value = localStorage.getItem("jester_count") || 0
    document.getElementById("executioner-count").value = localStorage.getItem("executioner_count") || 0
}
getPlayers()
async function startGame() {
    const players = getPlayers();

    if (players.length < 1) {
        alert("Not enough players to start the game.");
        return;
    }
    if (!localStorage.getItem("selected_topic")) {
        alert("Please select a topic before starting the game.");
        return;
    }
    
    const imposterCountValue = parseInt(document.getElementById("imposter-count").value);
    const jesterCountValue = parseInt(document.getElementById("jester-count").value);
    const executionerCountValue = parseInt(document.getElementById("executioner-count").value);
    localStorage.setItem("imposter_count", imposterCountValue)
    localStorage.setItem("jester_count", jesterCountValue)
    localStorage.setItem("executioner_count", executionerCountValue)

    if ((imposterCountValue+jesterCountValue+executionerCountValue) > players.length) {
        alert("Too many roles for the amount of players!");
        return;
    }

    window.location.href = "../play.html?local=true";
    console.log("Starting game with players:", players);
}

async function openSettings() {
    console.log("open")
}

init();

