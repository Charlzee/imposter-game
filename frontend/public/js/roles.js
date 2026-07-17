import { getRandomPlayer, getRandomPlayerIndex } from "./global.js";

// Configuration for all role modifiers
export const ROLE_MODIFIERS = {
    amnesias: { 
        label: 'Amnesia', class: 'amnesia', 
        tip: 'You forgot your role :c\nTry to remember (guess) your role!', 
        grad: 'linear-gradient(135deg, #27B4F5 0%, #145A7B 100%)',
        textColor: '#B0E2FF',
        subTextColor: '#E0F5FF',
        image: 'assets/images/amnesia-bg.png',
        showWord: false,
        overrideWordVisibility: true,
        overrideRoleDisplay: true,
        displayLabel: '%?$?£$',
        chance: 0.05
    },
    mimes: { 
        label: 'Mime', class: 'mime', 
        tip: 'You can only act out actions on your turn!', 
        grad: 'linear-gradient(135deg, #2c3e50 0%, #000000 100%)',
        textColor: '#ffffff',
        subTextColor: '#E6E6E6',
        chance: 0.05
    },
    dumb: {
        label: 'Dumb', class: 'dumb', 
        tip: 'You can\'t defend yourself if you get accused!', 
        grad: 'linear-gradient(135deg, #4EA809 0%, #245400 100%)',
        textColor: '#D4FFB2',
        subTextColor: '#86E63C',
        roleType: 'innocent',
        chance: 0.05
    },
    teacher: {
        label: 'English Teacher', class: 'teacher', 
        tip: 'You must criticize people\'s wording when they say their word!', 
        grad: 'linear-gradient(135deg, #0961A8 0%, #053154 100%)',
        textColor: '#C8D2FF',
        subTextColor: '#A096FF',
        roleType: 'innocent',
        chance: 0.05
    },
    cheater: {
        label: 'Cheater', class: 'cheater', 
        tip: 'You, and ONLY YOU, WILL win. No one else. No matter what. (Only reveal at the end of the game)', 
        grad: 'linear-gradient(135deg, red 0%, orange 20%, yellow 40%, green 60%, blue 80%, violet 100%)',
        textColor: '#FFFF00',
        subTextColor: '#FFFF96',
        roleType: 'neutral',
        chance: 0.001,
        winCondition: ({ player, allWinStates }) => {
            // Cheater wins, everyone else loses.
            Object.keys(allWinStates).forEach(pName => allWinStates[pName] = false);
            return true;
        }
    },
    happy: {
        label: 'Happy', class: 'happy', 
        tip: 'EVERYONE WINS!!! (Only reveal at the end of the game)', 
        grad: 'linear-gradient(135deg, red 0%, orange 20%, yellow 40%, green 60%, blue 80%, violet 100%)',
        textColor: '#FFFF00',
        subTextColor: '#FFFF96',
        winCondition: ({ allWinStates }) => {
            Object.keys(allWinStates).forEach(pName => allWinStates[pName] = true);
            return true;
        },
        roleType: 'neutral',
        chance: 0.0001
    },
    lucky: {
        label: 'Lucky', class: 'lucky', 
        tip: 'Your vote counts as 2!', 
        grad: 'linear-gradient(135deg, lightgreen 0%, green 100%)',
        textColor: '#AAFF00', 
        subTextColor: '#37FF41',
        roleType: 'innocent',
        chance: 0.035,
        extraVotes: 1
    },
    unlucky: {
        label: 'Unlucky', class: 'unlucky', 
        tip: 'You lose a vote!', 
        grad: 'linear-gradient(135deg, green 0%, darkgreen 100%)',
        textColor: '#5EA000',
        subTextColor: '#37C841',
        roleType: 'innocent', 
        chance: 0.035,
        extraVotes: -1
    },
    terrorist: {
        label: 'Terrorist', class: 'terrorist', 
        tip: 'If you get voted out, EVERYONE loses (including you)!', 
        grad: 'linear-gradient(135deg, #EB572A 0%, #762C15 100%)',
        textColor: '#FFD7CC',
        subTextColor: '#FF3737',
        roleType: 'neutral',
        chance: 0.035
    },
    scholar: {
        label: 'Scholar', class: 'scholar', 
        tip: 'You get to see the word and theme! (useless unless you are imposter)', 
        grad: 'linear-gradient(135deg, #5D3FD3 0%, #150A3C 100%)',
        textColor: '#BB99FF',
        subTextColor: '#DCC8FF',
        showWord: true,
        showTheme: true, 
        roleType: 'innocent',
        overrideWordVisibility: true,
        chance: 0.025
    },
    npc: {
        label: 'NPC', class: 'npc', 
        tip: 'You can only use generic words (e.g. \'thing\', \'good\', \'bad\')', 
        grad: 'linear-gradient(135deg, #D18973 0%, #69453A 100%)',
        textColor: 'peru',
        subTextColor: 'darkorange',
        roleType: 'innocent',
        chance: 0.05
    },
    monkey: {
        label: 'Monkey', class: 'monkey',
        tip: 'Your word/sentence MUST contain the letter/number: ',
        grad: 'linear-gradient(135deg, #4D2B21 0%, #3B1307 100%)',
        textColor: '#FFDBAC',
        subTextColor: '#D2B48C',
        roleType: 'innocent',
        appendRandomLetterOrNumber: true,
        chance: 0.05
    },
    kirk: {
        label: 'Charlie Kirk', class: 'kirk',
        tip: 'You need to debate witn someone.',
        grad: 'linear-gradient(135deg, orange 0%, orangered 100%)',
        textColor: 'white',
        subTextColor: 'red',
        roleType: 'innocent',
        chance: 0.05
    },
    refugee: {
        label: 'Refugee', class: 'refugee',
        tip: 'You must speak different language the entire round.',
        grad: 'linear-gradient(135deg, lightblue 0%, cyan 100%)',
        textColor: '#6DFBBB',
        subTextColor: 'aliceblue',
        roleType: 'innocent',
        chance: 0.05
    },
    narccisist: {
        label: 'Narccisist', class: 'narccisist',
        tip: 'You must mention yourself or your own skills at least three times while describing the word.',
        grad: 'linear-gradient(135deg, #ff0000, #ff3a00, #ff5400, #ff6800, #ff7a00)',
        textColor: 'white',
        subTextColor: 'orange',
        roleType: 'innocent',
        chance: 0.04
    },
    furry: {
        label: 'Furry', class: 'furry',
        tip: 'You must meow, bark, etc, at the end of each sentence',
        grad: 'linear-gradient(135deg, #ff2fc0, #f516cd, #e600dd, #d200ed, #b700ff)',
        textColor: '#FFE0F0',
        subTextColor: 'white',
        roleType: 'innocent',
        chance: 0.05
    },
    big: {
        label: 'Big Idea', class: 'big',
        tip: 'You must say "BIG IDEA" in a bold voice before each sentence.',
        grad: 'linear-gradient(135deg, #d2ff2f, #c5ff25, #b7ff1a, #a7ff0e, #96ff00)',
        textColor: '#00C828',
        subTextColor: 'white',
        roleType: 'innocent',
        chance: 0.05
    },
    annoying: {
        label: 'Annoying',
        class: 'annoying',
        tip: 'You need to repeat everything your target says right after they do!',
        grad: 'linear-gradient(135deg, #DFFF00 0%, #98AF00 100%)',
        textColor: '#9AB62B',
        roleType: 'innocent',
        hasTarget: true,
        chance: 0.05
    },
    forbidden: {
        label: 'Forbidden',
        class: 'forbidden',
        tip: 'Your word/sentence CANNOT contain the letter: ',
        grad: 'linear-gradient(135deg, #A1FFA6 0%, #0FFF07 100%)',
        textColor: '#68FF7C',
        roleType: 'innocent',
        appendRandomLetter: true,
        chance: 0.05
    },
    plus: {
        label: 'PLUS',
        class: 'plus',
        tip: 'Your role has been UPGRADED! Your role has gained extra abilities: ',
        grad: 'linear-gradient(135deg, #B9F2FF 0%, #29D1FF 100%)',
        textColor: '#FFFFFF',
        subTextColor: '#AFD9FF',
        roleType: 'innocent',
        isPlus: true,
        chance: 0.05,
        selectionListColor: 'rgba(41, 209, 255, 0.4)'
    },
    femboy: {
        label: 'Femboy',
        class: 'femboy',
        tip: 'You cannot vote this person<br><br>Make sure to be a good boy :3 : ',
        grad: 'linear-gradient(135deg, #B9F2FF 0%, #29D1FF 100%)',
        textColor: '#FFFFFF',
        subTextColor: '#AFD9FF',
        roleType: 'innocent',
        hasTarget: true,
        chance: 0.05
    },
    slowmo: {
        label: 'Slow-Mo',
        class: 'slowmo',
        tip: 'You must speak and act in slow motion.',
        grad: 'linear-gradient(135deg, #949494, #828282, #717171, #606060, #4f4f4f)',
        textColor: '#888888',
        subTextColor: '#AAAAAA',
        roleType: 'innocent',
        chance: 0.05
    },
    neglected: {
        label: 'Neglected',
        class: 'neglected',
        tip: 'You cannot mention this player in any way, only vote for them: ',
        grad: 'linear-gradient(135deg, #FF9933, #FFCC66, #FFFF99)',
        textColor: '#FFFFFF',
        subTextColor: '#ffec46',
        roleType: 'innocent',
        hasTarget: true,
        chance: 0.05
    },
    glazer: {
        label: 'Glazer',
        class: 'glazer',
        tip: 'You must glaze this person: ',
        grad: 'linear-gradient(135deg, #fff561, #ffeb60, #ffe261, #ffd962, #ffd063)',
        textColor: '#FFFFFF',
        subTextColor: '#ffec46',
        roleType: 'innocent',
        hasTarget: true,
        chance: 0.05
    },
    smash: {
        label: 'Smash or Pass',
        class: 'smash',
        tip: 'You need to say Smash or Pass before everything you say',
        grad: 'linear-gradient(135deg, #0048ff, #0094ff, #00c2ff, #00e5bb, #00ff4e)',
        textColor: '#FFFFFF',
        subTextColor: '#00B1FF',
        roleType: 'innocent',
        chance: 0.05
    },
    justification: {
        label: 'Justification',
        class: 'justification',
        tip: 'Get given a random word and have to say it and justify it if asked',
        grad: 'linear-gradient(135deg, #bc00ff, #bb68ff, #c298ff, #d0c1f8, #e7e7e7)',
        textColor: '#FFFFFF',
        subTextColor: '#B100FF',
        getsRandomOtherWord: true,
        roleType: 'innocent',
        chance: 0.05
    },
    lonely: {
        label: 'I\'m lonely',
        class: 'lonely',
        tip: 'You need to head pat anyone named "Charlie" at least once per round and if you don\'t you lose every round ever.',
        grad: 'linear-gradient(135deg, #1a2a6c, #4a4e69, #9a8c98)',
        textColor: '#FFFFFF',
        subTextColor: '#FFFFFF',
        roleType: 'innocent',
        chance: 0.05
    },
};

