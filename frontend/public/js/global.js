// === GLOBAL CONSOLE INTERCEPTOR ===
// Captures all console logs into a window-level array for the overlay to display
if (!window.debugLogs) {
    window.debugLogs = [];

    const consoleMethodsToCapture = {
        log: 'LOG',
        warn: 'WARN',
        error: 'ERROR',
        info: 'INFO',
        debug: 'DEBUG',
        trace: 'TRACE',
        dir: 'DIR',
        table: 'TABLE'
    };

    Object.entries(consoleMethodsToCapture).forEach(([method, type]) => {
        const original = console[method];
        console[method] = (...args) => {
            let msg = args.map(arg => {
                try {
                    return typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
                } catch (e) {
                    return '[Unserializable Object]';
                }
            }).join(' ');

            window.debugLogs.push({ type, msg, time: new Date().toLocaleTimeString() });
            original.apply(console, args);
        };
    });

    // === GLOBAL FETCH INTERCEPTOR ===
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
        const [url, options] = args;
        const method = options?.method?.toUpperCase() || 'GET';
        const shortUrl = typeof url === 'string' ? url.split('/').slice(-3).join('/') : 'Request Object';

        window.debugLogs.push({ type: 'FETCH', msg: `=> ${method} ${shortUrl}`, time: new Date().toLocaleTimeString() });

        try {
            const response = await originalFetch(...args);
            const status = response.status;
            const statusType = status >= 400 ? 'ERROR' : (status >= 300 ? 'WARN' : 'FETCH');
            window.debugLogs.push({ type: statusType, msg: `<= ${status} ${method} ${shortUrl}`, time: new Date().toLocaleTimeString() });
            return response;
        } catch (error) {
            window.debugLogs.push({ type: 'ERROR', msg: `<= FAILED ${method} ${shortUrl}\n  ${error.message}`, time: new Date().toLocaleTimeString() });
            throw error;
        }
    };

    // === GLOBAL XHR INTERCEPTOR ===
    const originalXhrOpen = XMLHttpRequest.prototype.open;
    const originalXhrSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url) {
        this._method = method;
        this._url = url;
        originalXhrOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function() {
        const xhr = this;
        const method = xhr._method?.toUpperCase() || 'XHR';
        const shortUrl = typeof xhr._url === 'string' ? xhr._url.split('/').slice(-3).join('/') : 'Request';

        const logRequest = () => {
            window.debugLogs.push({ type: 'XHR', msg: `=> ${method} ${shortUrl}`, time: new Date().toLocaleTimeString() });
        };

        const logResponse = () => {
            const status = xhr.status;
            const statusType = status >= 400 ? 'ERROR' : (status >= 300 ? 'WARN' : 'XHR');
            window.debugLogs.push({ type: statusType, msg: `<= ${status} ${method} ${shortUrl}`, time: new Date().toLocaleTimeString() });
        };

        this.addEventListener('load', logResponse);
        this.addEventListener('error', () => window.debugLogs.push({ type: 'ERROR', msg: `<= FAILED ${method} ${shortUrl}`, time: new Date().toLocaleTimeString() }));
        logRequest();
        return originalXhrSend.apply(this, arguments);
    };

    // === GLOBAL ERROR HANDLER for uncaught exceptions ===
    window.onerror = function(message, source, lineno, colno, error) {
        const sourceFile = source ? source.split('/').pop() : 'unknown';
        const formattedMsg = `Uncaught ${error ? error.name : 'Error'}: ${message}\n  at ${sourceFile}:${lineno}:${colno}`;
        
        window.debugLogs.push({ type: 'ERROR', msg: formattedMsg, time: new Date().toLocaleTimeString() });
        return false; // Let the browser's default error handler run as well.
    };

    // === GLOBAL HANDLER for unhandled promise rejections ===
    window.onunhandledrejection = function(event) {
        const reason = event.reason || {};
        const message = reason.message || 'No message provided.';
        const stack = reason.stack ? `\n${reason.stack}` : '';
        const formattedMsg = `Unhandled Promise Rejection: ${message}${stack}`;
        window.debugLogs.push({ type: 'ERROR', msg: formattedMsg, time: new Date().toLocaleTimeString() });
    };

    // === DEBUG OVERLAY UI ===
    const setupLogOverlay = () => {
        const overlay = document.createElement('div');
        overlay.id = 'console-overlay';
        overlay.style = `
            display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.95); z-index: 100000; padding: 20px;
            color: #ffffff; font-family: monospace; overflow-y: auto; box-sizing: border-box;
            font-size: 18px; line-height: 1.4;
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
                if (log.type === 'FETCH') color = '#66aaff';
                if (log.type === 'XHR') color = '#88aaff';
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