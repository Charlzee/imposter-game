const topic_container = document.getElementById("topic-container");

const response = await fetch("https://imposter-game-backend.charlzee.workers.dev/words");
const data = await response.json();

async function fetchTopics() {
    if (Array.isArray(data)) {
        topic_container.innerHTML = "";
        for (const topic of data) {
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
        }
    }

    const savedTopic = localStorage.getItem("selected_topic");
    if (savedTopic) {
        selectTopic(savedTopic);
    }

    renderPlayers();
}

async function selectTopic(topic_id) {
    const topic_element = document.getElementById(topic_id);
    if (!topic_element) return;

    const previousId = localStorage.getItem("selected_topic");
    if (previousId) {
        const current_selected = document.getElementById(previousId);
        if (current_selected) current_selected.classList.remove("is-selected");
    }

    localStorage.setItem("selected_topic", topic_id);
    topic_element.classList.add("is-selected");
}

function renderPlayers() {
    const player_container = document.getElementById("player-container");
    player_container.innerHTML = "";

    const current_players = JSON.parse(localStorage.getItem("current_players")) || [];

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

async function addPlayer() {
    const input = document.getElementById("player-name-input");
    const player_name = input.value.trim();

    if (player_name === "") {
        alert("Please enter a valid name.");
        return;
    }

    let current_players = JSON.parse(localStorage.getItem("current_players")) || [];
    current_players.push({ player_name: player_name });
    localStorage.setItem("current_players", JSON.stringify(current_players));

    input.value = "";
    renderPlayers();
}

function removePlayer(index) {
    let current_players = JSON.parse(localStorage.getItem("current_players")) || [];

    current_players.splice(index, 1);

    localStorage.setItem("current_players", JSON.stringify(current_players));
    renderPlayers();
}

async function startGame() {
    const players = JSON.parse(localStorage.getItem("current_players")) || [];
    console.log("Starting game with players:", players);
}

window.addPlayer = addPlayer;
window.startGame = startGame;

fetchTopics();