// Random events
export const RANDOM_EVENTS = {
    // ROLE RANDOM EVENTS:
    all_imposter: {
        label: "Everyone is imposter except one",
        chance: 0.01,
        displayEventOnShowRoles: true,
        skipDefaultAssignment: true,
        onTrigger: ({ players, setRole }) => {
            players.forEach((_, idx) => setRole(idx, 'imposters'));
            setRole(getRandomPlayerIndex(players), 'innocents')
        }
    },
    all_shapeshifter: {
        label: "Everyone is shapeshifter",
        chance: 0.01,
        displayEventOnShowRoles: true,
        skipDefaultAssignment: true,
        onTrigger: ({ players, setRole }) => {
            players.forEach((_, idx) => setRole(idx, 'shapeshifters'));
        }
    },
    e_p_stien: {
        label: "E. P. Stein",
        chance: 0.01,
        onTrigger: ({ players, setRole }) => {
            players.forEach((_, idx) => setRole(idx, 'epstein'));
        }
    },
    one_v_one: {
        label: "1v1",
        chance: 0.01,
        displayEventOnShowRoles: true,
        onTrigger: ({ players, setRole }) => {
            players.forEach((_, idx) => setRole(idx, 'pirate'));
        }
    },

    // MODIFIER RANDOM EVENTS:
    all_mime: {
        label: "Everyone is mime",
        chance: 0.01,
        onTrigger: ({ players, addModifier }) => {
            players.forEach((_, idx) => addModifier(idx, 'mimes'));
        }
    },
    big_furries: {
        label: "Big Furries",
        chance: 0.01,
        onTrigger: ({ players, addModifier }) => {
            players.forEach((_, idx) => addModifier(idx, 'furry'));
            players.forEach((_, idx) => addModifier(idx, 'big'));
        }
    },
    glazed: {
        label: "Glazed",
        chance: 0.01,
        onTrigger: ({ players, addModifier }) => {
            players.forEach((_, idx) => addModifier(idx, 'glazer'));
        }
    },
    neglection: {
        label: "Neglection",
        chance: 0.01,
        displayEventOnShowRoles: true,
        onTrigger: ({ players, addModifier }) => {
            players.forEach((_, idx) => addModifier(idx, 'neglected'));
        }
    },
    uh_oh: {
        label: "Uh oh",
        chance: 0.01,
        displayEventOnShowRoles: true,
        onTrigger: ({ players, addModifier }) => {
            players.forEach((_, idx) => addModifier(idx, 'terrorist'));
        }
    },
}

