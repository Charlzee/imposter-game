const registerContainer = document.getElementById("register-info-container")
const regButton = document.getElementById("register-button")

regButton.onclick(e => {
    const username = document.getElementById("username").textContent
    const password = document.getElementById("password").textContent
    const regResponse = await fetch("https://imposter-gm.com/api/register", {
        method: "POST",
        body: JSON.stringify({
            username,
            password
        }),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    }),
        registerContainer.textContent = regResponse
})
