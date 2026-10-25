/**
 * CONTENT CONFIG
 * -------------------------------------------------
 * Every piece of user-facing text lives here — edit this file to
 * personalise the experience. All values below are generic placeholders.
 * Artwork file names are mapped separately in character-assets.js.
 */

export const APP_CONFIG = {
  terminalTitle: "INTERACTIVE BIRTHDAY TERMINAL v1.0",
  promptPrefix: "guest@terminal:~$",
  // Name shown in the top bar greeting and set by the first stage.
  userName: "Guest",
  // Name of the second character that appears during the story.
  companionName: "Friend",
  welcomeTitle: "celebration.exe",
  creditLine: "a customisable birthday terminal",
};

// Visual-only access gate for the photo albums and the letter — NOT real
// security. The server-side gate in api/unlock.js reads ACCESS_CODE from the
// environment; keep the two in sync if you use both.
export const ACCESS_CODE = "1234";

export const ACCESS_PROMPT = "enter the access code";

// `dir` is the folder name under public/ (and private/ for the API route).
export const DESKTOP_ITEMS = [
  { id: "about", type: "file", label: "about.txt" },
  { id: "album-1", type: "folder", label: "album 1", dir: "album-1", protected: true },
  { id: "album-2", type: "folder", label: "album 2", dir: "album-2", protected: true },
  { id: "album-3", type: "folder", label: "album 3", dir: "album-3", protected: true },
  { id: "album-4", type: "folder", label: "album 4", dir: "album-4", protected: true },
];

export const PHOTO_FOLDERS = DESKTOP_ITEMS.filter((item) => item.dir).map((item) => item.dir);

export const EMPTY_FOLDER_TEXT = "(no photos here yet)";

export const ABOUT_TEXT = `hello!

happy birthday!!

this is a small interactive desktop made as a birthday surprise. it works like a terminal: answer each question to unlock the next scene.

all of the text you see here (questions, answers, this note and the final letter) lives in content-config.js, so you can swap in your own words whenever you like.

hope you enjoy it. here's to a great year ahead!

- your friend`;

// The letter shown at the end of the story.
export const LETTER = {
  greeting: "Dear Friend,",
  paragraphs: [
    "Happy birthday! This is an example letter — replace it with your own message in content-config.js.",
    "Today is a good day to look back at the moments that made you smile and to look forward to everything still ahead.",
    "Thank you for being such a great part of so many good memories. May this year bring you health, laughter and plenty of cake.",
  ],
  closing: "With best wishes,",
  signature: "Your Friend",
};

