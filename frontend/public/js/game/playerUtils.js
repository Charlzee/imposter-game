import { ROLE_DATA } from '../roles.js';
import { getStorageJson } from './storage.js';

export function getRoleOfPlayer(playerName, storageAccessor = getStorageJson) {
    const activeRoleKeys = Object.keys(ROLE_DATA).filter((key) => key !== 'shapeshifters');
    let roleKey = activeRoleKeys.find((key) => storageAccessor(key).includes(playerName));

    const isUnselectedShapeshifter = storageAccessor('unselected_shapeshifters').includes(playerName);
    if (!roleKey && storageAccessor('shapeshifters').includes(playerName) && !isUnselectedShapeshifter) {
        roleKey = 'shapeshifters';
    } else if (isUnselectedShapeshifter) {
        roleKey = 'shapeshifters';
    }

    return roleKey || 'innocents';
}

export function getLivingPlayers(storageAccessor = getStorageJson) {
    const allPlayers = storageAccessor('current_players');
    const killedPlayers = Object.values(storageAccessor('ninjaSelectedTargets', {}));
    return allPlayers.filter((player) => !killedPlayers.includes(player.player_name));
}
