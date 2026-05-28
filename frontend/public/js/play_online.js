import { getURLParameter, getRandomLetter } from './global.js';
import { ROLE_DATA, ROLE_MODIFIERS, INNOCENT_CONFIG } from './roles.js';

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

    const myRoleKey = Object.keys(ROLE_DATA).find(key => game[key]?.includes(myUsername));
    const activeModifiers = Object.keys(ROLE_MODIFIERS).filter(key => game[key]?.includes(myUsername));
    const config = ROLE_DATA[myRoleKey] || INNOCENT_CONFIG;
    const myWord = game.word;

    const roleTitle = document.getElementById('role-title');
    const roleStatus = document.getElementById('role-status');
    const wordDisplay = document.getElementById('word');
    const roleTip = document.getElementById('role-tip');
    const roleDisplay = document.getElementById('role-display');

    const allRoleClasses = [...Object.values(ROLE_DATA).map(r => r.class), ...Object.values(ROLE_MODIFIERS).map(m => m.class), 'innocent', 'hidden'];

    roleStatus.classList.remove('hidden');
    roleTitle.textContent = `${myUsername}, your role is:`;

    roleStatus.classList.remove(...allRoleClasses);
    roleStatus.textContent = config.label;
    roleStatus.classList.add(config.class);
    const activeColor = config.textColor || 'white';
    roleStatus.style.color = activeColor;
    roleStatus.style.textShadow = `7px 7px 4px rgba(0, 0, 0, 0.4), 6px 6px 10px ${activeColor}`;
    roleDisplay.style.backgroundImage = config.grad;
    roleTip.textContent = config.tip;

    let displayWord = config.showWord;
    activeModifiers.forEach(modKey => {
        if (ROLE_MODIFIERS[modKey].overrideWordVisibility) displayWord = ROLE_MODIFIERS[modKey].showWord;
    });

    let content = displayWord ? myWord : '???';

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

    if (game.hitmanTargets?.[myUsername]) content += `\n\nYOUR TARGET: ${game.hitmanTargets[myUsername]}`;
    if (game.guardian_angelTargets?.[myUsername]) content += `\n\nYOUR TARGET: ${game.guardian_angelTargets[myUsername]}`;
    if (game.annoyingTargets?.[myUsername]) content += `\n\nYOUR TARGET: ${game.annoyingTargets[myUsername]}`;
    if (game.inspectorClues?.[myUsername]) content += `\n\nONE NON-IMPOSTER:\n[${game.inspectorClues[myUsername]}]`;

    wordDisplay.textContent = content;

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
