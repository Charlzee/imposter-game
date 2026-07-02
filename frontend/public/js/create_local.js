import getWords from './words.js';
import { ROLE_MODIFIERS, BASE_ROLE_IDS, RANDOM_EVENTS, ROLE_DATA as ROLE_DEFS, getBaseRoleId } from './roles.js';

// === CONFIG ===
const ROLE_DATA = BASE_ROLE_IDS;

let cachedPlayers = null;
let topic_container;
let player_container;
let player_name_input;

// ==== Player Management ====
// Fetch player list from storage
function getPlayers() {
    if (cachedPlayers === null) {
        try {
            cachedPlayers = JSON.parse(localStorage.getItem("current_players")) || [];
        } catch (e) {
            cachedPlayers = [];
        }
    }
    return cachedPlayers;
}

// Reset the local player cache
function invalidatePlayersCache() {
    cachedPlayers = null;
}

// ==== Topic Logic ====
// Load topics from words module
async function fetchTopics() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);

        let topics;
        try {
            topics = await getWords(controller.signal);
            clearTimeout(timeoutId);
        } catch (error) {
            clearTimeout(timeoutId); 
            console.error("Critical error inside word loader wrapper:", error);
            topic_container.innerHTML = "<span>Error initializing topics.</span>";
            return;
        }

        if (Array.isArray(topics)) {
            topic_container.innerHTML = "";
            const errorBox = document.getElementById("error-box");

            if (window.lastFetchTimedOut && errorBox) {
                console.warn("Request timed out");
                const banner = document.createElement("div");
                banner.className = "error-msg";
                banner.innerHTML = `
                    <span>Connection Timed Out</span>
                    <span style="text-decoration: underline; text-underline-offset: 3px;">Falling back to stored data</span>
                `;
                errorBox.appendChild(banner);
            }

            if (window.wordsLoadedFromCache && errorBox) {
                const cacheBanner = document.createElement("div");
                cacheBanner.className = "error-msg";
                cacheBanner.innerHTML = `
                    <span>Using Offline Cache</span>
                    <span style="text-decoration: underline; text-underline-offset: 3px;">Loaded from last successful sync</span>
                `;
                errorBox.appendChild(cacheBanner);
            }

            const fragment = document.createDocumentFragment();
            for (const topic of topics) {
                const topic_element = document.createElement("div");
                topic_element.className = "topic";
                topic_element.id = topic.id;
                topic_element.onclick = () => selectTopic(topic.id);

                topic_element.innerHTML = `
                    <h2>${topic.display_name}</h2>
                    <div class="topic-stats">
                        <span style="font-size: 0.8rem">Difficulty: ${topic.difficulty_imposter}</span>
                        <span style="font-size: 0.8rem">Word Count: ${topic.words.length}</span>
                    </div>
                `;

                if (topic.id.includes("docs")) {
                    topic_element.style.backgroundImage = "linear-gradient(180deg, rgb(255, 0, 212) 0%, rgb(167, 91, 255) 100%)";
                }
                fragment.appendChild(topic_element);
            }
            topic_container.appendChild(fragment);
        }
    } catch (error) {
        console.error("Failed to render topics component:", error);
        topic_container.innerHTML = "<span>Error displaying topics.</span>";
    }

    const savedTopic = localStorage.getItem("selected_topic");
    if (savedTopic) selectTopic(savedTopic);

    renderPlayers();
}