// ---------------------------------------------------------------
// STAGE DATA — pure data. Edit prompts/answers/effects here only.
// ---------------------------------------------------------------
export const STAGES = [
  {
    id: "identity",
    type: "text-input",
    prompt: "WHO ARE YOU?",
    acceptedAnswers: [APP_CONFIG.userName.toLowerCase()],
    defaultAutoplayAnswer: APP_CONFIG.userName.toLowerCase(),
    successResponse: "ACCESS GRANTED.",
    effects: [{ type: "SET_LABEL", text: APP_CONFIG.userName.toUpperCase() }],
  },
  {
    id: "occasion",
    type: "text-input",
    prompt: "WHAT KIND OF DAY IS TODAY?",
    acceptedAnswers: ["birthday", "my birthday"],
    defaultAutoplayAnswer: "birthday",
    successResponse: "ACCESS GRANTED.",
    effects: [
      { type: "ADD_ACCESSORY", accessory: "birthday-hat" },
      { type: "SHOW_OBJECT", object: "confetti-burst", animation: "pop" },
    ],
  },
  {
    id: "device",
    type: "text-input",
    prompt: "WHICH DEVICE DO YOU USE EVERY DAY?",
    acceptedAnswers: ["laptop", "computer"],
    defaultAutoplayAnswer: "laptop",
    successResponse: "CONFIRMED.",
    effects: [{ type: "ADD_ACCESSORY", accessory: "laptop" }],
  },
  {
    id: "childhood-toy",
    type: "text-input",
    prompt: "WHAT TOY DID YOU LOVE AS A KID?",
    acceptedAnswers: ["car", "toy car", "car toys"],
    defaultAutoplayAnswer: "toy car",
    successResponse: "MEMORY LOADED.",
    effects: [{ type: "SHOW_OBJECT", object: "toy-car", animation: "slide-across" }],
  },
  {
    id: "shoes",
    type: "choice",
    prompt: "CHOOSE YOUR FAVOURITE SHOES:",
    successResponse: "LOCKED IN.",
    options: [
      { id: "shoes-a", label: "SNEAKERS A", effects: [{ type: "SET_SHOES", shoes: "shoes-a" }] },
      { id: "shoes-b", label: "SNEAKERS B", effects: [{ type: "SET_SHOES", shoes: "shoes-b" }] },
    ],
  },
  {
    id: "outfit",
    type: "choice",
    prompt: "PICK AN OUTFIT:",
    successResponse: "LOOKING GOOD.",
    options: [
      { id: "default", label: "DEFAULT", effects: [{ type: "SET_OUTFIT", outfit: "default" }] },
      { id: "casual", label: "CASUAL", effects: [{ type: "SET_OUTFIT", outfit: "casual" }] },
      { id: "stylish", label: "STYLISH", effects: [{ type: "SET_OUTFIT", outfit: "stylish" }] },
    ],
  },
  {
    id: "music",
    type: "text-input",
    prompt: "WHICH INSTRUMENT WOULD YOU LIKE TO PLAY?",
    acceptedAnswers: ["keyboard", "piano", "mini keyboard"],
    defaultAutoplayAnswer: "keyboard",
    successResponse: "INSTRUMENT DETECTED. PRESS THE KEYS TO PLAY: A S D F G H J K",
    effects: [{ type: "SHOW_OBJECT", object: "keyboard", animation: "appear" }],
  },
  {
    id: "fitness",
    type: "text-input",
    prompt: "WHAT DO YOU DO TO STAY ACTIVE?",
    acceptedAnswers: ["exercise", "workout", "gym"],
    defaultAutoplayAnswer: "exercise",
    successResponse: "STRENGTH CONFIRMED.",
    effects: [{ type: "SHOW_OBJECT", object: "dumbbell", animation: "appear" }],
  },
  {
    id: "celebrate-with",
    type: "text-input",
    prompt: "WHO WOULD YOU LIKE TO CELEBRATE WITH?",
    acceptedAnswers: [APP_CONFIG.companionName.toLowerCase(), "friend", "friends"],
    defaultAutoplayAnswer: APP_CONFIG.companionName.toLowerCase(),
    successResponse: "GUEST ARRIVED.",
    effects: [{ type: "SHOW_COMPANION" }],
  },
  {
    id: "enjoying",
    type: "choice",
    prompt: "ARE YOU ENJOYING THE CELEBRATION?",
    successResponse: "<3",
    options: [
      { id: "yes", label: "YES", effects: [{ type: "TRIGGER_LOVE_SEQUENCE" }] },
      {
        id: "no",
        label: "NO",
        effects: [],
        retryPrompt: "hmm... try again.",
        rejectsStage: true,
      },
    ],
  },
  {
    id: "future-place",
    type: "choice",
    prompt: "WHICH PLACE WOULD YOU LIKE TO VISIT?",
    successResponse: "SCENERY LOADED.",
    options: [
      { id: "scene-1", label: "SWITZERLAND", effects: [{ type: "SET_BACKGROUND", background: "scene-1" }] },
      { id: "scene-2", label: "SVALBARD", effects: [{ type: "SET_BACKGROUND", background: "scene-2" }] },
      { id: "scene-3", label: "MOUNTAINS", effects: [{ type: "SET_BACKGROUND", background: "scene-3" }] },
    ],
  },
  {
    id: "cake-ready",
    type: "text-input",
    prompt: "ARE YOU READY FOR YOUR BIRTHDAY CAKE?",
    acceptedAnswers: ["yes"],
    defaultAutoplayAnswer: "yes",
    successResponse: "HAPPY BIRTHDAY! > PLEASE BLOW ON YOUR BIRTHDAY CAKE CANDLES.",
    effects: [{ type: "TRIGGER_CAKE" }],
  },
  {
    id: "gift-reveal",
    type: "choice",
    prompt: "I HAVE SOMETHING FOR YOU. DO YOU WANT TO SEE?",
    successResponse: "OK...",
    options: [
      { id: "yes", label: "YES", effects: [{ type: "TRIGGER_FINALE" }] },
      {
        id: "no",
        label: "NO",
        effects: [],
        retryPrompt: "hmm... try again.",
        rejectsStage: true,
      },
    ],
  },
];
