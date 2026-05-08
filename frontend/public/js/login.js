const loginContainer = document.getElementById("login-info-container");
const regButton = document.getElementById("login-button");

regButton.onclick = async (e) => {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    regButton.disabled = true;
    regButton.textContent = "Logging in...";

    try {
        const response = await fetch("https://imposter-gm.com/api/login", {
            method: "POST",
            body: JSON.stringify({ username, password }),
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            }
        });

        const data = await response.json();

        if (response.ok) {
            loginContainer.textContent = "Success! " + data.message;
            loginContainer.style.color = "lime";

            localStorage.setItem("token", data.token)

        } else {
            loginContainer.textContent = "Error: " + (data.error || "Failed to Login");
            loginContainer.style.color = "red";
        }
    } catch (err) {
        loginContainer.textContent = "Connection failed!";
        loginContainer.style.color = "red";
    } finally {
        regButton.disabled = false;
        regButton.textContent = "Login";
    }
};