// Main game role definitions
const ALL_ROLE_DATA = {
    innocents: {
        label: 'Innocent',
        class: 'innocent',
        tip: 'Find the imposter!',
        grad: 'linear-gradient(135deg, #00FF00 0%, #008000 100%)',
        textColor: 'white',
        showWord: true, 
        roleType: 'innocent',
        selectable: true
    },
    imposters: {
        label: 'Imposter',
        class: 'imposter',
        tip: 'Dont get caught!',
        grad: 'linear-gradient(135deg, #FF0000 0%, #800000 100%)',
        textColor: 'white',
        showWord: false, 
        roleType: 'imposter',
        selectable: true
    },
    jesters: {
        label: 'Jester',
        class: 'jester',
        tip: 'Try to get voted out!',
        grad: 'linear-gradient(135deg, #FF00FF 0%, #800080 100%)',
        textColor: 'white',
        showWord: true, 
        roleType: 'neutral', 
        winCondition: ({ player, playersOut }) => {
            return playersOut.includes(player.player_name);
        },
        selectable: true
    },
    hitmans: {
        label: 'Hitman',
        class: 'hitman',
        tip: 'Try to vote out your target!',
        grad: 'linear-gradient(135deg, #5454FF 0%, #2A2A80 100%)',
        textColor: 'white',
        showWord: true, 
        roleType: 'neutral',
        hasTarget: true,
        selectable: true,
        winCondition: ({ player, playersOut, getStorageJson }) => {
            return playersOut.includes(getStorageJson('hitmanTargets', {})[player.player_name]);
        }
    },
    shapeshifters: {
        label: 'Shapeshifter',
        //label: 'Trans',
        class: 'shapeshifter',
        tip: 'CHOOSE YOUR ROLE.',
        //tip: 'Happy pride month :3',
        grad: 'linear-gradient(135deg, #FFA500 0%, #FF5300 100%)',
        //grad: 'linear-gradient(to bottom, #5BCEFA, #F5A9B8, #FFFFFF, #F5A9B8, #5BCEFA)',
        //textColor: '#fcb0ff',
        textColor: '#FFB500',
        showWord: false, 
        immuneToAmnesia: true,
        roleType: 'neutral',
        isShapeshifter: true,
        selectionListColor: 'radial-gradient(ellipse, #667eea 0%, #764ba2 100%)'
    },
    guardian_angels: {
        label: 'Guardian Angel',
        class: 'guardian_angel',
        tip: 'Try to protect your target!',
        grad: 'linear-gradient(135deg, #C7FFF9 0%, #64807D 100%)',
        textColor: 'white',
        showWord: true, 
        roleType: 'innocent',
        hasTarget: true,
        selectable: true,
        winCondition: ({ player, playersOut, getStorageJson }) => {
            const myTarget = getStorageJson('guardian_angelTargets', {})[player.player_name];
            return !playersOut.includes(myTarget); // Win if target is not voted out
        }
    },
    alphas: {
        label: 'Alpha',
        class: 'alpha',
        tip: 'If you get even 1 vote, you lose! But you win if you dont receive any votes.',
        grad: 'linear-gradient(135deg, #C8C8C8 0%, #646464 100%)',
        textColor: 'white',
        showWord: true, 
        roleType: 'innocent', 
        selectable: true,
        winCondition: ({ player, votes }) => {
            const votesForMe = (votes[player.player_name] || []).length; // This vote count is before the plusAbility is applied
            return votesForMe === 0; // Win if you get 0 votes, lose otherwise.
        },
        plusAbility: (voters, { getRoleOfPlayer, ROLE_DATA, INNOCENT_CONFIG }) => {
            return voters.filter(voterName => (ROLE_DATA[getRoleOfPlayer(voterName)] || INNOCENT_CONFIG).roleType !== 'imposter');
        }
    },
    inspectors: {
        label: 'Inspector Goole',
        class: 'inspector',
        tip: 'Use your clue to find the imposter and aura farm',
        grad: 'linear-gradient(135deg, #EBB72A 0%, #765C15 100%)',
        textColor: 'white',
        showWord: true, 
        roleType: 'innocent',
        hasClue: true,
        selectable: true
    },
    kings: {
        label: 'King',
        class: 'king',
        tip: 'You are the king. All the Innocents know that you are the King, you win if the imposter doesn\'t vote you.',
        grad: 'linear-gradient(135deg, #FFFF00 0%, #AFAF00 100%)',
        textColor: '#FFFFAA',
        showWord: true, 
        roleType: 'innocent',
        revealRoleToInnocents: true,
        selectable: false
    },
    jailor: {
        label: 'Jailor',
        class: 'jailor',
        tip: 'You can \'jail\' someone, making them say 3 words.',
        grad: 'linear-gradient(135deg, #009a0a, #008b14, #007d1a, #006e1c, #00601d)',
        textColor: '#2EA150',
        showWord: true, 
        roleType: 'innocent',
        selectable: true,
        immuneToAmnesia: true,
        selectPlayer: true,
        canSelectSelf: true,
        revealSelectedPlayer: true,
        revealText: "JAILED",
        selectionListColor: 'rgba(0, 96, 29, 0.7)'
    },
    tactician: {
        label: 'Tactician',
        class: 'tactician',
        tip: 'You are able to make someone say their word first.',
        grad: 'linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)',
        textColor: '#bcff21',
        showWord: true, 
        roleType: 'innocent',
        selectable: true,
        immuneToAmnesia: true,
        selectPlayer: true,
        canSelectSelf: true,
        revealSelectedPlayer: true,
        revealText: "FORCED TO GO FIRST",
        selectionListColor: 'rgba(150, 230, 161, 0.7)'
    },
    ninja: {
        label: 'Ninja',
        class: 'ninja',
        tip: 'You are able to kill someone.\nThis makes them unable to speak, vote, etc.',
        grad: 'linear-gradient(135deg, #b10000, #b4221c, #b43631, #b34744, #b05656)',
        textColor: '#ff0000',
        showWord: false, 
        roleType: 'imposter',
        selectable: true,
        immuneToAmnesia: true,
        selectPlayer: true,
        canSelectSelf: false,
        revealSelectedPlayer: true,
        revealText: "KILLED",
        selectionListColor: 'rgba(255, 100, 100, 0.7)'
    },
    arsonist: {
        label: 'Arsonist',
        class: 'arsonist',
        tip: 'You are able to set someone on fire.',
        grad: 'linear-gradient(135deg, #cc0000, #d91400, #e52100, #f22d00, #ff3700)',
        textColor: '#FF4800',
        showWord: false, 
        roleType: 'imposter',
        selectable: true,
        immuneToAmnesia: true,
        selectPlayer: true,
        canSelectSelf: true,
        revealSelectedPlayer: true,
        revealText: "ON FIRE",
        selectionListColor: 'rgba(255, 130, 100, 0.7)'
    },
    scout: {
        label: 'Scout',
        class: 'scout',
        tip: 'You see 5 potential words. One is correct!',
        grad: 'linear-gradient(135deg, #ff3e50 0%, #ffa100 100%)',
        textColor: '#FFA600',
        showWord: false,
        showsOtherWords: true,
        roleType: 'imposter',
        selectable: true
    },
    medusa: {
        label: 'Medusa',
        class: 'medusa',
        tip: 'Select a target, that target cannot move, make gestures or even vote. Turned to stone :)',
        grad: 'linear-gradient(135deg, #8b0000, #a02000, #b23a00, #c45500, #d66f00)',
        textColor: '#FFD700',
        showWord: false, 
        roleType: 'imposter',
        selectable: true,
        immuneToAmnesia: true,
        selectPlayer: true,
        canSelectSelf: true,
        revealSelectedPlayer: true,
        revealText: "TURNED TO STONE",
        selectionListColor: 'rgba(180, 80, 50, 0.7)'
    },
    gambler: {
        DISABLED: true,
        label: 'Gambler',
        class: 'gambler',
        tip: 'You can gamble',
        grad: 'linear-gradient(135deg, #ff3e50 0%, #ffa100 100%)',
        textColor: '#FFA600',
        showWord: false,
        isGambler: true,
        gambleActions: [
            {
                'name': 'Meow :3',
                action: ({ playerIndex, addModifier }) => {
                    addModifier(playerIndex, 'furry');
                }
            },
            {
                'name': 'Keep going bro, you will get there one day',
                action: ({}) => {return 0}
            },
            {
                'name': 'You have been given a random modifier, mwuahahaha',
                action: ({ playerIndex, addModifier }) => {
                    const bad = ['cheater', 'happy'];

                    const availableKeys = Object.keys(ROLE_MODIFIERS).filter(
                        key => !bad.includes(key)
                    );

                    if (availableKeys.length > 0) {
                        const randomKey = availableKeys[Math.floor(Math.random() * availableKeys.length)];
                        addModifier(playerIndex, randomKey);
                        console.log(`GAVE PLAYER ${playerIndex+1} ${randomKey}`);
                    } else {
                        console.warn("No available keys found after filtering.");
                    }
                }
            }
        ],
        roleType: 'innocent'
    },
    divine_art: {
        label: 'Divine Arts',
        class: 'divine_art',
        tip: 'Any votes cast against you are nullified.',
        grad: 'linear-gradient(135deg, #ddd800, #e3e236, #e9ec53, #f0f56c, #f7ff83)',
        textColor: '#FFFDAA',
        showWord: true,
        roleType: 'innocent',
        selectable: true
    },
    gold_roger: {
        label: 'Gol D. Roger',
        class: 'gold_roger',
        tip: 'Choose someone to give your will to.\nYou will die, but they will gain an extra vote.',
        grad: 'linear-gradient(135deg, #ddd800, #e3e236, #e9ec53, #f0f56c, #f7ff83)',
        textColor: '#FFFDAA',
        showWord: false,
        roleType: 'neutral',
        selectable: true,
        selectPlayer: true,
        canSelectSelf: false,
        revealSelectedPlayer: true,
        revealText: "<player> HAS GIVEN THEIR WILL TO",
        selectionListColor: 'rgba(180, 80, 50, 0.7)',
        selectionText: "SELECT SOMEONE TO GIVE YOUR WILL TO",
        alsoKillsSelf: true,
        winCondition: ({ gameOutcome }) => {
            return gameOutcome === 'innocents_win'; // Wins with the innocents
        }
    },
    epstein: {
        label: 'Epstein',
        class: 'epstein',
        tip: 'Select a player to receive a random buff/nerf. Your vote will be locked on to that person but you are able to pretend to vote someone else.\nYou win if your victim doesn’t vote for you.',
        grad: 'linear-gradient(135deg, #ffffff, #f9f9f9, #f3f3f3, #ededed, #e7e7e7)',
        textColor: '#F0F0F0',
        showWord: true,
        roleType: 'neutral',
        selectable: true,
        selectPlayer: true,
        canSelectSelf: false,
        revealSelectedPlayer: true,
        revealText: "EPSTEIN HAS BROUGHT HIS VICTIM TO HIS ISLAND",
        selectionListColor: 'rgba(200, 200, 200, 0.7)',
        selectionText: "SELECT A VICTIM TO ENTER YOUR ISLAND",
        winCondition: ({ player, votes, getStorageJson }) => {
            const victim = getStorageJson('epsteinSelectedTargets', {})[player.player_name];
            const votesForEpstein = votes[player.player_name] || [];
            return !votesForEpstein.includes(victim);
        },
        selectionRevealEffects: [
            {
                'text': '<player> was diddled to death. RIP',
                'killPlayer': true,
                'chance': 0.1
            },
            {
                'text': '<player> befriended him therefore his vote for them will not count.',
                'chance': 0.1
            },
            {
                'text': '<player> encountered that <otherPlayer> fell victim to Epstein and brutally died.',
                'killOtherPlayer': true,
                'chance': 0.1
            },
            {
                'text': '<player>\'s mouth was stuffed with baby oil. They may not speak for the entire round',
                'chance': 0.1
            },
            {
                'text': '<player> encountered Epstein diddling someone and stealing their vote. Epstein gets an extra vote.',
                'chance': 0.1
            },
            {
                'text': 'Epstein opens up and reveals that they are trans and has become innocent. Epstein now wins with the innocents.',
                'chance': 0.1
            },
            {
                'text': 'Epstein is feeling his power and <player> must say their word last',
                'chance': 0.1
            },
            {
                'text': 'Epstein has revealed that <player> has a small pp, embarrassing 😩😩 they must now sit down in shame.',
                'chance': 0.2
            },
            {
                'text': '<player> has become a dog for Epstein, they must woof/bark after everything that they say.',
                'chance': 0.1
            },
        ]
    },
    venom: {
        label: 'Venom',
        class: 'venom',
        tip: 'Take over somebody, they die and you become their role',
        grad: 'linear-gradient(135deg, #051937, #231336, #38082d, #45001c, #490000)',
        textColor: '#986565',
        showWord: false,
        roleType: 'neutral',
        selectable: true,
        selectPlayer: true,
        canSelectSelf: false,
        selectionListColor: 'rgba(180, 80, 50, 0.7)',
        selectionText: "SELECT SOMEONE TO STEAL THEIR ROLE",
        isVenom: true
    },
    mastermind: {
        label: 'Mastermind',
        class: 'mastermind',
        tip: 'One random innocent has their role switched to "Recruited Imposter" you know who they are but they dont know who you are.',
        grad: 'linear-gradient(135deg, #d80000, #ce2e27, #c04540, #ae5654, #986565)',
        textColor: '#FF6565',
        showWord: false,
        roleType: 'imposter',
        selectable: false,
        doesRecruit: true,
        hasTarget: true // To store the recruited player
    },
    recruited_imposters: {
        label: 'Recruited Imposter',
        class: 'imposter',
        tip: 'You have been recruited by the Mastermind! You are now an Imposter.',
        grad: 'linear-gradient(135deg, #c04540, #ae5654, #986565, #493333)',
        textColor: '#FF9090',
        showWord: false,
        roleType: 'imposter',
        selectable: false,
        showInSettings: false,
    },
    witch: {
        label: 'Witch',
        class: 'witch',
        tip: 'Select a player to curse.',
        grad: 'linear-gradient(135deg, #d80000, #ce2e27, #c04540, #ae5654, #986565)',
        textColor: '#FF6565',
        showWord: false,
        roleType: 'imposter',
        selectable: true,
        selectPlayer: true,
        canSelectSelf: true,
        revealSelectedPlayer: true,
        revealText: "A WITCH HAS CURSED SOMEONE",
        selectionListColor: 'rgba(200, 200, 200, 0.7)',
        selectionText: "SELECT SOMEONE TO CURSE",
        selectionRevealEffects: [
            {
                'text': '<player> was SILENCED',
                'chance': 1/3
            },
            {
                'text': '<player> must KEEP JUMPING',
                'chance': 1/3
            },
            {
                'text': '<player> is now a FURRY',
                'chance': 1/3
            },
        ]
    },
    pirate: {
        label: 'Pirate',
        class: 'pirate',
        tip: 'Choose 2 people to do Rock Paper Scissors, whoever loses dies.',
        grad: 'linear-gradient(135deg, #d80000, #ce2e27, #c04540, #ae5654, #986565)',
        textColor: '#FF6565',
        showWord: false,
        roleType: 'imposter',
        selectable: true,
        selectPlayer: true,
        selectionAmount: 2,
        canSelectSelf: true,
        selectionText: "CHOOSE 2 PLAYERS",
        revealSelectedPlayer: true,
        revealText: "2 PLAYERS HAVE BEEN SELECTED TO PLAY ROCK PAPER SCISSORS:",
        enableManualButton: true,
        buttonText: "SELECT ROCK PAPER SCISSORS<br>LOSER",
        manualActionFunction: ({ playerName, roleCfg, getStorageJson, getBaseRoleId, manualBtn }) => {
            // Create an overlay for the action
            const overlay = document.createElement('div');
            overlay.id = 'reveal-overlay';
            document.body.appendChild(overlay);

            const container = document.createElement('div');
            container.id = 'manual-action-container';
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.alignItems = 'center';
            document.body.appendChild(container);

            const closePopup = () => {
                container.style.opacity = '0';
                overlay.style.opacity = '0';
                setTimeout(() => {
                    container.remove();
                    overlay.remove();
                }, 500);
            };

            const prompt = document.createElement('h2');
            prompt.className = 'titan-one-regular';
            prompt.style.color = 'white';
            prompt.textContent = "SELECT THE LOSER";
            container.appendChild(prompt);

            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'manual-action-button-container';
            container.appendChild(buttonContainer);

            const baseRoleId = getBaseRoleId(roleCfg.class);
            const selectedTargets = getStorageJson(`${baseRoleId}SelectedTargets`, {})[playerName] || [];

            if (selectedTargets.length > 0) {
                selectedTargets.forEach(targetName => {
                    const targetBtn = document.createElement('div');
                    targetBtn.className = 'player-view-role titan-one-regular';
                    targetBtn.innerHTML = targetName;
                    targetBtn.style.background = roleCfg.grad;
                    targetBtn.onclick = () => {
                        const ninjaKills = getStorageJson('ninjaSelectedTargets', {});
                        ninjaKills[`kill_${targetName}`] = targetName;
                        localStorage.setItem('ninjaSelectedTargets', JSON.stringify(ninjaKills));
                        sessionStorage.setItem(`manualActionCompleted_${baseRoleId}`, 'true');
                        alert(`${targetName} has been killed!`);
                        manualBtn.remove();
                        closePopup();
                    };
                    buttonContainer.appendChild(targetBtn);
                });
            }

            requestAnimationFrame(() => {
                overlay.style.opacity = '1';
                container.style.opacity = '1';
            });
        },
    },
    thanos: {
        DISABLED: true,
        label: 'Thanos',
        class: 'thanos',
        tip: '<p style="font-size:100px">[NOT FINISHED YET]</p><br><br><br>You have the choice between the infinity stones.<br>They all have different effects and win conditions.',
        grad: 'linear-gradient(135deg, #f784ff, #da6de6, #be56cd, #a33fb4, #88279c)',
        textColor: '#F0C7F9',
        showWord: false,
        roleType: 'neutral',
        selectable: true,
        selectCustom: true,
        selectionListColor: '#5900ff',
        customOptions: [
            {
                display: 'SPACE',
                color: '#3D85C6',
                tip: 'Select 2 players and have them swapped during voting. (voting target 1 would put your vote as target 2).\nPredict who will be voted out win if the stone changes the eliminated player to your prediction.'
            },
            {
                display: 'MIND',
                color: '#FFFF00',
                tip: 'Select 2 players and figure out whether they are on the same team. If they are on the same team, win if one of them get voted out. If they are not on the same team then win with imposter conditions.'
            },
            {
                display: 'REALITY',
                color: '#E06666',
                tip: 'Select a player and any ability used by them will be redirected at themself win by them being voted out or if they kill themself 💀💀. If the player has no abilities then their vote will instead be deleted.'
            },
            {
                display: 'POWER',
                color: '#8E7CC3',
                tip: 'Half of the players in the game will be snapped therefore not being able to talk, gesture or do anything except vote. Thanos can be affected, win from survival. If Thanos gets voted out then imposter team and innocent team both win'
            },
            {
                display: 'TIME',
                color: '#93C47D',
                tip: 'Select a target and any abilities activated on them will be rewinded and a special text will appear on the screen to show what happened. Win if you successfully rewinded an event or/and target receives no votes.'
            },
            {
                display: 'SOUL',
                color: '#F6B26B',
                tip: 'Claim the soul of any player giving you a random role from their team, win with the conditions of that role.'
            }
        ]
    },
    weird: {
        DISABLED: true,
        label: '', // 'Weird',
        class: 'weird',
        tip: '', // 'Wanna do \"something crazy?\"',
        //grad: 'linear-gradient(135deg, rgba(255, 128, 255, 1) 0%, rgba(255, 255, 0, 1) 100%)',
        grad: 'linear-gradient(135deg, rgba(252, 0, 0, 1) 0%, rgba(255, 0, 0, 1) 100%)',
        textColor: '#FF0000',
        showWord: false, 
        roleType: 'imposter',
        selectable: false,
        immuneToAmnesia: true,
        immuneToModifiers: true,
        selectPlayer: true,
        canSelectSelf: true,
        revealSelectedPlayer: true,
        revealText: "???",
        selectionListColor: 'rgb(255, 0, 0)',
        selectionText: ' ', //'Do it.',
        animation: 'assets/videos/anim_weird.mp4',
        hideAllText: true
    },
};

export const ROLE_DATA = Object.fromEntries(
    Object.entries(ALL_ROLE_DATA).filter(([, value]) => !value.DISABLED)
);

// Default configuration for innocent players
export const INNOCENT_CONFIG = {
    label: 'Innocent',
    class: 'innocent',
    tip: 'Find the imposter!',
    grad: 'linear-gradient(135deg, #00FF00 0%, #008000 100%)',
    textColor: 'lime',
    showWord: true, 
    roleType: 'innocent'
};

// Helper Functions

// Helper to strip plural suffixes
export const getBaseRoleId = (configKey) => configKey.replace(/s$/, '').replace('guardian_angel', 'guardian_angel');

// Helper to create plural keys
export const getPluralKey = (role) => role.endsWith('s') ? role : (role === 'guardian_angel' ? 'guardian_angels' : `${role}s`);

// Helper to create base role ids
export const BASE_ROLE_IDS = Object.keys(ROLE_DATA)
    .filter(key => key !== 'innocents')
    .map(key => getBaseRoleId(key));
