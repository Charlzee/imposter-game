const registerContainer = document.getElementById("register-info-container");
const regButton = document.getElementById("register-button");

regButton.onclick = async (e) => {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
        const response = await fetch("https://imposter-gm.com/api/register", {
            method: "POST",
            body: JSON.stringify({ username, password }),
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            }
        });

        const data = await response.json();

        if (response.ok) {
            registerContainer.textContent = "Success! " + data.message;
            registerContainer.style.color = "lime";
        } else {
            registerContainer.textContent = "Error: " + (data.error || "Failed to register");
            registerContainer.style.color = "red";
        }
    } catch (err) {
        registerContainer.textContent = "Connection failed!";
    }
};