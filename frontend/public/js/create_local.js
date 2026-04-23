const topic_container = document.getElementById("topic-container");

const response = await fetch("https://imposter-game-backend.charlzee.workers.dev/words");
const data = await response.json();

async function fetchTopics() {
    if (Array.isArray(data)) {
        for (const topic of data) {
            //Element
            const topic_element = document.createElement("div");
            topic_element.classList.add("topic");
            topic_element.setAttribute("id", topic.id);
            topic_element.addEventListener("click", () => selectTopic(topic.id));

            //Title
            const topic_title = document.createElement("h2");
            topic_title.textContent = topic.display_name; 
            
            //Stats
            const stats_container = document.createElement("div");
            stats_container.classList.add("topic-stats");

            //Difficulty
            const difficulty = document.createElement("span");
            difficulty.textContent = `Difficulty: ${topic.difficulty_imposter}`;
            difficulty.style.fontSize = "0.8rem";

            //Word Count
            const word_count = document.createElement("span");
            word_count.textContent = `Word Count: ${topic.words.length}`;
            word_count.style.fontSize = "0.8rem";

            //Append
            topic_element.appendChild(topic_title);
            topic_element.appendChild(stats_container);

            stats_container.appendChild(difficulty);
            stats_container.appendChild(word_count);

            topic_container.appendChild(topic_element);
        }
    }

    if (!localStorage.getItem("selected_topic")) {
        localStorage.setItem("selected_topic", "");
    }else{
        selectTopic(localStorage.getItem("selected_topic"));
    }

    if (!localStorage.getItem("current_players")) {
        localStorage.setItem("current_players", JSON.stringify([]));
    }else{
        const current_players = JSON.parse(localStorage.getItem("current_players"));
        const player_container = document.getElementById("player-container");
        current_players.forEach(player => {createPlayer(player.player_name)});
    }
}
async function selectTopic(topic_id) {
    const topic_element = document.getElementById(topic_id);
    const computedStyle = window.getComputedStyle(topic_element);
    console.log(`Selected topic: ${topic_id}`);

    // Change Style
    if (localStorage.getItem("selected_topic")) {
        let current_selected = document.getElementById(localStorage.getItem("selected_topic"));
        current_selected.classList.remove("is-selected");
    }

    localStorage.setItem("selected_topic", topic_id);

    topic_element.classList.add("is-selected");
}

async function createPlayer(player_name) {
    const player_container = document.getElementById("player-container");

    let current_players = JSON.parse(localStorage.getItem("current_players")) || [];
    current_players.push({player_name, index: current_players.length});
    localStorage.setItem("current_players", JSON.stringify(current_players));

    const player_element = document.createElement("div");
    const player_name_element = document.createElement("span");
    const player_number_element = document.createElement("span");

    player_number_element.textContent = `Player ${current_players.length}`;

    player_element.classList.add("player-tile");
    
    player_element.addEventListener("click", () => removePlayer(player_element, current_players.length));


    player_name_element.textContent = player_name;
    player_container.appendChild(player_element);
    player_element.appendChild(player_name_element);
    player_element.appendChild(player_number_element);
}

async function addPlayer() {
    const player_name = document.getElementById("player-name-input").value.trim();

    if (player_name === "") {
        alert("Please enter a valid name.");
        return 0;
    }

    createPlayer(player_name);
}

async function removePlayer(player_element, index) {
    let current_players = JSON.parse(localStorage.getItem("current_players")) || [];

    current_players.splice(index, 1);

    localStorage.setItem("current_players", JSON.stringify(current_players));

    player_element.remove();
}

fetchTopics();
window.addPlayer = addPlayer;