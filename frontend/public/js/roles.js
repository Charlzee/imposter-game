export const ROLE_MODIFIERS_LOCAL = {
    amnesias: { 
        label: 'Amnesia', class: 'amnesia', 
        tip: 'You forgot your role :c\nTry to remember (guess) your role!', 
        grad: 'radial-gradient(circle, rgb(39, 180, 245) 0%, rgb(20, 90, 123) 100%)',
        textColor: 'rgb(147, 218, 250)',
        subTextColor: 'rgb(190, 235, 255)',
        showWord: false,
        overrideWordVisibility: true,
        chance: 0.05
    },
    mimes: { 
        label: 'Mime', class: 'mime', 
        tip: 'You can only act out actions on your turn!', 
        grad: 'radial-gradient(circle, rgb(0, 0, 0) 0%, rgb(255, 255, 255) 100%)',
        textColor: 'rgb(255, 255, 255)',
        subTextColor: 'rgb(230, 230, 230)',
        showWord: true,
        overrideWordVisibility: false,
        chance: 0.05
    },
    dumb: {
        label: 'Dumb', class: 'dumb', 
        tip: 'You can\'t defend yourself if you get accused!', 
        grad: 'radial-gradient(circle, rgb(78, 168, 9) 0%, rgb(36, 84, 0) 100%)',
        textColor: 'rgb(78, 168, 9)',
        subTextColor: 'rgb(134, 230, 60)',
        showWord: true,
        overrideWordVisibility: false,
        chance: 0.05
    },
    teacher: {
        label: 'English Teacher', class: 'teacher', 
        tip: 'You must criticize people\'s wording when they say their word!', 
        grad: 'radial-gradient(circle, rgb(9, 97, 168) 0%, rgb(5, 49, 84) 100%)',
        textColor: 'rgb(97, 82, 235)',
        subTextColor: 'rgb(160, 150, 255)',
        showWord: true,
        overrideWordVisibility: false,
        chance: 0.05
    },
    cheater: {
        label: 'Cheater', class: 'cheater', 
        tip: 'You, and ONLY YOU, WILL win. No one else. No matter what. (Only reveal at the end of the game)', 
        grad: 'radial-gradient(circle, red 0%, orange 20%, yellow 40%, green 60%, blue 80%, violet 100%)',
        textColor: 'rgb(255, 255, 0)',
        subTextColor: 'rgb(255, 255, 150)',
        showWord: true,
        overrideWordVisibility: false,
        chance: 0.001
    },
    happy: {
        label: 'Happy', class: 'happy', 
        tip: 'EVERYONE WINS!!! (Only reveal at the end of the game)', 
        grad: 'radial-gradient(circle, red 0%, orange 20%, yellow 40%, green 60%, blue 80%, violet 100%)',
        textColor: 'rgb(255, 255, 0)',
        subTextColor: 'rgb(255, 255, 150)',
        showWord: true,
        overrideWordVisibility: false,
        chance: 0.0001
    },
    lucky: {
        label: 'Lucky', class: 'lucky', 
        tip: 'Your vote counts as 2!', 
        grad: 'radial-gradient(circle, lightgreen 0%, green 100%)',
        textColor: 'rgb(94, 255, 0)',
        subTextColor: 'rgb(55, 255, 65)',
        showWord: true,
        overrideWordVisibility: false,
        chance: 0.035
    },
    unlucky: {
        label: 'Unlucky', class: 'unlucky', 
        tip: 'You lose your vote!', 
        grad: 'radial-gradient(circle, green 0%, darkgreen 100%)',
        textColor: 'rgb(94, 160, 0)',
        subTextColor: 'rgb(55, 200, 65)',
        showWord: true,
        overrideWordVisibility: false,
        chance: 0.035
    },
    terrorist: {
        label: 'Terrorist', class: 'terrorist', 
        tip: 'If you get voted out, EVERYONE loses (including you)!', 
        grad: 'radial-gradient(circle, rgb(235, 87, 42) 0%, rgb(118, 44, 21) 100%)',
        textColor: 'orangered',
        subTextColor: 'rgb(255, 55, 55)',
        showWord: true,
        overrideWordVisibility: false,
        chance: 0.035
    },
    scholar: {
        label: 'Scholar', class: 'scholar', 
        tip: 'You get to see the word and theme! (useless unless you are imposter)', 
        grad: 'radial-gradient(circle, rgb(93, 63, 211) 0%, rgb(21, 10, 60) 100%)',
        textColor: 'rgb(187, 153, 255)',
        subTextColor: 'rgb(220, 200, 255)',
        showWord: true,
        showTheme: true,
        overrideWordVisibility: true,
        chance: 0.025
    },
    npc: {
        label: 'NPC', class: 'npc', 
        tip: 'You can only use generic words (e.g. \'thing\', \'good\', \'bad\')', 
        grad: 'radial-gradient(circle, rgb(209, 137, 115) 0%, rgb(105, 69, 58) 100%)',
        textColor: 'peru',
        subTextColor: 'darkorange',
        showWord: true,
        overrideWordVisibility: false,
        chance: 0.05
    },
    monkey: {
        label: 'Monkey', class: 'monkey',
        tip: 'Your word/sentence must contain the letter/number: ',
        grad: 'radial-gradient(circle, rgb(77, 43, 33) 0%, rgb(59, 19, 7) 100%)',
        textColor: 'rgb(151,101,48)',
        subTextColor: 'brown',
        showWord: true,
        overrideWordVisibility: false,
        chance: 0.05
    },
    kirk: {
        label: 'Charlie Kirk', class: 'kirk',
        tip: 'You need to debate witn someone.',
        grad: 'radial-gradient(circle, orange 0%, orangered 100%)',
        textColor: 'rgb(255,101,48)',
        subTextColor: 'red',
        showWord: true,
        overrideWordVisibility: false,
        chance: 0.05
    },
    refugee: {
        label: 'Refugee', class: 'refugee',
        tip: 'You must speak different language the entire round.',
        grad: 'radial-gradient(circle, lightblue 0%, cyan 100%)',
        textColor: 'rgb(109, 255, 187)',
        subTextColor: 'aliceblue',
        showWord: true,
        overrideWordVisibility: false,
        chance: 0.05
    },
    narccisist: {
        label: 'Narccisist', class: 'narccisist',
        tip: 'You must mention yourself or your own skills at least three times while describing the word.',
        grad: 'radial-gradient(circle, #ff0000, #ff3a00, #ff5400, #ff6800, #ff7a00)',
        textColor: 'rgb(204,0,0)',
        subTextColor: 'orange',
        showWord: true,
        overrideWordVisibility: false,
        chance: 0.04
    },
};

