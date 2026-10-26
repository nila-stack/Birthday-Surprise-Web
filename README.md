# Birthday Terminal

An interactive birthday surprise disguised as a retro desktop. The birthday person navigates a pixel-art terminal, answering quirky questions to unlock little surprises that gradually bring an animated scene to life - from birthday hats and toy cars to a playable mini keyboard, a companion character, and a cake with candles to blow out. The experience ends with a personalised envelope and a heartfelt letter.

Perfect for coders, tech enthusiasts and anyone who loves a little nostalgia. Use it as a customisable template: swap the characters, artwork, questions, answers, letter and photos to create a one-of-a-kind birthday surprise for someone special.
Use it as a **template**: swap the characters, artwork, questions, answers, letter and photos to make a personal surprise for a friend, partner or family member.

> **Status:** the text and sample content are generic placeholders. The bundled artwork is sample art — replace it with your own (see [Replacing the artwork](#replacing-the-artwork)).

---

## Contents

- [Quick start](#quick-start)
- [What you need to install](#what-you-need-to-install)
- [Project structure](#project-structure)
- [How it works](#how-it-works)
- [Customising the experience](#customising-the-experience)
  - [Names, terminal text and credit line](#names-terminal-text-and-credit-line)
  - [Questions, answers and effects](#questions-answers-and-effects)
  - [The about note and the final letter](#the-about-note-and-the-final-letter)
  - [Photo albums and the access code](#photo-albums-and-the-access-code)
  - [Replacing the artwork](#replacing-the-artwork)
  - [Desktop theme colours](#desktop-theme-colours)
- [Controls](#controls)
- [Build and deploy](#build-and-deploy)
- [Known limitations and security notes](#known-limitations-and-security-notes)
- [Before you publish your own copy](#before-you-publish-your-own-copy)
- [License](#license)

---

## Quick start

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173) and answer the questions in the terminal. Tip: switch on **Autoplay** (top-right) and press **Enter** repeatedly to click through the whole story with each stage's default answer — handy while customising.

## What you need to install

| Tool | Version | Why |
| --- | --- | --- |
| [Node.js](https://nodejs.org/) | 18 or newer (the project was developed on 24) | Runs Vite and installs dependencies |
| npm | Comes with Node.js | Installs packages and runs the scripts |
| A modern browser | Any current Chrome, Firefox, Safari or Edge | Runs the app (uses the Web Audio API for the keyboard sounds) |
| Git *(optional)* | Any | Only needed to publish or share your copy |
| [Vercel](https://vercel.com/) account *(optional)* | — | Only if you want to run the `api/` photo-gate handlers online |

Libraries are installed by `npm install`: React 18, React DOM 18, Vite 5 and `@vitejs/plugin-react`. Fonts (Press Start 2P and VT323) are loaded from Google Fonts at runtime, so an internet connection is needed to see them.

Scripts:

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the Vite dev server with hot reload |
| `npm run build` | Creates a production build in `dist/` |
| `npm run preview` | Serves the production build locally |

## Project structure

```
.
├── index.html              # HTML shell; loads preview-entry.jsx
├── preview-entry.jsx       # Mounts <TerminalTest /> into #root
├── content-config.js       # ★ ALL editable text: names, questions, answers, letter, about, access code
├── terminal-test.jsx       # Main app: terminal UI, story engine (reducer), desktop icons, folders, help
├── character-stage.jsx     # Scene renderer: stacked PNG layers, click interactions, keyboard sounds, envelope/letter
├── character-assets.js     # ★ Maps names -> image paths, canvas size, click-hit regions, scene labels
├── desktop-shell.jsx       # Older standalone desktop mock-up (not used by the current entry point)
├── vite.config.js          # Vite + React config and the photo-manifest plugin
├── api/
│   ├── unlock.js           # Checks the access code and issues a signed cookie
│   └── photo.js            # Serves album photos from private/<album>/ when the cookie is valid
├── public/                 # Static artwork (served as-is)
│   ├── character/hero/        # head, outfits, shoes, accessories
│   ├── character/companion/   # second character
│   ├── background/            # scene-1 … scene-3
│   ├── objects/               # toy car, keyboard, dumbbell, confetti, cake, heart, balloon
│   └── envelope/              # closed / open envelope
└── package.json
```

The two files marked ★ are the ones you will edit most.

## How it works

1. **Terminal (left):** shows the current question. Text stages accept typed answers; choice stages show buttons.
2. **Scene (right):** every image is a transparent PNG exported from the **same 4167 × 3334 canvas**, stacked on top of each other at full size. Because they share one canvas, nothing needs manual positioning.
3. **Effects:** each correct answer carries a list of *effects* (e.g. "add the hat", "show the keyboard"). A reducer applies them and the scene re-renders.
4. **Click interactions** (visual only, never affect story progress or Undo): click the outfit to cycle outfits, click the shoes to cycle shoes, click the hat or laptop to hide them, click the cake to blow out the candles, use the arrow to change background, click the keyboard keys (or press `A S D F G H J K`) to play notes.
5. **Finale:** after the last stage an envelope appears; clicking it opens the letter.
6. **Desktop:** `about.txt` and four album folders sit on the left. Albums and the letter are behind an access-code prompt.

## Customising the experience

### Names, terminal text and credit line

Edit `APP_CONFIG` in [`content-config.js`](./content-config.js):

```js
export const APP_CONFIG = {
  terminalTitle: "INTERACTIVE BIRTHDAY TERMINAL v1.0", // first boot line
  promptPrefix: "guest@terminal:~$",                    // terminal prompt
  userName: "Guest",        // top-bar greeting + first-stage answer
  companionName: "Friend",  // answer to the "celebrate with" stage
  welcomeTitle: "celebration.exe",
  creditLine: "a customisable birthday terminal",       // bottom-right credit
};
```

`userName` is also what the first question ("WHO ARE YOU?") expects, so set it to the recipient's name (e.g. `"Sam"`) and they type `sam` (matching is case-insensitive).

### Questions, answers and effects

Stages live in the `STAGES` array in [`content-config.js`](./content-config.js). They run top to bottom. Add, remove, reorder or edit them freely.

**Text stage** — the user types an answer:

```js
{
  id: "device",                       // unique id
  type: "text-input",
  prompt: "WHICH DEVICE DO YOU USE EVERY DAY?",
  acceptedAnswers: ["laptop", "computer"],  // any of these (case-insensitive)
  defaultAutoplayAnswer: "laptop",    // used by Autoplay
  successResponse: "CONFIRMED.",      // printed after a correct answer
  effects: [{ type: "ADD_ACCESSORY", accessory: "laptop" }],
}
```

**Choice stage** — the user clicks a button:

```js
{
  id: "outfit",
  type: "choice",
  prompt: "PICK AN OUTFIT:",
  successResponse: "LOOKING GOOD.",
  options: [
    { id: "default", label: "DEFAULT", effects: [{ type: "SET_OUTFIT", outfit: "default" }] },
    // An option that always re-asks the question (use for "trick" answers):
    { id: "no", label: "NO", effects: [], retryPrompt: "hmm... try again.", rejectsStage: true },
  ],
}
```

**Available effects**

| Effect | Fields | Result |
| --- | --- | --- |
| `SET_LABEL` | `text` | Records a label in the effects log |
| `ADD_ACCESSORY` | `accessory`: `"birthday-hat"` or `"laptop"` | Shows the accessory |
| `REMOVE_ACCESSORY` | `accessory` | Removes it |
| `SET_OUTFIT` | `outfit`: `default`, `casual`, `stylish` | Changes the outfit |
| `SET_SHOES` | `shoes`: `shoes-a`, `shoes-b` | Changes the shoes |
| `SET_BACKGROUND` | `background`: `scene-1`, `scene-2`, `scene-3` | Shows a background (also enables the arrow to cycle) |
| `SHOW_OBJECT` | `object`: `toy-car`, `keyboard`, `confetti-burst`, `dumbbell`; `animation`: `appear`, `pop`, `slide-across` | Shows a scene object |
| `SHOW_COMPANION` | — | Companion character walks in |
| `TRIGGER_LOVE_SEQUENCE` | — | Companion moves closer, heart bubble appears |
| `TRIGGER_CAKE` | — | Lit cake appears (click it to blow out the candles) |
| `TRIGGER_FINALE` | — | Envelope appears; opens the letter |

Notes:

- `laptop`, `dumbbell` and `keyboard` are *temporary*: they disappear one stage after they appear.
- The help overlay (**H**) lists every prompt with its first accepted answer, so keep `acceptedAnswers[0]` as the "main" answer.
- The shoes, outfit, background and object names are *internal ids*. To rename what the user sees, change the button `label` in the stage; to change what a background is called under the scene, edit `BACKGROUND_LABELS` in [`character-assets.js`](./character-assets.js).

### The about note and the final letter

Both are plain text in [`content-config.js`](./content-config.js):

- `ABOUT_TEXT` — shown when the user opens `about.txt` on the desktop.
- `LETTER` — shown after opening the envelope:

```js
export const LETTER = {
  greeting: "Dear Friend,",
  paragraphs: ["First paragraph…", "Second paragraph…"],
  closing: "With best wishes,",
  signature: "Your Friend",
};
```

The letter is rendered as styled text (no image needed). If you prefer an image letter, replace the `<div className="letter-paper">…</div>` block in `LetterModal` inside [`character-stage.jsx`](./character-stage.jsx) with an `<img>`.

### Photo albums and the access code

Desktop icons are defined in `DESKTOP_ITEMS` in [`content-config.js`](./content-config.js). Each album has a `label` (shown on the desktop) and a `dir` (folder name). `protected: true` puts an access-code prompt in front of it. Change `ACCESS_CODE` and `ACCESS_PROMPT` in the same file. Photos must be `.jpg`, `.jpeg` or `.png` — HEIC files are ignored (convert them first).

**Please read [Known limitations and security notes](#known-limitations-and-security-notes) before relying on the album gate.**

### Replacing the artwork

All layer images are transparent PNGs exported from **one shared canvas of 4167 × 3334 px**. To use your own characters:

1. Draw/export every layer at exactly 4167 × 3334 px with transparent background, keeping each element at the position where it should appear in the final composition.
2. Overwrite the files in `public/` using the same file names (or add new files and update the paths in [`character-assets.js`](./character-assets.js)).
3. Click regions (hat, laptop, cake, keyboard keys, envelope, outfit, shoes) are defined as pixel boxes on that canvas in `character-assets.js` (`OUTFIT_HIT_REGION`, `SHOE_HIT_REGION`, `HAT_HIT_REGION`, `LAPTOP_HIT_REGION`, `CAKE_HIT_REGION`, `ENVELOPE_HIT_REGION`, `KEYBOARD_KEYS_REGION`). Re-measure the bounding box of your new art and update them, otherwise clicks will land in the wrong place.
4. `BACKGROUND_IMAGE_BOUNDS` positions the background arrow and label relative to the visible part of the background image.

| Folder / file | Used for |
| --- | --- |
| `character/hero/head.png` | Main character's head (always shown) |
| `character/hero/outfits/outfit-{default,casual,stylish}.png` | Outfits (clickable to cycle) |
| `character/hero/shoes/shoes-{a,b}.png` | Shoes (clickable to cycle) |
| `character/hero/accessories/{birthday-hat,laptop}.png` | Accessories |
| `character/companion/companion.png`, `companion-closer.png` | Companion, and closer version for the love sequence |
| `background/scene-{1,2,3}.png` | Backgrounds |
| `objects/{toy-car,keyboard,dumbbell,confetti,heart-bubble,cake-lit,cake-blown}.png` | Scene objects and cake |
| `objects/balloon.png` | Bundled but not currently used by the story |
| `envelope/envelope-{closed,open}.png` | Finale envelope |

Want more or fewer outfits, shoes or backgrounds? Add the file, then add its id to the matching map and `*_ORDER` array in `character-assets.js`, and reference it from a stage effect.

### Desktop theme colours

`THEME_COLORS` and `DEFAULT_THEME_COLOR` at the top of [`terminal-test.jsx`](./terminal-test.jsx). The user can switch colours with the **DISPLAY** button.

## Controls

| Key / button | Action |
| --- | --- |
| **Enter** | Submit the typed answer (or advance when Autoplay is on) |
| **H** | Toggle the help cheat-sheet (lists every answer) |
| **U** | Undo the last answered stage |
| **R** | Restart |
| **A S D F G H J K** | Play keyboard notes (while the keyboard is visible) |
| **Esc** | Close help |

H / U / R shortcuts are ignored while the text box is focused.

## Build and deploy

```bash
npm run build     # outputs to dist/
npm run preview   # test the production build locally
```

`dist/` is a static site and can be hosted anywhere (Netlify, GitHub Pages, Vercel, …). The files in `api/` are written for a Vercel-style serverless platform (`module.exports` handlers using `req`/`res`) and need these environment variables if you deploy them:

| Variable | Purpose |
| --- | --- |
| `ACCESS_SECRET` | Secret used to sign the access cookie. Use a long random string (32+ characters). **Required** |
| `ACCESS_CODE` | Code `/api/unlock` accepts (defaults to `1234` if unset — always set your own) |

Never commit these values; put them in your hosting provider's environment settings or a local `.env` (already git-ignored).

## Known limitations and security notes

This is a fun personal project template, provided **as is, use at your own risk**. It is not hardened for protecting sensitive data. In particular:

- **The in-app access-code gate is cosmetic.** `ACCESS_CODE` in `content-config.js` is bundled into the JavaScript that every visitor downloads, so anyone who opens the browser dev tools can read it. Treat the gate as a "nice reveal", not as protection.
- **The server-side photo gate is not connected to the UI.** `api/photo.js` only serves photos when a signed cookie from `api/unlock.js` is present, but the front end currently checks the code locally and never calls `/api/unlock`. Out of the box the album windows load photos from `/api/photo`, which will reply `403`.
- **Photo folders are inconsistent.** The album list is built from files found in `public/<album>/` (see `vite.config.js`), while `api/photo.js` reads from `private/<album>/`. Anything placed in `public/` is downloadable by anyone who knows the URL, and file names are included in the built JavaScript. Do **not** put photos you want to keep private in a public deployment.
- `/api/unlock` has no rate limiting, so a short code can be guessed by brute force. Use a long code or add rate limiting at your host.
- `api/*.js` use CommonJS (`require`) while `package.json` sets `"type": "module"`. Depending on your host you may need to rename them to `.cjs` or convert them to ES modules.
- `npm run dev` only starts Vite; the `api/` routes are not served locally.
- The Secure cookie flag means the unlock cookie is only set over HTTPS.

If you want a robust photo gate, wire the front end to `/api/unlock`, make the manifest read from a non-public folder, and add rate limiting — contributions are welcome.

## Before you publish your own copy

- Replace sample text in `content-config.js` and artwork in `public/` with your own.
- Do **not** commit personal photos. `.gitignore` already excludes `private/`, `public/album-*/`, `public-backup/`, `*.heic`, `.env*` and `.vercel/`, but double-check `git status` before every push.
- Photos and screenshots often carry EXIF data (GPS location, device, date). Strip metadata before sharing anything.
- Set a neutral `git config user.name` / `user.email` if you do not want your real email in commit history.
- Only publish artwork you have the right to share.

## License

No license has been chosen yet. Until a license file is added, the default is "all rights reserved". If you publish this project, add a `LICENSE` file (for example MIT or Apache-2.0) so others know how they may use it.
