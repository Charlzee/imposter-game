// Import game logic and constants
import { getURLParameter, getRandomLetter, getRandomLetterOrNumber } from '../js/global.js';
import { ROLE_MODIFIERS, ROLE_DATA, INNOCENT_CONFIG, getBaseRoleId } from './roles.js';
import { getStorageJson } from './game/storage.js';
import { fetchGameData, createSelectedWord } from './game/wordSetup.js';
import { decidePlayerList } from './game/roleSetup.js';
import { createRoleUiController } from './game/ui.js';
import { createVoteController } from './game/voteFlow.js';
import { createGameFlowController } from './game/gameFlow.js';
import { getRoleOfPlayer } from './game/playerUtils.js';

// === PLAY PAGE SETUP ===
// These are the game rules shown during discussion before voting begins.
const RULES = [
    "<p style='font-size: 32px'>BREAKING ANY OF THESE RULES WILL MAKE YOU INSTANTLY LOSE AND YOU WILL GET SHOT AND DIE </p>",
    "1. No cheating or revealing your role to other players.",
    "2. No saying single letters",
    "3. No saying opinions",
    "4. No saying 'food' or 'drink' or 'good' or 'bad' (unless NPC modifier)",
    "5. No saying sizes (unless NPC modifier)",
    "6. No saying colours (unless NPC modifier)",
    "7. No saying 67 or charlie kirk (sorry elijah)",
    "8. No teaming",
    "9. No saying who you know is innocent (e.g. Inspector, Innocent+, King, etc.)"
]

// ==== GLOBAL STATE ==== 
// Shared state used by the gameplay modules.
let selectedTopic = null;
let words = [];
let selectedWord = null;
let currentIndex = 1;
let viewingRoles = false;
let gameTimer = null;
let selectedVoteTarget = null;

const main = document.getElementById('main');
const roleDisplay = document.getElementById('role-display');
const gameState = { selectedTopic: null, words: [] };

// UI controller for showing role cards and role-specific information.
const roleUiController = createRoleUiController();

roleUiController.initialize({ roleDisplayElement: roleDisplay });
// Vote flow controller handles the voting screen and vote tallying.
const voteController = createVoteController({
    mainElement: main,
    getSelectedWord: () => selectedWord,
    getSelectedVoteTarget: () => selectedVoteTarget,
    setSelectedVoteTarget: (value) => {
        selectedVoteTarget = value;
    }
});

const gameFlowController = createGameFlowController({
    mainElement: main,
    roleDisplayElement: roleDisplay,
    readyButtonElement: document.getElementById('ready-button'),
    rules: RULES,
    getSelectedWord: () => selectedWord,
    setSelectedWord: (value) => {
        selectedWord = value;
    },
    getCurrentIndex: () => currentIndex,
    setCurrentIndex: (value) => {
        currentIndex = value;
    },
    getGameTimer: () => gameTimer,
    setGameTimer: (value) => {
        gameTimer = value;
    },
    displayRole,
    hideRole,
    getRoleOfPlayer,
    startVote,
    fetchGameData,
    createSelectedWord,
    decidePlayerList,
    getStorageJson,
    getBaseRoleId,
    ROLE_DATA,
    INNOCENT_CONFIG,
    gameState,
    setSelectedTopic: (value) => {
        selectedTopic = value;
    },
    setWords: (value) => {
        words = value;
    },
    setSelectedVoteTarget: (value) => {
        selectedVoteTarget = value;
    }
});

// Render the current player's role card.
function displayRole(playerIndex) {
    roleUiController.setGameContext({ words, selectedWord });
    roleUiController.displayRole(playerIndex);
}

// Hide the current role card.
function hideRole(playerIndex) {
    roleUiController.hideRole(playerIndex);
}

// Start the voting phase.
function startVote() {
    voteController.startVote();
}

// Select the player being voted for.
function selectVoteTarget(playerName) {
    voteController.selectVoteTarget(playerName);
}

// Update the prompt showing who is currently voting
function updateVoterPrompt() {
    voteController.updateVoterPrompt();
}

// Handles a player casting their vote
function castVote(votedFor) {
    voteController.castVote(votedFor);
}

// Calculate the final vote outcome and show the results.
function tallyVotes() {
    voteController.tallyVotes();
}

function createRulesList() {
    return gameFlowController.createRulesList();
}

// Start the discussion phase and timer.
async function startGame(updateStats = true) {
    return gameFlowController.startGame(updateStats);
}

// Return to the lobby/setup screen.
function lobby() {
    return gameFlowController.lobby();
}

// Initialize the gameplay page when it loads.
async function init() {
    return gameFlowController.init();
}

gameFlowController.attachReadyHandler();

init();