export const ROLE_DATA_LOCAL = {
    imposters: {
        label: 'Imposter',
        class: 'imposter',
        tip: 'Dont get caught!',
        grad: 'radial-gradient(circle, rgb(255, 0, 0) 0%, rgb(128, 0, 0) 100%)',
        textColor: 'red',
        showWord: false
    },
    jesters: {
        label: 'Jester',
        class: 'jester',
        tip: 'Try to get voted out!',
        grad: 'radial-gradient(circle, rgb(255, 0, 255) 0%, rgb(128, 0, 128) 100%)',
        textColor: 'rgb(255, 0, 200)',
        showWord: true
    },
    hitmans: {
        label: 'Hitman',
        class: 'hitman',
        tip: 'Try to vote out your target!',
        grad: 'radial-gradient(circle, rgb(84, 84, 255) 0%, rgb(42, 42, 128) 100%)',
        textColor: 'cornflowerblue',
        showWord: true,
        hasTarget: true
    },
    shapeshifters: {
        //label: 'Shapeshifter',
        label: 'Trans',
        class: 'shapeshifter',
        //tip: 'CHOOSE YOUR ROLE.',
        tip: 'Happy pride month :3',
        //grad: 'radial-gradient(circle, rgb(255, 165, 0) 0%, rgb(128, 83, 0) 100%)',
        grad: 'linear-gradient(to bottom, #5BCEFA, #F5A9B8, #FFFFFF, #F5A9B8, #5BCEFA)',
        textColor: 'rgb(255, 165, 0)',
        showWord: false
    },
    guardian_angels: {
        label: 'Guardian Angel',
        class: 'guardian_angel',
        tip: 'Try to protect your target!',
        grad: 'radial-gradient(circle, rgb(199, 255, 249) 0%, rgb(100, 128, 125) 100%)',
        textColor: 'rgb(199, 255, 249)',
        showWord: true,
        hasTarget: true
    },
    alphas: {
        label: 'Alpha',
        class: 'alpha',
        tip: 'If you get even 1 vote, you lose!',
        grad: 'radial-gradient(circle, rgb(200, 200, 200) 0%, rgb(100, 100, 100) 100%)',
        textColor: 'rgb(140, 140, 140)',
        showWord: true
    },
    inspectors: {
        label: 'Inspector Goole',
        class: 'inspector',
        tip: 'Use your clue to find the imposter and aura farm',
        grad: 'radial-gradient(circle, rgb(235, 183, 42) 0%, rgb(118, 92, 21) 100%)',
        textColor: 'goldenrod',
        showWord: true,
        hasClue: true
    },
    annoying: {
        label: 'Annoying',
        class: 'annoying',
        tip: 'You need to repeat everything your target says right after they do!',
        grad: 'radial-gradient(circle, rgb(223, 255, 0) 0%, rgb(152, 175, 0) 100%)',
        textColor: 'rgb(235, 255, 104)',
        showWord: true,
        hasTarget: true
    }
};

