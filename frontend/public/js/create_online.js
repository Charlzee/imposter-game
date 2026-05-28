export function generateJoinCode() {
    return Math.floor(Math.random() * 10000).toString().padStart(4, '0');
}

export async function hostOnlineGame() {
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
    setInterval(() => updatePlayerList(code), 3000);

    if (!isHost) {
        const startBtn = document.getElementById('start-game-btn');
        if (startBtn) startBtn.style.display = 'none';
    }
}

window.hostOnlineGame = hostOnlineGame;
window.joinOnlineGame = joinOnlineGame;