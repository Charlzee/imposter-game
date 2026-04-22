const topic_container = document.getElementById("topic-container");

const response = await fetch("https://imposter-game-backend.charlierw1028.workers.dev/words");
const data = await response.json();

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