export const ROLE_MODIFIERS_ONLINE = {
    amnesias: { 
        label: 'Amnesia', class: 'amnesia', 
        tip: 'You forgot your role :c\nTry to remember (guess) your role!', 
        grad: 'radial-gradient(circle, rgb(39, 180, 245) 0%, rgb(20, 90, 123) 100%)',
        textColor: 'rgb(147, 218, 250)',
        subTextColor: 'rgb(190, 235, 255)',
        showWord: false,
        overrideWordVisibility: true,
        chance: 0.05
    },
    dumb: {
        label: 'Dumb', class: 'dumb', 
        tip: 'You can\'t defend yourself if you get accused!', 
        grad: 'radial-gradient(circle, rgb(78, 168, 9) 0%, rgb(36, 84, 0) 100%)',
        textColor: 'rgb(78, 168, 9)',
        subTextColor: 'rgb(134, 230, 60)',
        showWord: true,
        overrideWordVisibility: false,
        chance: 0.05
    },
    teacher: {
        label: 'English Teacher', class: 'teacher', 
        tip: 'You must criticize people\'s wording when they say their word!', 
        grad: 'radial-gradient(circle, rgb(9, 97, 168) 0%, rgb(5, 49, 84) 100%)',
        textColor: 'rgb(97, 82, 235)',
        subTextColor: 'rgb(160, 150, 255)',
        showWord: true,
        overrideWordVisibility: false,
        chance: 0.05
    },
    lucky: {
        label: 'Lucky', class: 'lucky', 
        tip: 'Your vote counts as 2!', 
        grad: 'radial-gradient(circle, lightgreen 0%, green 100%)',
        textColor: 'rgb(94, 255, 0)',
        subTextColor: 'rgb(55, 255, 65)',
        showWord: true,
        overrideWordVisibility: false,
        chance: 0.035
    },
    unlucky: {
        label: 'Unlucky', class: 'unlucky', 
        tip: 'You lose your vote!', 
        grad: 'radial-gradient(circle, green 0%, darkgreen 100%)',
        textColor: 'rgb(94, 160, 0)',
        subTextColor: 'rgb(55, 200, 65)',
        showWord: true,
        overrideWordVisibility: false,
        chance: 0.035
    },
    terrorist: {
        label: 'Terrorist', class: 'terrorist', 
        tip: 'If you get voted out, EVERYONE loses (including you)!', 
        grad: 'radial-gradient(circle, rgb(235, 87, 42) 0%, rgb(118, 44, 21) 100%)',
        textColor: 'orangered',
        subTextColor: 'rgb(255, 55, 55)',
        showWord: true,
        overrideWordVisibility: false,
        chance: 0.035
    },
    scholar: {
        label: 'Scholar', class: 'scholar', 
        tip: 'You get to see the word and theme! (useless unless you are imposter)', 
        grad: 'radial-gradient(circle, rgb(93, 63, 211) 0%, rgb(21, 10, 60) 100%)',
        textColor: 'rgb(187, 153, 255)',
        subTextColor: 'rgb(220, 200, 255)',
        showWord: true,
        showTheme: true,
        overrideWordVisibility: true,
        chance: 0.025
    },
    npc: {
        label: 'NPC', class: 'npc', 
        tip: 'You can only use generic words (e.g. \'thing\', \'good\', \'bad\')', 
        grad: 'radial-gradient(circle, rgb(209, 137, 115) 0%, rgb(105, 69, 58) 100%)',
        textColor: 'peru',
        subTextColor: 'darkorange',
        showWord: true,
        overrideWordVisibility: false,
        chance: 0.05
    },
    monkey: {
        label: 'Monkey', class: 'monkey',
        tip: 'Your word/sentence must contain the letter/number: ',
        grad: 'radial-gradient(circle, rgb(77, 43, 33) 0%, rgb(59, 19, 7) 100%)',
        textColor: 'rgb(151,101,48)',
        subTextColor: 'brown',
        showWord: true,
        overrideWordVisibility: false,
        chance: 0.05
    },
    kirk: {
        label: 'Charlie Kirk', class: 'kirk',
        tip: 'You need to debate witn someone.',
        grad: 'radial-gradient(circle, orange 0%, orangered 100%)',
        textColor: 'rgb(255,101,48)',
        subTextColor: 'darkred',
        showWord: true,
        overrideWordVisibility: false,
        chance: 0.05
    },
    refugee: {
        label: 'Refugee', class: 'refugee',
        tip: 'You must speak different language the entire round.',
        grad: 'radial-gradient(circle, lightblue 0%, cyan 100%)',
        textColor: 'rgb(109, 255, 187)',
        subTextColor: 'aliceblue',
        showWord: true,
        overrideWordVisibility: false,
        chance: 0.05
    }
};

