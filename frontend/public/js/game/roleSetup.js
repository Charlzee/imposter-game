import { ROLE_DATA, ROLE_MODIFIERS, RANDOM_EVENTS, getBaseRoleId } from '../roles.js';

const FORCE_ALL_MODIFIERS = false;

export async function decidePlayerList(playersJson, roleCounts = {}, options = {}) {
    const players = JSON.parse(playersJson || '[]');
    const { words = [], selectedWord: chosenWord = null } = options;
    if (!players.length) return;

    const assessableRoleKeys = Object.keys(ROLE_DATA);
    const activeEvents = [];

    if (localStorage.getItem('random_events_enabled') === 'true') {
        Object.keys(RANDOM_EVENTS).forEach((key) => {
            const saved = localStorage.getItem(`event_${key}_percent`);
            const chance = saved ? parseFloat(saved) / 100 : (RANDOM_EVENTS[key].chance || 0.05);
            if (Math.random() < chance) activeEvents.push(key);
        });
    }

    localStorage.setItem('active_random_events', JSON.stringify(activeEvents));

    const assignedRolesData = {};
    Object.keys(ROLE_DATA).forEach((key) => { assignedRolesData[key] = []; });
    const modifierLists = {};
    Object.keys(ROLE_MODIFIERS).forEach((key) => { modifierLists[key] = []; });

    const helpers = {
        setRole: (playerIdx, roleKey) => {
            const player = players[playerIdx];
            if (!player) return;
            Object.keys(assignedRolesData).forEach((key) => {
                assignedRolesData[key] = assignedRolesData[key].filter((name) => name !== player.player_name);
            });
            if (assignedRolesData[roleKey]) assignedRolesData[roleKey].push(player.player_name);
        },
        addModifier: (playerIdx, modKey) => {
            const player = players[playerIdx];
            if (player && modifierLists[modKey] && !modifierLists[modKey].includes(player.player_name)) {
                modifierLists[modKey].push(player.player_name);
            }
        }
    };

    const runDefaultRoleAssignment = () => {
        const subImposterRoles = Object.keys(ROLE_DATA).filter((key) => ROLE_DATA[key].roleType === 'imposter' && key !== 'imposters');
        const occupiedIndices = new Set();

        Object.keys(ROLE_DATA).forEach((roleKey) => {
            if (subImposterRoles.includes(roleKey)) return;

            const baseId = getBaseRoleId(roleKey);
            const count = parseInt(roleCounts[baseId], 10) || 0;
            const chance = parseFloat((localStorage.getItem(`${baseId}_percent`) || '100%').replace('%', '')) / 100;

            for (let i = 0; i < count; i++) {
                if (occupiedIndices.size >= players.length) break;
                if (Math.random() < chance) {
                    let idx;
                    do { idx = Math.floor(Math.random() * players.length); } while (occupiedIndices.has(idx));
                    occupiedIndices.add(idx);
                    assignedRolesData[roleKey].push(players[idx].player_name);
                }
            }
        });
    };

    const runDefaultModifierAssignment = () => {
        if (localStorage.getItem('role_modifers_enabled') === 'true' || FORCE_ALL_MODIFIERS) {
            players.forEach((player, idx) => {
                const roleKey = Object.keys(assignedRolesData).find((key) => (assignedRolesData[key] || []).includes(player.player_name));
                const roleConfig = ROLE_DATA[roleKey];

                if (roleConfig?.immuneToModifiers) return;

                Object.keys(ROLE_MODIFIERS).forEach((modKey) => {
                    if (modKey === 'amnesias' && roleConfig?.immuneToAmnesia) return;

                    const saved = localStorage.getItem(`${modKey}_percent`);
                    const chance = FORCE_ALL_MODIFIERS ? 1 : (saved ? parseFloat(saved) / 100 : ROLE_MODIFIERS[modKey].chance);
                    if (Math.random() < chance) helpers.addModifier(idx, modKey);
                });
            });
        }
    };

    const upgradeImposters = () => {
        const subImposterRoles = Object.keys(ROLE_DATA).filter((key) => ROLE_DATA[key].roleType === 'imposter' && key !== 'imposters');
        const baseImposterNames = [...assignedRolesData.imposters];
        assignedRolesData.imposters = [];

        baseImposterNames.forEach((name) => {
            let roleToAssign = 'imposters';
            for (const subKey of subImposterRoles) {
                const subBaseId = getBaseRoleId(subKey);
                const subChanceStr = localStorage.getItem(`${subBaseId}_percent`) || '0%';
                const subChance = parseFloat(subChanceStr.replace('%', '')) / 100;
                if (Math.random() < subChance) {
                    roleToAssign = subKey;
                    break;
                }
            }
            assignedRolesData[roleToAssign].push(name);
        });
    };

    if (!activeEvents.some((eventKey) => RANDOM_EVENTS[eventKey]?.skipDefaultAssignment)) {
        runDefaultRoleAssignment();
    }

    activeEvents.forEach((eventKey) => {
        const event = RANDOM_EVENTS[eventKey];
        if (event?.onTrigger) event.onTrigger({ players, assignedRolesData, modifierLists, ...helpers });
    });

    upgradeImposters();
    runDefaultModifierAssignment();

    const masterminds = assignedRolesData.mastermind || [];
    if (masterminds.length > 0) {
        const innocentPlayers = players.filter((player) => {
            for (const roleKey in assignedRolesData) {
                if (roleKey === 'innocents') continue;
                if (assignedRolesData[roleKey].includes(player.player_name)) {
                    return false;
                }
            }
            return true;
        }).map((player) => player.player_name);

        if (innocentPlayers.length > 0) {
            const mastermindTargets = {};
            masterminds.forEach((mastermindName) => {
                const availableTargets = innocentPlayers.filter((player) => player !== mastermindName && !Object.values(mastermindTargets).includes(player));
                if (availableTargets.length > 0) {
                    const targetName = availableTargets[Math.floor(Math.random() * availableTargets.length)];
                    mastermindTargets[mastermindName] = targetName;
                    assignedRolesData.recruited_imposters.push(targetName);
                }
            });
            localStorage.setItem('mastermindTargets', JSON.stringify(mastermindTargets));
        }
    }

    localStorage.removeItem('inspectorClues');
    localStorage.removeItem('innocents');
    Object.keys(ROLE_DATA).forEach((key) => { if (ROLE_DATA[key].hasTarget) localStorage.removeItem(`${getBaseRoleId(key)}Targets`); });
    localStorage.removeItem('justificationWords');
    localStorage.removeItem('original_venom');
    Object.keys(ROLE_MODIFIERS).forEach((key) => { if (ROLE_MODIFIERS[key].hasTarget) localStorage.removeItem(`${getBaseRoleId(key)}Targets`); });
    Object.keys(ROLE_DATA).forEach((key) => { if (ROLE_DATA[key].selectPlayer) localStorage.removeItem(`${getBaseRoleId(key)}SelectedTargets`); });
    Object.keys(ROLE_DATA).forEach((key) => { if (ROLE_DATA[key].selectCustom) localStorage.removeItem(`${getBaseRoleId(key)}CustomSelection`); });

    const assignTargets = (roleArray, storageKey) => {
        const targets = {};
        roleArray.forEach((name) => {
            const myIdx = players.findIndex((player) => player.player_name === name);
            let targetIdx;
            do {
                targetIdx = Math.floor(Math.random() * players.length);
            } while (targetIdx === myIdx && players.length > 1);
            targets[name] = players[targetIdx].player_name;
        });
        localStorage.setItem(storageKey, JSON.stringify(targets));
    };

    assessableRoleKeys.forEach((roleKey) => {
        localStorage.setItem(roleKey, JSON.stringify(assignedRolesData[roleKey]));
        if (ROLE_DATA[roleKey].hasTarget) assignTargets(assignedRolesData[roleKey], `${getBaseRoleId(roleKey)}Targets`);
    });

    if (assignedRolesData.venom && assignedRolesData.venom.length > 0) {
        localStorage.setItem('original_venom', JSON.stringify(assignedRolesData.venom));
    }

    Object.keys(ROLE_MODIFIERS).forEach((modKey) => {
        localStorage.setItem(modKey, JSON.stringify(modifierLists[modKey]));
        if (ROLE_MODIFIERS[modKey].hasTarget) assignTargets(modifierLists[modKey], `${getBaseRoleId(modKey)}Targets`);
    });

    const justificationPlayers = modifierLists.justification || [];
    if (justificationPlayers.length > 0) {
        try {
            const response = await fetch('js/english_language.json');
            const englishData = await response.json();
            const sourceWords = englishData[0]?.words || (Array.isArray(words) ? words.filter((word) => word !== chosenWord) : []);
            const justificationWords = {};
            justificationPlayers.forEach((playerName) => {
                const randomWord = sourceWords[Math.floor(Math.random() * sourceWords.length)] || 'word';
                justificationWords[playerName] = randomWord;
            });
            localStorage.setItem('justificationWords', JSON.stringify(justificationWords));
        } catch (error) {
            console.error('Failed to load english_language.json for Justification modifier:', error);
        }
    }

    localStorage.setItem('unselected_shapeshifters', JSON.stringify(assignedRolesData.shapeshifters || []));

    return assignedRolesData;
}
