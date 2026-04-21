const topic_container = document.getElementById("topics")

console.log(topic_container)

const response = await fetch("https://imposter-game-backend.charlierw1028.workers.dev/words")
const data = await response.json()

console.log(data)