export const ROLE_DATA_ONLINE = {
    imposters: {
        label: 'Imposter',
        class: 'imposter',
        tip: 'Dont get caught!',
        grad: 'radial-gradient(circle, rgb(255, 0, 0) 0%, rgb(128, 0, 0) 100%)',
        textColor: 'red',
        showWord: false
    },
    jesters: {
        label: 'Jester',
        class: 'jester',
        tip: 'Try to get voted out!',
        grad: 'radial-gradient(circle, rgb(255, 0, 255) 0%, rgb(128, 0, 128) 100%)',
        textColor: 'rgb(255, 0, 200)',
        showWord: true
    },
    hitmans: {
        label: 'Hitman',
        class: 'hitman',
        tip: 'Try to vote out your target!',
        grad: 'radial-gradient(circle, rgb(84, 84, 255) 0%, rgb(42, 42, 128) 100%)',
        textColor: 'cornflowerblue',
        showWord: true,
        hasTarget: true
    },
    shapeshifters: {
        //label: 'Shapeshifter',
        label: 'Trans',
        class: 'shapeshifter',
        //tip: 'CHOOSE YOUR ROLE.',
        tip: 'Happy pride month :3',
        //grad: 'radial-gradient(circle, rgb(255, 165, 0) 0%, rgb(128, 83, 0) 100%)',
        grad: 'linear-gradient(to bottom, #5BCEFA, #F5A9B8, #FFFFFF, #F5A9B8, #5BCEFA)',
        textColor: 'rgb(255, 165, 0)',
        showWord: false
    },
    guardian_angels: {
        label: 'Guardian Angel',
        class: 'guardian_angel',
        tip: 'Try to protect your target!',
        grad: 'radial-gradient(circle, rgb(199, 255, 249) 0%, rgb(100, 128, 125) 100%)',
        textColor: 'rgb(199, 255, 249)',
        showWord: true,
        hasTarget: true
    },
    alphas: {
        label: 'Alpha',
        class: 'alpha',
        tip: 'If you get even 1 vote, you lose!',
        grad: 'radial-gradient(circle, rgb(200, 200, 200) 0%, rgb(100, 100, 100) 100%)',
        textColor: 'rgb(140, 140, 140)',
        showWord: true
    },
    inspectors: {
        label: 'Inspector Goole',
        class: 'inspector',
        tip: 'Use your clue to find the imposter and aura farm',
        grad: 'radial-gradient(circle, rgb(235, 183, 42) 0%, rgb(118, 92, 21) 100%)',
        textColor: 'goldenrod',
        showWord: true,
        hasClue: true
    }
};

export const INNOCENT_CONFIG = {
    label: 'Innocent',
    class: 'innocent',
    tip: 'Find the imposter!',
    grad: 'radial-gradient(circle, rgb(0, 255, 0) 0%, rgb(0, 128, 0) 100%)',
    textColor: 'lime',
    showWord: true
};

export const BASE_ROLE_IDS = ['imposter', 'jester', 'hitman', 'shapeshifter', 'guardian_angel', 'alpha', 'inspector', 'annoying'];

export const getBaseRoleId = (configKey) => configKey.replace(/s$/, '').replace('guardian_angel', 'guardian_angel');
export const getPluralKey = (role) => role.endsWith('s') ? role : (role === 'guardian_angel' ? 'guardian_angels' : `${role}s`);
