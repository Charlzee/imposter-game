// === GLOBAL CONSOLE INTERCEPTOR ===
// Captures all console logs into a window-level array for the overlay to display
if (!window.debugLogs) {
    window.debugLogs = [];
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    const capture = (type, original) => {
        return (...args) => {
            const msg = args.map(arg => {
                return typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg;
            }).join(' ');
            window.debugLogs.push({ type, msg, time: new Date().toLocaleTimeString() });
            original.apply(console, args);
        };
    };

    console.log = capture('LOG', originalLog);
    console.warn = capture('WARN', originalWarn);
    console.error = capture('ERROR', originalError);

    // === DEBUG OVERLAY UI ===
    const setupLogOverlay = () => {
        const overlay = document.createElement('div');
        overlay.id = 'console-overlay';
        overlay.style = `
            display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.95); z-index: 100000; padding: 20px;
            color: #00ff00; font-family: monospace; overflow-y: auto; box-sizing: border-box;
            font-size: 12px; line-height: 1.4;
        `;
        
        const header = document.createElement('div');
        header.style = "display: flex; justify-content: space-between; border-bottom: 1px solid #333; padding-bottom: 10px; margin-bottom: 15px;";
        header.innerHTML = `<span style="font-weight: bold; color: #fff;">SYSTEM CONSOLE</span>`;
        
        const closeBtn = document.createElement('button');
        closeBtn.innerText = "CLOSE";
        closeBtn.style = "background: #444; color: #fff; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;";
        closeBtn.onclick = () => overlay.style.display = 'none';
        
        header.appendChild(closeBtn);
        overlay.appendChild(header);
        
        const logContainer = document.createElement('div');
        overlay.appendChild(logContainer);
        document.body.appendChild(overlay);

        const toggleBtn = document.createElement('button');
        toggleBtn.innerText = "DEBUG LOGS";
        toggleBtn.style = "position: fixed; top: 10px; right: 10px; z-index: 99999; font-size: 10px; padding: 5px 10px; opacity: 0.5; border-radius: 5px; background: #222; color: #fff; border: 1px solid #444; font-family: sans-serif;";
        toggleBtn.onclick = () => {
            overlay.style.display = 'block';
            logContainer.innerHTML = window.debugLogs.map(log => {
                let color = '#ccc';
                if (log.type === 'WARN') color = '#ffcc00';
                if (log.type === 'ERROR') color = '#ff4444';
                return `<div style="margin-bottom: 8px; border-bottom: 1px solid #222; padding-bottom: 4px;">
                    <span style="color: #666;">[${log.time}]</span> 
                    <span style="color: ${color}; font-weight: bold;">${log.type}:</span> 
                    <pre style="margin: 4px 0 0 0; white-space: pre-wrap; word-break: break-all;">${log.msg}</pre>
                </div>`;
            }).join('') || "No logs yet...";
        };
        document.body.appendChild(toggleBtn);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupLogOverlay);
    } else {
        setupLogOverlay();
    }
}

export function getURLParameter(sParam) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(sParam);
}

export function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

export function getRandomPlayerIndex(players) {
    if (!players || players.length === 0) return -1;
    return getRandomInt(players.length);
}

export function getRandomPlayer(players) {
    if (!players || players.length === 0) return null;
    return players[getRandomInt(players.length)];
}

export function toTitleCase(str) {
    return str.replace(
        /\w\S*/g,
        text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
    );
}

export function getRandomLetterOrNumber() {
    const characters ='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return characters.charAt(Math.floor(Math.random() * characters.length));
}

export function getRandomLetter() {
    const characters ='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return characters.charAt(Math.floor(Math.random() * characters.length));
}