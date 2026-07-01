import { getRandomPlayer, getRandomPlayerIndex } from "./global.js";

// Configuration for all role modifiers
export const ROLE_MODIFIERS = {
    amnesias: { 
        label: 'Amnesia', class: 'amnesia', 
        tip: 'You forgot your role :c\nTry to remember (guess) your role!', 
        grad: 'linear-gradient(135deg, #27B4F5 0%, #145A7B 100%)',
        textColor: '#B0E2FF',
        subTextColor: '#E0F5FF',
        image: 'assets/amnesia-bg.png',
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
        showWord: true,
        overrideWordVisibility: false,
        chance: 0.05
    },
    dumb: {
        label: 'Dumb', class: 'dumb', 
        tip: 'You can\'t defend yourself if you get accused!', 
        grad: 'linear-gradient(135deg, #4EA809 0%, #245400 100%)',
        textColor: '#D4FFB2',
        subTextColor: '#86E63C',
        showWord: true,
        overrideWordVisibility: false, 
        roleType: 'innocent',
        chance: 0.05
    },
    teacher: {
        label: 'English Teacher', class: 'teacher', 
        tip: 'You must criticize people\'s wording when they say their word!', 
        grad: 'linear-gradient(135deg, #0961A8 0%, #053154 100%)',
        textColor: '#C8D2FF',
        subTextColor: '#A096FF',
        showWord: true,
        overrideWordVisibility: false, 
        roleType: 'innocent',
        chance: 0.05
    },
    cheater: {
        label: 'Cheater', class: 'cheater', 
        tip: 'You, and ONLY YOU, WILL win. No one else. No matter what. (Only reveal at the end of the game)', 
        grad: 'linear-gradient(135deg, red 0%, orange 20%, yellow 40%, green 60%, blue 80%, violet 100%)',
        textColor: '#FFFF00',
        subTextColor: '#FFFF96',
        showWord: true,
        overrideWordVisibility: false, 
        roleType: 'neutral',
        chance: 0.001
    },
    happy: {
        label: 'Happy', class: 'happy', 
        tip: 'EVERYONE WINS!!! (Only reveal at the end of the game)', 
        grad: 'linear-gradient(135deg, red 0%, orange 20%, yellow 40%, green 60%, blue 80%, violet 100%)',
        textColor: '#FFFF00',
        subTextColor: '#FFFF96',
        showWord: true,
        overrideWordVisibility: false, 
        roleType: 'neutral',
        chance: 0.0001
    },
    lucky: {
        label: 'Lucky', class: 'lucky', 
        tip: 'Your vote counts as 2!', 
        grad: 'linear-gradient(135deg, lightgreen 0%, green 100%)',
        textColor: '#AAFF00',
        subTextColor: '#37FF41',
        showWord: true,
        overrideWordVisibility: false, 
        roleType: 'innocent',
        chance: 0.035
    },
    unlucky: {
        label: 'Unlucky', class: 'unlucky', 
        tip: 'You lose your vote!', 
        grad: 'linear-gradient(135deg, green 0%, darkgreen 100%)',
        textColor: '#5EA000',
        subTextColor: '#37C841',
        showWord: true,
        overrideWordVisibility: false, 
        roleType: 'innocent',
        chance: 0.035
    },
    terrorist: {
        label: 'Terrorist', class: 'terrorist', 
        tip: 'If you get voted out, EVERYONE loses (including you)!', 
        grad: 'linear-gradient(135deg, #EB572A 0%, #762C15 100%)',
        textColor: '#FFD7CC',
        subTextColor: '#FF3737',
        showWord: true,
        overrideWordVisibility: false, 
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
        showWord: true,
        overrideWordVisibility: false, 
        roleType: 'innocent',
        chance: 0.05
    },
    monkey: {
        label: 'Monkey', class: 'monkey',
        tip: 'Your word/sentence MUST contain the letter/number: ',
        grad: 'linear-gradient(135deg, #4D2B21 0%, #3B1307 100%)',
        textColor: '#FFDBAC',
        subTextColor: '#D2B48C',
        showWord: true,
        overrideWordVisibility: false, 
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
        showWord: true,
        overrideWordVisibility: false, 
        roleType: 'innocent',
        chance: 0.05
    },
    refugee: {
        label: 'Refugee', class: 'refugee',
        tip: 'You must speak different language the entire round.',
        grad: 'linear-gradient(135deg, lightblue 0%, cyan 100%)',
        textColor: '#6DFBBB',
        subTextColor: 'aliceblue',
        showWord: true,
        overrideWordVisibility: false, 
        roleType: 'innocent',
        chance: 0.05
    },
    narccisist: {
        label: 'Narccisist', class: 'narccisist',
        tip: 'You must mention yourself or your own skills at least three times while describing the word.',
        grad: 'linear-gradient(135deg, #ff0000, #ff3a00, #ff5400, #ff6800, #ff7a00)',
        textColor: 'white',
        subTextColor: 'orange',
        showWord: true,
        overrideWordVisibility: false, 
        roleType: 'innocent',
        chance: 0.04
    },
    furry: {
        label: 'Furry', class: 'furry',
        tip: 'You must meow, bark, etc, at the end of each sentence',
        grad: 'linear-gradient(135deg, #ff2fc0, #f516cd, #e600dd, #d200ed, #b700ff)',
        textColor: '#FFE0F0',
        subTextColor: 'white',
        showWord: true,
        overrideWordVisibility: false, 
        roleType: 'innocent',
        chance: 0.05
    },
    big: {
        label: 'Big Idea', class: 'big',
        tip: 'You must say "BIG IDEA" in a bold voice before each sentence.',
        grad: 'linear-gradient(135deg, #d2ff2f, #c5ff25, #b7ff1a, #a7ff0e, #96ff00)',
        textColor: '#00C828',
        subTextColor: 'white',
        showWord: true,
        overrideWordVisibility: false, 
        roleType: 'innocent',
        chance: 0.05
    },
    annoying: {
        label: 'Annoying',
        class: 'annoying',
        tip: 'You need to repeat everything your target says right after they do!',
        grad: 'linear-gradient(135deg, #DFFF00 0%, #98AF00 100%)',
        textColor: '#9AB62B',
        showWord: true,
        overrideWordVisibility: false, 
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
        showWord: true,
        overrideWordVisibility: false, 
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
        showWord: true, 
        roleType: 'innocent',
        overrideWordVisibility: false,
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
        showWord: true, 
        roleType: 'innocent',
        overrideWordVisibility: false,
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
        showWord: true,
        overrideWordVisibility: false, 
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
        showWord: true,
        roleType: 'innocent',
        hasTarget: true,
        overrideWordVisibility: false,
        chance: 0.05
    },
    glazer: {
        label: 'Glazer',
        class: 'glazer',
        tip: 'Glaze this person, exaggerating their words to be really good: ',
        grad: 'linear-gradient(135deg, #fff561, #ffeb60, #ffe261, #ffd962, #ffd063)',
        textColor: '#FFFFFF',
        subTextColor: '#ffec46',
        showWord: true,
        roleType: 'innocent',
        hasTarget: true,
        overrideWordVisibility: false,
        chance: 0.05
    },
    smash: {
        label: 'Smash or Pass',
        class: 'smash',
        tip: 'You need to say Smash or Pass before everything you say',
        grad: 'linear-gradient(135deg, #0048ff, #0094ff, #00c2ff, #00e5bb, #00ff4e)',
        textColor: '#FFFFFF',
        subTextColor: '#00B1FF',
        showWord: true,
        overrideWordVisibility: false, 
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
        showWord: true,
        getsRandomOtherWord: true,
        overrideWordVisibility: false, 
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
}

// Main game role definitions
export const ROLE_DATA = {
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
        selectable: true
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
        selectable: true
    },
    alphas: {
        label: 'Alpha',
        class: 'alpha',
        tip: 'If you get even 1 vote, you lose!',
        grad: 'linear-gradient(135deg, #C8C8C8 0%, #646464 100%)',
        textColor: 'white',
        showWord: true, 
        roleType: 'innocent',
        selectable: true
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
        roleType: 'innocent',
        selectable: true
    },
    divine_art: {
        label: 'Divine Arts',
        class: 'divine_art',
        tip: 'Any votes cast against you dont count.',
        grad: 'linear-gradient(135deg, #ddd800, #e3e236, #e9ec53, #f0f56c, #f7ff83)',
        textColor: '#FFFDAA',
        showWord: true,
        roleType: 'innocent',
        selectable: true
    },
    gold_roger: {
        label: 'Gol D. Roger',
        class: 'gold_roger',
        tip: 'Choose someone to give your vote to.\nYou will die but they will get your vote.',
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
        alsoKillsSelf: true
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
                'text': 'Epstein has revealed that <player> has a small weiner, embarrassing 😩😩 they must now sit down in shame.',
                'chance': 0.1
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
};

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
