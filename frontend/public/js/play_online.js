import { getURLParameter, getRandomLetter, toTitleCase } from './global.js';
import { ROLE_DATA, ROLE_MODIFIERS, INNOCENT_CONFIG, getBaseRoleId } from './roles.js';

async function initOnlinePlay() {
    const code = getURLParameter('code');
    const token = localStorage.getItem('token');

    const meRes = await fetch("https://imposter-gm.com/api/auth/me", {
        headers: { "Authorization": `Bearer ${token}` }
    });
    const meData = await meRes.json();
    const myUsername = meData.user;

    // Fetch assigned roles
    const roomRes = await fetch(`https://imposter-gm.com/api/auth/rooms/${code}/status`, {
        headers: { "Authorization": `Bearer ${token}` }
    });
    const game = await roomRes.json();

    let myRoleKey = Object.keys(ROLE_DATA).find(key => game[key]?.includes(myUsername));
    const activeModifiers = Object.keys(ROLE_MODIFIERS).filter(key => game[key]?.includes(myUsername));
    let config = ROLE_DATA[myRoleKey] || INNOCENT_CONFIG;
    const myWord = game.word;

    const roleTitle = document.getElementById('role-title');
    const roleStatus = document.getElementById('role-status');
    const wordDisplay = document.getElementById('word');
    const roleTip = document.getElementById('role-tip');
    const roleDisplay = document.getElementById('role-display');

    const allRoleClasses = [...Object.values(ROLE_DATA).map(r => r.class), ...Object.values(ROLE_MODIFIERS).map(m => m.class), 'innocent', 'hidden'];

    roleStatus.classList.remove('hidden');
    roleTitle.textContent = `YOUR ROLE IS:`;

    function updateUi(configUi) {
        roleStatus.classList.remove(...allRoleClasses);
        document.querySelectorAll('.modifier-container').forEach(el => el.remove());

        const hasAmnesia = activeModifiers.includes('amnesias');
        if (hasAmnesia) {
            roleStatus.textContent = "%?$?£$";
            roleStatus.classList.add('amnesia');
            const darkAmnesiaColor = 'rgb(30, 110, 150)';
            roleStatus.style.color = darkAmnesiaColor;
            roleStatus.style.textShadow = `7px 7px 4px rgba(0, 0, 0, 0.4), 6px 6px 10px ${darkAmnesiaColor}`;
            roleDisplay.style.backgroundImage = ROLE_MODIFIERS.amnesias.grad;
            roleTip.textContent = ROLE_MODIFIERS.amnesias.tip;
        } else {
            roleStatus.textContent = configUi.label;
            roleStatus.classList.add(configUi.class);
            const activeColor = configUi.textColor || 'white';
            roleStatus.style.color = activeColor;
            roleStatus.style.textShadow = `7px 7px 4px rgba(0, 0, 0, 0.4), 6px 6px 10px ${activeColor}`;
            roleDisplay.style.backgroundImage = configUi.grad;
            roleTip.textContent = configUi.tip;
        }

        let displayTheWord = configUi.showWord;
        activeModifiers.forEach(modKey => {
            if (ROLE_MODIFIERS[modKey].overrideWordVisibility) {
                displayTheWord = ROLE_MODIFIERS[modKey].showWord;
            }
        });

        let content = displayTheWord ? myWord : '';

        // Theme Visibility logic
        if (configUi.showTheme || config.showTheme || activeModifiers.some(m => ROLE_MODIFIERS[m].showTheme)) {
            const theme = localStorage.getItem('selected_theme') || "Unknown";
            content += `\nTHEME: ${theme}`;
        }

        if (game.hitmanTargets?.[myUsername]) content += `\n\nYOUR TARGET: ${game.hitmanTargets[myUsername]}`;
        if (game.guardian_angelTargets?.[myUsername]) content += `\n\nYOUR TARGET: ${game.guardian_angelTargets[myUsername]}`;
        if (game.annoyingTargets?.[myUsername]) content += `\n\nYOUR TARGET: ${game.annoyingTargets[myUsername]}`;
        if (game.inspectorClues?.[myUsername]) content += `\n\nONE NON-IMPOSTER:\n[${game.inspectorClues[myUsername]}]`;

        wordDisplay.textContent = content;
        renderModifiers();
    }

    function renderModifiers() {
        activeModifiers.forEach(modKey => {
            const modConfig = ROLE_MODIFIERS[modKey];
            const modContainer = document.createElement('div');
            modContainer.className = 'modifier-container';
            modContainer.style.marginTop = '20px';
            modContainer.style.padding = '15px';
            modContainer.style.borderRadius = '10px';
            modContainer.style.background = modConfig.grad;
            modContainer.style.border = `2px solid ${modConfig.textColor}`;

            const modTitle = document.createElement('h4');
            modTitle.className = 'titan-one-regular';
            modTitle.textContent = `MODIFIER: ${modConfig.label.toUpperCase()}`;
            modTitle.style.color = modConfig.textColor;
            modTitle.style.fontSize = '1.5rem';
            modTitle.style.margin = '0 0 10px 0';
            modTitle.style.textShadow = `3px 3px 2px rgba(0,0,0,0.5), 0 0 8px ${modConfig.textColor}`;

            const modTip = document.createElement('p');
            modTip.textContent = (modKey === 'monkey') ? `${modConfig.tip}[${getRandomLetter()}]` : modConfig.tip;
            const activeSubColor = modConfig.subTextColor || '#fff';
            modTip.style.color = activeSubColor;
            modTip.style.textShadow = `5px 5px 3px rgba(0, 0, 0, 0.4), 4px 4px 8px ${activeSubColor}`;
            modTip.style.margin = '0';
            modTip.style.fontSize = '1.1rem';
            modTip.style.whiteSpace = 'pre-line';

            modContainer.appendChild(modTitle);
            modContainer.appendChild(modTip);
            roleDisplay.insertBefore(modContainer, wordDisplay);
        });
    }

    // Handle Shapeshifter Selection UI
    if (myRoleKey === 'shapeshifters') {
        const exclude = ["shapeshifter", "hidden", "amnesia", "mime"];
        const selectionContainer = document.createElement('div');
        selectionContainer.id = 'shapeshifter-role-selection';
        selectionContainer.classList.add('shapeshifter-role-selection');

        const addRoleBtn = (roleClass, roleConfigKey, customConfig = null) => {
            const roleBtn = document.createElement('button');
            roleBtn.className = 'titan-one-regular';
            roleBtn.textContent = toTitleCase(roleClass.replace('_', ' '));
            roleBtn.onclick = () => {
                updateUi(customConfig || ROLE_DATA[roleConfigKey]);
                selectionContainer.remove();
            };
            selectionContainer.appendChild(roleBtn);
        };

        addRoleBtn('innocent', 'innocents', INNOCENT_CONFIG);
        Object.keys(ROLE_DATA)
            .filter(k => !exclude.includes(ROLE_DATA[k].class))
            .forEach(key => addRoleBtn(ROLE_DATA[key].class, key));

        roleDisplay.insertBefore(selectionContainer, roleTip);
    }

    updateUi(config);

    const main = document.getElementById('main');
    const discussBtn = document.createElement('button');
    discussBtn.className = 'titan-one-regular';
    discussBtn.textContent = "START DISCUSSION";
    discussBtn.onclick = () => {
        document.getElementById('big-text').textContent = "DISCUSS!";
        discussBtn.remove();
    };
    main.appendChild(discussBtn);
}

document.addEventListener('DOMContentLoaded', initOnlinePlay);