// Handle topic card selection
async function selectTopic(topic_id) {
    const topic_element = document.getElementById(topic_id);
    if (!topic_element) return;

    const previousId = localStorage.getItem("selected_topic");
    if (previousId) {
        const prev_element = document.getElementById(previousId);
        if (prev_element) prev_element.classList.remove("is-selected", "docs");
    }

    localStorage.setItem("selected_topic", topic_id);
    topic_element.classList.add("is-selected");
    if (topic_id.includes("docs")) topic_element.classList.add("docs");
    
    topic_element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ==== Player Management ====
// Draw player tiles in UI
function renderPlayers() {
    player_container.innerHTML = "";
    const players = getPlayers();

    if (players.length === 0) {
        player_container.innerHTML = `<span style="color: #ccc; font-size: 0.8rem; grid-column: 1/-1; text-align: center;">No players added yet.</span>`;
        return;
    }

    const fragment = document.createDocumentFragment();
    players.forEach((player, index) => {
        const tile = document.createElement("div");
        tile.className = "player-tile";
        tile.onclick = () => removePlayer(index);
        tile.innerHTML = `
            <span>${player.player_name}</span>
            <span class="player-number">Player ${index + 1}</span>
        `;
        fragment.appendChild(tile);
    });
    player_container.appendChild(fragment);
}

// Update name input field text
function updateNameValue(name = "Player", auto = false) {
    const players = getPlayers();
    player_name_input.value = auto ? `Player ${players.length + 1}` : name;
}

// Add new player to game
async function addPlayer() {
    const name = player_name_input.value.trim();
    let players = getPlayers();

    if (!name || players.some(p => p.player_name.toLowerCase() === name.toLowerCase())) {
        alert("Please enter a unique name.");
        return;
    }

    players.push({ player_name: name });
    localStorage.setItem("current_players", JSON.stringify(players));
    invalidatePlayersCache();
    updateNameValue(null, true);
    renderPlayers();
}

// Remove player from lobby list
function removePlayer(index) {
    let players = getPlayers();
    players.splice(index, 1);
    localStorage.setItem("current_players", JSON.stringify(players));
    invalidatePlayersCache();
    renderPlayers();
}

// ==== Settings Saving Logic ====
function saveAllSettings() {
    // Save role settings
    ROLE_DATA.forEach(role => {
        const countInput = document.getElementById(`${role}-count`);
        const percentInput = document.getElementById(`${role}-percent`);
        if (countInput) localStorage.setItem(`${role}_count`, countInput.value);
        if (percentInput) localStorage.setItem(`${role}_percent`, percentInput.value);
    });

    // Save modifier settings
    Object.keys(ROLE_MODIFIERS).forEach(modKey => {
        const percentInput = document.getElementById(`${modKey}-percent`);
        if (percentInput) localStorage.setItem(`${modKey}_percent`, percentInput.value);
    });

    // Save event settings
    Object.keys(RANDOM_EVENTS).forEach(eventKey => {
        const percentInput = document.getElementById(`event-${eventKey}-percent`);
        if (percentInput) localStorage.setItem(`event_${eventKey}_percent`, percentInput.value);
    });

    // Save checkboxes
    const modCheck = document.getElementById("role-modifiers-enabled");
    if (modCheck) localStorage.setItem("role_modifers_enabled", modCheck.checked);

    const eventCheck = document.getElementById("random-events-enabled");
    if (eventCheck) localStorage.setItem("random_events_enabled", eventCheck.checked);
}

// ==== Settings ====
// Finalize settings and launch play
async function startGame() {
    const players = getPlayers();
    if (players.length < 1) return alert("Not enough players!");
    if (!localStorage.getItem("selected_topic")) return alert("Select a topic!");

    localStorage.setItem(`innocents`, JSON.stringify([]));
    localStorage.setItem(`unselected_shapeshifters`, JSON.stringify([]));

    saveAllSettings();

    // Initialize plural keys for the round
    ROLE_DATA.forEach(role => {
        const pluralKey = role.endsWith('s') ? role : (role === 'guardian_angel' ? 'guardian_angels' : `${role}s`);
        localStorage.setItem(pluralKey, JSON.stringify([]));
    });
    Object.keys(ROLE_MODIFIERS).forEach(modKey => {
        localStorage.setItem(modKey, JSON.stringify([]));
    });

    window.location.href = "../play.html?local=true";
}

// Toggle settings overlay visibility
window.openSettings = () => document.getElementById('settings-overlay')?.classList.add('active');
window.closeSettings = () => document.getElementById('settings-overlay')?.classList.remove('active');

// ==== Init ====
function init() {
    topic_container = document.getElementById("topic-container");
    player_container = document.getElementById("player-container");
    player_name_input = document.getElementById("player-name-input");
    cachedPlayers = null;

    const settingsGroup = document.getElementById('role-settings-container');
    const modifierSettingsGroup = document.getElementById('modifier-settings-container')
    const eventSettingsGroup = document.getElementById('event-settings-container');

    if (settingsGroup) {
        const categories = { imposter: [], neutral: [], innocent: [] };

        ROLE_DATA.forEach(roleId => {
            const roleKey = Object.keys(ROLE_DEFS).find(k => getBaseRoleId(k) === roleId);
            const type = ROLE_DEFS[roleKey]?.roleType || 'innocent';
            // Do not show non-selectable roles in the settings UI
            if (ROLE_DEFS[roleKey]?.selectable === false) return;

            if (categories[type]) categories[type].push(roleId);
        });

        let settingsHtml = '';
        Object.entries(categories).forEach(([type, roles]) => {
            if (roles.length === 0) return;
            settingsHtml += `<h3 class="titan-one-regular category-header" style="color: #fff; margin: 20px 0 10px 0; text-align: center; width: 100%; border-bottom: 2px solid rgba(255,255,255,0.2); padding-bottom: 5px;">${type.toUpperCase()} ROLES</h3>`;
            settingsHtml += roles.map(roleId => {
                const roleKey = Object.keys(ROLE_DEFS).find(k => getBaseRoleId(k) === roleId);
                const isSubImposter = ROLE_DEFS[roleKey]?.roleType === 'imposter' && roleKey !== 'imposters';
                
                const labelText = roleId.replace('_', ' ').toUpperCase();
                const labelType = isSubImposter ? 'CHANCE' : 'AMOUNT';
                return `
                    <div class="role-row">
                        <p class="titan-one-regular count">${labelText} ${labelType}</p>
                        <input class="titan-one-regular amount-input setting-input" id="${roleId}-count" type="text" inputmode="numeric" ${isSubImposter ? 'style="visibility: hidden;"' : ''}>
                        <input class="titan-one-regular percent-input setting-input" id="${roleId}-percent" type="text" inputmode="numeric" value="100%">
                    </div>
                `;
            }).join('');
        });

        // Build modifier setting rows
        let modifierSettingsHtml = Object.keys(ROLE_MODIFIERS).map(modKey => {
            let labelText = ROLE_MODIFIERS[modKey].label.toUpperCase();
            if (labelText.toLowerCase() == "cheater" || labelText.toLowerCase() == "happy"){labelText = "(???)"}
            return `
                <div class="role-row">
                    <p class="titan-one-regular count">${labelText} CHANCE</p>
                    <input class="titan-one-regular amount-input setting-input" style="visibility: hidden;">
                    <input class="titan-one-regular percent-input setting-input" id="${modKey}-percent" type="text" inputmode="numeric">
                </div>
            `;
        }).join('');

        // Build event setting rows
        let eventSettingsHtml = Object.keys(RANDOM_EVENTS).map(eventKey => {
            let labelText = (RANDOM_EVENTS[eventKey].label || eventKey).toUpperCase();
            return `
                <div class="role-row">
                    <p class="titan-one-regular count">${labelText} CHANCE</p>
                    <input class="titan-one-regular amount-input setting-input" style="visibility: hidden;">
                    <input class="titan-one-regular percent-input setting-input" id="event-${eventKey}-percent" type="text" inputmode="numeric">
                </div>
            `;
        }).join('');

        settingsGroup.innerHTML = settingsHtml;
        modifierSettingsGroup.innerHTML = modifierSettingsHtml;
        if (eventSettingsGroup) {
            eventSettingsGroup.innerHTML = eventSettingsHtml;
        }

        // Load saved counts and percentages
        ROLE_DATA.forEach(roleId => {
            const roleKey = Object.keys(ROLE_DEFS).find(k => getBaseRoleId(k) === roleId);
            const isSubImposter = ROLE_DEFS[roleKey]?.roleType === 'imposter' && roleKey !== 'imposters';

            const input = document.getElementById(`${roleId}-count`);
            const percent_input = document.getElementById(`${roleId}-percent`);
            
            if (input && percent_input) {
                const saved = localStorage.getItem(`${roleId}_count`);
                const percent_saved = localStorage.getItem(`${roleId}_percent`);
                const defaultCount = (roleId === 'imposter') ? 1 : 0;
                const defaultPercent = isSubImposter ? "10%" : "100%";

                input.value = (saved !== null) ? saved : defaultCount;
                
                if (percent_saved !== null) {
                    const cleanValue = parseFloat(parseFloat(percent_saved.replace('%', '')).toFixed(4));
                    percent_input.value = cleanValue + "%";
                } else {
                    percent_input.value = defaultPercent;
                }
            }
        });

        // Load saved modifier chances
        Object.keys(ROLE_MODIFIERS).forEach(modKey => {
            const percent_input = document.getElementById(`${modKey}-percent`);
            if (percent_input) {
                const saved = localStorage.getItem(`${modKey}_percent`);
                const defaultChance = ROLE_MODIFIERS[modKey].chance || 0.05;
                const displayChance = parseFloat((defaultChance * 100).toFixed(4));
                if (saved !== null) {
                    const cleanValue = parseFloat(parseFloat(saved.replace('%', '')).toFixed(4));
                    percent_input.value = cleanValue + "%";
                } else {
                    percent_input.value = displayChance + "%";
                }
            }
        });

        // Load saved event chances
        Object.keys(RANDOM_EVENTS).forEach(eventKey => {
            const percent_input = document.getElementById(`event-${eventKey}-percent`);
            if (percent_input) {
                const saved = localStorage.getItem(`event_${eventKey}_percent`);
                const defaultChance = RANDOM_EVENTS[eventKey].chance || 0.05;
                const displayChance = parseFloat((defaultChance * 100).toFixed(4));
                if (saved !== null) {
                    const cleanValue = parseFloat(parseFloat(saved.replace('%', '')).toFixed(4));
                    percent_input.value = cleanValue + "%";
                } else {
                    percent_input.value = displayChance + "%";
                }
            }
        });
    }

    // Setup input validation for percentages
    document.querySelectorAll('.percent-input').forEach(input => {
        input.onfocus = (e) => e.target.value = e.target.value.replace('%', '');
        
        input.oninput = (e) => {
            let val = e.target.value.replace(/[^0-9.]/g, '');
            if (parseInt(val) > 100) val = '100';
            e.target.value = val;
        };

        input.onblur = (e) => {
            let val = e.target.value.trim();
            if (val !== "" && !isNaN(val)) {
                val = parseFloat(parseFloat(val).toFixed(4));
            }
            e.target.value = (val === "" || isNaN(val) ? "0" : val) + "%";
            saveAllSettings();
        };
    });

    // Attach auto-save listeners to all setting inputs
    document.querySelectorAll('.setting-input').forEach(input => {
        input.addEventListener('input', saveAllSettings);
    });
    document.getElementById("role-modifiers-enabled")?.addEventListener('change', saveAllSettings);
    document.getElementById("random-events-enabled")?.addEventListener('change', saveAllSettings);

    // Revert roles to defaults
    const resetRoles = () => {
        ROLE_DATA.forEach(roleId => {
            const roleKey = Object.keys(ROLE_DEFS).find(k => getBaseRoleId(k) === roleId);
            const isSubImposter = ROLE_DEFS[roleKey]?.roleType === 'imposter' && roleKey !== 'imposters';

            const input = document.getElementById(`${roleId}-count`);
            const percentInput = document.getElementById(`${roleId}-percent`);
            const defaultCount = (roleId === 'imposter') ? 1 : 1; // first 1 is default for imposters, second 1 is default amount for other roles
            if (input) input.value = defaultCount;
            
            if (percentInput) {
                // base imposter is 100%
                percentInput.value = (roleId === 'imposter') ? "100%" : (isSubImposter ? "10%" : "7%"); // first 7% is default for sub-imposters, second 7% is default for other roles
            }
        });
        saveAllSettings();
    };

    // Revert modifiers to defaults
    const resetModifiers = () => {
        Object.keys(ROLE_MODIFIERS).forEach(modKey => {
            const percentInput = document.getElementById(`${modKey}-percent`);
            if (percentInput) {
                const defaultChance = ROLE_MODIFIERS[modKey].chance || 0.05;
                const displayChance = parseFloat((defaultChance * 100).toFixed(4));
                percentInput.value = displayChance + "%";
            }
        });
        saveAllSettings();
    };

    // Revert events to defaults
    const resetEvents = () => {
        Object.keys(RANDOM_EVENTS).forEach(eventKey => {
            const percentInput = document.getElementById(`event-${eventKey}-percent`);
            if (percentInput) {
                const defaultChance = RANDOM_EVENTS[eventKey].chance || 0.05;
                const displayChance = parseFloat((defaultChance * 100).toFixed(4));
                percentInput.value = displayChance + "%";
            }
        });
        saveAllSettings();
    };

    // Global Setup
    window.addPlayer = addPlayer;
    window.startGame = startGame;
    window.updateNameValue = updateNameValue;
    document.getElementById('close-settings-btn')?.addEventListener('click', window.closeSettings);
    document.getElementById('reset-roles-btn')?.addEventListener('click', resetRoles);
    document.getElementById('reset-modifiers-btn')?.addEventListener('click', resetModifiers);
    document.getElementById('reset-events-btn')?.addEventListener('click', resetEvents);

    fetchTopics();
    localStorage.setItem('game_started', 'false');
    updateNameValue(null, true);

    const roleModifiersEl = document.getElementById("role-modifiers-enabled");
    if (roleModifiersEl) {
        const saved = localStorage.getItem("role_modifers_enabled");
        roleModifiersEl.checked = saved !== null ? saved === "true" : true;
    }

    const randomEventsEl = document.getElementById("random-events-enabled");
    if (randomEventsEl) {
        const saved = localStorage.getItem("random_events_enabled");
        randomEventsEl.checked = saved !== null ? saved === "true" : true;
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}