import React, { useReducer, useState, useRef, useEffect, useCallback } from "react";
import CharacterStage from "./character-stage.jsx";
import { OUTFIT_ORDER, SHOE_ORDER, BACKGROUND_ORDER } from "./character-assets.js";
import {
  APP_CONFIG,
  ACCESS_CODE,
  ACCESS_PROMPT,
  DESKTOP_ITEMS,
  EMPTY_FOLDER_TEXT,
  ABOUT_TEXT,
  STAGES,
} from "./content-config.js";
// See vite.config.js — a virtual module listing the actual filenames
// present under public/<folder>/ (import.meta.glob cannot see into public/).
import photoManifest from "virtual:photo-manifest";

/**
 * BIRTHDAY TERMINAL — fixed desktop composition: terminal (left), the
 * character/animation area (right), and a handful of inert desktop icons.
 * Story progression lives entirely in STAGES + the reducer below; the
 * character/animation area and desktop icons are visual-only layers that
 * read state but never drive stage progression themselves.
 */

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap');`;

const DEFAULT_FAIL_RESPONSES = ["hmm... try again.", "that's not what i'm looking for."];

// ---------------------------------------------------------------
// DESKTOP ICONS — inert decoration, opens an empty retro window on click.
// No content is wired up yet; that comes later.
// ---------------------------------------------------------------
function PixelFolderIcon() {
  return (
    <svg width="36" height="30" viewBox="0 0 40 34" style={{ imageRendering: "pixelated" }}>
      <rect x="0" y="4" width="16" height="4" fill="#8B4A2B" />
      <rect x="0" y="8" width="40" height="26" fill="#A85A34" />
      <rect x="0" y="8" width="40" height="4" fill="#C97A4A" />
    </svg>
  );
}

function PixelFileIcon() {
  return (
    <svg width="27" height="32" viewBox="0 0 30 36" style={{ imageRendering: "pixelated" }}>
      <rect x="0" y="0" width="30" height="36" fill="#F1EAD9" stroke="#C9BFA6" strokeWidth="2" />
      <rect x="18" y="0" width="12" height="10" fill="#C9BFA6" />
      <rect x="5" y="14" width="20" height="2" fill="#C9BFA6" />
      <rect x="5" y="19" width="20" height="2" fill="#C9BFA6" />
      <rect x="5" y="24" width="14" height="2" fill="#C9BFA6" />
    </svg>
  );
}

function PixelGearIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" style={{ imageRendering: "pixelated" }}>
      <rect x="6" y="0" width="4" height="3" fill="#EFE6D3" />
      <rect x="6" y="13" width="4" height="3" fill="#EFE6D3" />
      <rect x="0" y="6" width="3" height="4" fill="#EFE6D3" />
      <rect x="13" y="6" width="3" height="4" fill="#EFE6D3" />
      <rect x="2" y="2" width="3" height="3" fill="#EFE6D3" />
      <rect x="11" y="2" width="3" height="3" fill="#EFE6D3" />
      <rect x="2" y="11" width="3" height="3" fill="#EFE6D3" />
      <rect x="11" y="11" width="3" height="3" fill="#EFE6D3" />
      <rect x="4" y="4" width="8" height="8" fill="#EFE6D3" />
      <rect x="6" y="6" width="4" height="4" fill="#7A4426" />
    </svg>
  );
}

// Desktop theme — a persistent UI preference, deliberately kept OUTSIDE the
// reducer's game state (see `themeColor` useState in the component) so it
// survives Restart and is never part of Undo history. The default is also
// itself a selectable swatch, so the user can click back to it.
const DEFAULT_THEME_COLOR = "#EC6E35";
const THEME_COLORS = ["#EC6E35", "#862B27", "#5C4BBD", "#2240AC", "#2D2D2D", "#BF889D"];

// The photos live in /public/<folder>/ (see content-config.js for folder
// names). Turn each manifest filename into a URL; folder and file names are
// encoded separately so spaces in either resolve correctly. HEIC/HEIF are
// already excluded by the manifest.
const PHOTOS_BY_FOLDER = {};
for (const [folder, files] of Object.entries(photoManifest)) {
  PHOTOS_BY_FOLDER[folder] = files.map(
(file) => `/api/photo?folder=${encodeURIComponent(folder)}&file=${encodeURIComponent(file)}`  );
}

// STAGE DATA now lives in content-config.js.

// ---------------------------------------------------------------
// GENERIC EFFECT APPLICATION — the only place that interprets effects
// ---------------------------------------------------------------
function describeEffect(effect) {
  switch (effect.type) {
    case "SET_LABEL": return `label set to "${effect.text}"`;
    case "ADD_ACCESSORY": return `+accessory: ${effect.accessory}`;
    case "REMOVE_ACCESSORY": return `-accessory: ${effect.accessory}`;
    case "SET_OUTFIT": return `outfit -> ${effect.outfit}`;
    case "SET_SHOES": return `shoes -> ${effect.shoes}`;
    case "SET_BACKGROUND": return `background -> ${effect.background}`;
    case "SHOW_OBJECT": return `show object: ${effect.object} (${effect.animation})`;
    case "SHOW_COMPANION": return `companion visible`;
    case "TRIGGER_LOVE_SEQUENCE": return `love sequence triggered`;
    case "TRIGGER_CAKE": return `cake lit`;
    case "TRIGGER_FINALE": return `finale triggered`;
    default: return effect.type;
  }
}

// ---------------------------------------------------------------
// character/scene visual state, folded from the same effects STAGES
// already carries. Nothing here changes which effects fire or when; it
// only tracks what the visual layer should currently show. outfit/shoes
// start non-null (the boy is always fully dressed) so the persistent
// click-to-cycle controls have something to cycle from before their
// stages are even reached. The envelope/letter finale sequence is played
// back locally in character-stage.jsx once `finale` turns true.
//
// laptop / dumbbell / keyboard are "temporary" — visible
// only for the stage that shows them plus the one after it, then swept
// away automatically (see sweepExpiredTempItems + TEMP_ITEM_KEYS below).
// ---------------------------------------------------------------
const TEMP_ITEM_KEYS = ["laptop", "dumbbell", "keyboard"];

function initialCharacterState() {
  return {
    outfit: OUTFIT_ORDER[0],
    shoes: SHOE_ORDER[0],
    accessories: [],
    hiddenAccessories: [],
    tempExpiry: {}, // { itemKey: stageIndex at which it should disappear }
    background: null,
    objectsVisible: [],
    showCompanion: false,
    loveSequence: false,
    cakeState: null,
    finale: false,
  };
}

// Removes any temporary item (laptop/dumbbell/keyboard) whose expiry
// stage has been reached. Called with the stage index the terminal is
// about to move to, BEFORE that stage's own effects are folded in.
function sweepExpiredTempItems(character, nextIndex) {
  const expiry = character.tempExpiry;
  const expiredKeys = Object.keys(expiry).filter((key) => nextIndex >= expiry[key]);
  if (expiredKeys.length === 0) return character;
  const nextExpiry = { ...expiry };
  expiredKeys.forEach((key) => delete nextExpiry[key]);
  return {
    ...character,
    accessories: character.accessories.filter((a) => !expiredKeys.includes(a)),
    objectsVisible: character.objectsVisible.filter((o) => !expiredKeys.includes(o.id)),
    tempExpiry: nextExpiry,
  };
}

function applyEffectsToCharacter(character, effects, nextIndex) {
  return effects.reduce((c, effect) => {
    switch (effect.type) {
      case "ADD_ACCESSORY": {
        // an explicit story trigger always wins over a manual click-to-hide
        if (c.accessories.includes(effect.accessory)) return c;
        const next = {
          ...c,
          accessories: [...c.accessories, effect.accessory],
          hiddenAccessories: c.hiddenAccessories.filter((a) => a !== effect.accessory),
        };
        return TEMP_ITEM_KEYS.includes(effect.accessory)
          ? { ...next, tempExpiry: { ...next.tempExpiry, [effect.accessory]: nextIndex + 1 } }
          : next;
      }
      case "REMOVE_ACCESSORY":
        return { ...c, accessories: c.accessories.filter((a) => a !== effect.accessory) };
      case "SET_OUTFIT":
        return { ...c, outfit: effect.outfit };
      case "SET_SHOES":
        return { ...c, shoes: effect.shoes };
      case "SET_BACKGROUND":
        return { ...c, background: effect.background };
      case "SHOW_OBJECT": {
        const rest = c.objectsVisible.filter((o) => o.id !== effect.object);
        const next = { ...c, objectsVisible: [...rest, { id: effect.object, animation: effect.animation }] };
        return TEMP_ITEM_KEYS.includes(effect.object)
          ? { ...next, tempExpiry: { ...next.tempExpiry, [effect.object]: nextIndex + 1 } }
          : next;
      }
      case "SHOW_COMPANION":
        return { ...c, showCompanion: true };
      case "TRIGGER_LOVE_SEQUENCE":
        return { ...c, loveSequence: true };
      case "TRIGGER_CAKE":
        return { ...c, cakeState: "lit" };
      case "TRIGGER_FINALE":
        return { ...c, finale: true };
      default:
        return c;
    }
  }, character);
}

// ---------------------------------------------------------------
// STATE
// ---------------------------------------------------------------
function buildBootLines() {
  return [
    { kind: "boot", text: APP_CONFIG.terminalTitle },
    { kind: "boot", text: "Type HELP to list available commands." },
    { kind: "boot", text: "" },
  ];
}

function initialState() {
  return {
    stageIndex: 0,
    lines: [...buildBootLines(), { kind: "question", text: STAGES[0].prompt }],
    effectsLog: [],
    history: [],
    autoplay: false,
    helpOpen: false,
    finished: false,
    lastFail: null,
    character: initialCharacterState(),
  };
}

function reducer(state, action) {
  switch (action.type) {
    case "RESTART":
      return initialState();

    case "TOGGLE_HELP":
      return { ...state, helpOpen: !state.helpOpen };

    case "CLOSE_HELP":
      return { ...state, helpOpen: false };

    case "TOGGLE_AUTOPLAY":
      return { ...state, autoplay: !state.autoplay };

    // Persistent visual controls — click-to-cycle outfit/shoes and the
    // background arrows. These update `character` directly and deliberately
    // do NOT push a history snapshot, so they never appear in Undo and
    // never touch stage progression, per the "visual interaction only"
    // requirement.
    case "CYCLE_OUTFIT": {
      const idx = OUTFIT_ORDER.indexOf(state.character.outfit);
      const next = OUTFIT_ORDER[(idx + 1) % OUTFIT_ORDER.length];
      return { ...state, character: { ...state.character, outfit: next } };
    }

    case "CYCLE_SHOES": {
      const idx = SHOE_ORDER.indexOf(state.character.shoes);
      const next = SHOE_ORDER[(idx + 1) % SHOE_ORDER.length];
      return { ...state, character: { ...state.character, shoes: next } };
    }

    case "CYCLE_BACKGROUND": {
      if (!state.character.background) return state;
      const len = BACKGROUND_ORDER.length;
      const idx = BACKGROUND_ORDER.indexOf(state.character.background);
      const next = BACKGROUND_ORDER[(idx + action.direction + len) % len];
      return { ...state, character: { ...state.character, background: next } };
    }

    case "HIDE_ACCESSORY": {
      if (state.character.hiddenAccessories.includes(action.accessory)) return state;
      return {
        ...state,
        character: {
          ...state.character,
          hiddenAccessories: [...state.character.hiddenAccessories, action.accessory],
        },
      };
    }

    case "BLOW_CAKE": {
      if (state.character.cakeState !== "lit") return state;
      return { ...state, character: { ...state.character, cakeState: "blown" } };
    }

    case "UNDO": {
      if (state.history.length === 0) {
        return {
          ...state,
          lines: [...state.lines, { kind: "response", text: "nothing to undo." }],
        };
      }
      const prev = state.history[state.history.length - 1];
      return {
        ...prev,
        history: state.history.slice(0, -1),
        autoplay: state.autoplay,
        helpOpen: false,
      };
    }

    case "ADVANCE_STAGE": {
      const { commandText, effects, successResponse } = action;
      const stage = STAGES[state.stageIndex];

      // snapshot BEFORE mutating, for undo
      const snapshot = {
        stageIndex: state.stageIndex,
        lines: state.lines,
        effectsLog: state.effectsLog,
        history: state.history,
        finished: state.finished,
        lastFail: state.lastFail,
        character: state.character,
      };

      const newLines = [
        ...state.lines,
        { kind: "command", text: commandText },
        { kind: "response", text: successResponse },
      ];

      const newEffectsLog = [
        ...state.effectsLog,
        ...effects.map((e) => `[${stage.id}] ${describeEffect(e)}`),
      ];

      const nextIndex = state.stageIndex + 1;
      const isFinished = nextIndex >= STAGES.length;

      if (!isFinished) {
        newLines.push({ kind: "question", text: STAGES[nextIndex].prompt });
      } else {
        newLines.push({ kind: "boot", text: "" });
        newLines.push({ kind: "boot", text: "SEQUENCE COMPLETE." });
      }

      const sweptCharacter = sweepExpiredTempItems(state.character, nextIndex);

      return {
        ...state,
        stageIndex: nextIndex,
        lines: newLines,
        effectsLog: newEffectsLog,
        history: [...state.history, snapshot],
        finished: isFinished,
        lastFail: null,
        character: applyEffectsToCharacter(sweptCharacter, effects, nextIndex),
      };
    }

    case "FAIL_ANSWER": {
      const { commandText, failText } = action;
      return {
        ...state,
        lines: [
          ...state.lines,
          { kind: "command", text: commandText },
          { kind: "error", text: failText },
        ],
      };
    }

    default:
      return state;
  }
}

// ---------------------------------------------------------------
// COMPONENT
// ---------------------------------------------------------------
export default function TerminalTest() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [inputValue, setInputValue] = useState("");
  const [openFolder, setOpenFolder] = useState(null); // desktop-icon window — pure UI state, unrelated to story/undo
  const [expandedPhoto, setExpandedPhoto] = useState(null); // which photo (src) is enlarged inside the open folder window
  const [themeColor, setThemeColor] = useState(DEFAULT_THEME_COLOR); // persistent UI preference — survives Restart, not in Undo history
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Visual-only access gate (see ACCESS_CODE) — also outside the reducer,
  // so it's unaffected by Undo/Restart. Unlocking once covers the rest of
  // the session for both the photo folders and the letter.
  const [unlocked, setUnlocked] = useState(false);
  const [codeGateOpen, setCodeGateOpen] = useState(false);
  const [pendingFolder, setPendingFolder] = useState(null);
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState(false);
  const inputRef = useRef(null);
  const bodyRef = useRef(null);
  const failIndexRef = useRef(0);

  const currentStage = STAGES[state.stageIndex];

  // Once unlocked, any folder that was waiting on the code opens automatically.
  useEffect(() => {
    if (unlocked && pendingFolder) {
      setOpenFolder(pendingFolder);
      setPendingFolder(null);
    }
  }, [unlocked, pendingFolder]);

  const handleDesktopIconClick = (item) => {
    if (item.protected && !unlocked) {
      setPendingFolder(item);
      setCodeGateOpen(true);
      setCodeInput("");
      setCodeError(false);
      return;
    }
    setOpenFolder(item);
  };

  const submitAccessCode = () => {
    if (codeInput.trim() === ACCESS_CODE) {
      setUnlocked(true);
      setCodeGateOpen(false);
    } else {
      setCodeError(true);
    }
  };

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [state.lines, state.helpOpen]);

  useEffect(() => {
    if (!state.autoplay && !state.finished && currentStage?.type === "text-input") {
      inputRef.current?.focus();
    }
  }, [state.stageIndex, state.autoplay, state.finished, currentStage]);

  const submitTextAnswer = useCallback(
    (rawValue) => {
      if (!currentStage || currentStage.type !== "text-input") return;
      const value = rawValue.trim();
      if (!value) return;
      const normalized = value.toLowerCase();
      const isCorrect = currentStage.acceptedAnswers.some(
        (a) => a.toLowerCase() === normalized
      );

      if (isCorrect) {
        dispatch({
          type: "ADVANCE_STAGE",
          commandText: value,
          effects: currentStage.effects || [],
          successResponse: currentStage.successResponse || "ACCESS GRANTED.",
        });
      } else {
        const fails = DEFAULT_FAIL_RESPONSES;
        const failText = fails[failIndexRef.current % fails.length];
        failIndexRef.current += 1;
        dispatch({ type: "FAIL_ANSWER", commandText: value, failText });
      }
      setInputValue("");
    },
    [currentStage]
  );

  const selectOption = useCallback(
    (option) => {
      if (!currentStage || currentStage.type !== "choice") return;
      if (option.rejectsStage) {
        dispatch({
          type: "FAIL_ANSWER",
          commandText: option.label.toLowerCase(),
          failText: option.retryPrompt || "hmm... try again.",
        });
        return;
      }
      dispatch({
        type: "ADVANCE_STAGE",
        commandText: option.label.toLowerCase(),
        effects: option.effects || [],
        successResponse: currentStage.successResponse || "OK.",
      });
    },
    [currentStage]
  );

  // Autoplay: pressing Enter advances using the stage's default answer
  useEffect(() => {
    if (!state.autoplay || state.finished) return;
    const handler = (e) => {
      if (e.key !== "Enter") return;
      const stage = STAGES[state.stageIndex];
      if (!stage) return;
      if (stage.type === "text-input") {
        submitTextAnswer(stage.defaultAutoplayAnswer || stage.acceptedAnswers[0]);
      } else if (stage.type === "choice") {
        const firstValid = stage.options.find((o) => !o.rejectsStage) || stage.options[0];
        selectOption(firstValid);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [state.autoplay, state.finished, state.stageIndex, submitTextAnswer, selectOption]);

  // Global shortcuts H / U / R — ignored while the text input is focused,
  // so typing a multi-word answer never triggers them.
  useEffect(() => {
    const handler = (e) => {
      const typing = document.activeElement === inputRef.current;
      if (e.key === "Escape") {
        dispatch({ type: "CLOSE_HELP" });
        return;
      }
      if (typing) return;
      if (e.key.toLowerCase() === "h") dispatch({ type: "TOGGLE_HELP" });
      if (e.key.toLowerCase() === "u") dispatch({ type: "UNDO" });
      if (e.key.toLowerCase() === "r") dispatch({ type: "RESTART" });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleInputKeyDown = (e) => {
    if (e.key === "Enter") {
      submitTextAnswer(inputValue);
    }
  };

  return (
    <div className="shell-root">
      <style>{`
        ${FONT_IMPORT}
        html, body {
          margin: 0;
          padding: 0;
          height: 100%;
          overflow: hidden;
        }
        .shell-root {
          --cream: #EFE6D3;
          --cream-dark: #DDD0B4;
          --orange: #E2661F;
          --orange-deep: #C6520F;
          --terminal-bg: #17130F;
          --terminal-text: #E7DFC9;
          --terminal-dim: #A79A7E;
          --terminal-error: #E2795A;
          --brown: #7A4426;
          --brown-deep: #5C3018;
          --ink: #2B1F16;

          position: relative;
          display: flex;
          flex-direction: column;
          width: 100vw;
          height: 100vh;
          background: ${themeColor};
          font-family: 'VT323', monospace;
          color: var(--ink);
          box-sizing: border-box;
          padding-bottom: 70px;
          overflow: hidden;
        }
        .shell-root * { box-sizing: border-box; }

        .top-bar {
          display: flex; align-items: center; justify-content: space-between;
          background: var(--cream);
          border-bottom: 2px solid var(--brown-deep);
          padding: 6px 14px; font-size: 15px;
        }
        .top-right { display: flex; align-items: center; gap: 14px; font-size: 14px; }
        .autoplay-toggle { display: flex; align-items: center; gap: 8px; cursor: pointer; }
        .autoplay-track {
          width: 40px; height: 20px; background: var(--brown);
          border: 1px solid var(--brown-deep); position: relative;
        }
        .autoplay-thumb {
          position: absolute; top: 2px; left: 2px; width: 14px; height: 14px;
          background: var(--cream); transition: left 0.15s ease;
        }
        .autoplay-track.on { background: var(--orange-deep); }
        .autoplay-track.on .autoplay-thumb { left: 22px; }

        .desktop-area {
          position: relative;
          z-index: 1;
          flex: 1;
          min-height: 0;
          padding: 30px 30px 30px 150px;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: hidden;
        }
        .stage {
          display: flex;
          flex-wrap: nowrap;
          gap: 28px;
          align-items: flex-start;
          justify-content: center;
          max-width: 100%;
          max-height: 100%;
          overflow: hidden;
        }

        .terminal-window {
          flex: 0 0 760px; width: 760px;
          background: var(--terminal-bg);
          border: 3px solid var(--cream-dark);
          box-shadow: 4px 4px 0 rgba(0,0,0,0.25);
        }
        .terminal-titlebar {
          background: var(--cream); border-bottom: 2px solid var(--brown-deep);
          display: flex; align-items: center; justify-content: space-between;
          padding: 8px 12px; font-size: 16px;
        }
        .terminal-title { display: flex; align-items: center; gap: 8px; }
        .dot { width: 8px; height: 8px; background: var(--orange-deep); }
        .titlebar-controls { display: flex; gap: 6px; }
        .tb-btn {
          width: 22px; height: 20px; background: var(--brown); color: var(--cream);
          display: flex; align-items: center; justify-content: center; font-size: 12px;
          border: 1px solid var(--brown-deep);
        }
        .tb-btn.close { background: var(--ink); }
        button.tb-btn { font-family: inherit; cursor: pointer; }

        .terminal-body {
          padding: 16px 20px; height: 380px; overflow-y: auto;
          color: var(--terminal-text); font-size: 18px; line-height: 1.5;
        }
        .line-boot { color: var(--terminal-dim); }
        .line-question { color: var(--terminal-text); margin-top: 6px; }
        .line-question::before { content: "> "; color: var(--terminal-dim); }
        .line-command::before { content: "${APP_CONFIG.promptPrefix} "; color: var(--orange); }
        .line-response { color: #B7D9A8; }
        .line-response::before { content: "> "; opacity: 0.6; }
        .line-error { color: var(--terminal-error); }
        .line-error::before { content: "> "; opacity: 0.6; }

        .prompt-row { display: flex; align-items: center; margin-top: 4px; }
        .prompt-row .prefix { color: var(--orange); margin-right: 2px; }
        .prompt-input {
          background: transparent; border: none; outline: none;
          color: var(--terminal-text); font-family: 'VT323', monospace;
          font-size: 18px; flex: 1; caret-color: transparent;
        }
        .cursor-blink {
          display: inline-block; width: 9px; height: 16px;
          background: var(--terminal-text); margin-left: 2px;
          animation: blink 1s steps(1) infinite; vertical-align: middle;
        }
        @keyframes blink { 50% { opacity: 0; } }

        .choice-row { display: flex; flex-direction: column; gap: 4px; margin-top: 6px; }
        .choice-btn {
          background: none; border: none; color: var(--terminal-text);
          font-family: 'VT323', monospace; font-size: 18px; text-align: left;
          cursor: pointer; padding: 2px 0;
        }
        .choice-btn:hover { color: var(--orange); }
        .choice-btn::before { content: "> "; opacity: 0.5; }

        .autoplay-hint { color: var(--terminal-dim); margin-top: 8px; }

        .debug-strip {
          border-top: 1px dashed rgba(239,230,211,0.25);
          padding: 8px 20px; height: 90px; overflow-y: auto;
          font-size: 13px; color: rgba(231,223,201,0.55);
        }
        .debug-strip div { white-space: pre; }

        .bottom-bar {
          position: absolute; bottom: 22px; left: 50%; transform: translateX(-50%);
          z-index: 40;
          display: flex; gap: 10px; background: var(--cream);
          border: 2px solid var(--brown-deep); padding: 8px;
          box-shadow: 3px 3px 0 rgba(0,0,0,0.2);
        }
        .control-btn {
          display: flex; flex-direction: column; align-items: center; gap: 2px;
          background: var(--brown); border: none; padding: 8px 14px; cursor: pointer;
        }
        .control-btn:hover { background: var(--brown-deep); }
        .control-key { color: var(--cream); font-family: 'Press Start 2P', monospace; font-size: 11px; }
        .control-label { color: var(--cream-dark); font-size: 12px; }

        .help-overlay {
          position: absolute; inset: 0; background: rgba(23,19,15,0.85);
          display: flex; align-items: center; justify-content: center; z-index: 50;
        }
        .help-card {
          background: var(--cream); border: 3px solid var(--brown-deep);
          padding: 24px 28px; width: 460px; max-width: 90vw;
          max-height: 80vh; display: flex; flex-direction: column;
          box-shadow: 5px 5px 0 rgba(0,0,0,0.3);
        }
        .help-card h3 { margin: 0 0 14px; font-family: 'Press Start 2P', monospace; font-size: 13px; }
        .cheat-list { overflow-y: auto; }
        .cheat-row {
          display: flex; flex-direction: column;
          font-size: 15px; margin-bottom: 10px; padding-bottom: 8px;
          border-bottom: 1px dashed var(--cream-dark);
        }
        .cheat-prompt { color: var(--brown-deep); }
        .cheat-answer { color: var(--ink); font-weight: bold; }
        .help-close {
          margin-top: 14px; background: var(--brown); color: var(--cream);
          border: none; padding: 6px 12px; cursor: pointer; font-family: 'VT323', monospace; font-size: 15px;
          align-self: flex-start;
        }

        .desktop-icons {
          position: absolute;
          top: 56px; left: 20px;
          display: flex; flex-direction: column; gap: 20px;
          z-index: 5;
        }

        .desktop-credit {
          position: absolute;
          bottom: 8px; right: 14px;
          z-index: 2;
          font-family: 'VT323', monospace;
          font-size: 14px;
          color: var(--cream);
          opacity: 0.75;
          text-shadow: 1px 1px 0 rgba(0,0,0,0.3);
          pointer-events: none;
        }

        .settings-btn {
          position: absolute;
          top: 36px; right: 14px;
          z-index: 6;
          height: 22px;
          padding: 0 8px;
          background: var(--brown);
          border: 1px solid var(--brown-deep);
          display: flex; align-items: center; gap: 5px;
          cursor: pointer;
        }
        .settings-btn:hover { background: var(--brown-deep); }
        .settings-btn span {
          color: var(--cream);
          font-family: 'Press Start 2P', monospace;
          font-size: 8px;
          letter-spacing: 0.5px;
        }
        .settings-panel {
          position: absolute;
          top: 62px; right: 14px;
          z-index: 6;
          background: var(--cream);
          border: 2px solid var(--brown-deep);
          padding: 8px;
          display: flex; gap: 6px;
          box-shadow: 3px 3px 0 rgba(0,0,0,0.2);
        }
        .color-swatch {
          width: 20px; height: 20px;
          border: 2px solid var(--brown-deep);
          padding: 0;
          cursor: pointer;
        }
        .color-swatch.active { border-color: var(--ink); border-width: 3px; }
        .desktop-icon {
          background: none; border: none; cursor: pointer;
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          width: 72px; padding: 4px;
          color: var(--cream); text-shadow: 1px 1px 0 rgba(0,0,0,0.35);
          font-family: 'VT323', monospace; font-size: 13px;
        }
        .desktop-icon:hover { filter: brightness(1.15); }

        .folder-overlay {
          position: absolute; inset: 0; background: rgba(23,19,15,0.6);
          display: flex; align-items: center; justify-content: center; z-index: 30;
        }
        .folder-window {
          width: 380px; max-width: 85vw; max-height: 70vh;
          display: flex; flex-direction: column;
          background: var(--terminal-bg);
          border: 3px solid var(--cream-dark);
          box-shadow: 4px 4px 0 rgba(0,0,0,0.25);
        }
        .folder-body {
          padding: 40px 20px; min-height: 160px;
          display: flex; align-items: center; justify-content: center; text-align: center;
          color: var(--terminal-dim); font-size: 16px;
        }
        .folder-body.about-text {
          display: block;
          text-align: left;
          white-space: pre-wrap;
          overflow-y: auto;
          color: var(--terminal-text);
          font-size: 15px;
          line-height: 1.5;
          min-height: 0;
        }
        .photo-grid {
          flex: 1;
          padding: 14px;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
          grid-auto-rows: 90px;
          align-content: start;
          gap: 8px;
          overflow-y: auto;
          min-height: 0;
        }
        .photo-grid img {
          width: 100%;
          height: 100%;
          aspect-ratio: 1;
          object-fit: cover;
          border: 2px solid var(--brown-deep);
          background: var(--terminal-bg);
          cursor: zoom-in;
        }
        .photo-grid img.expanded {
          grid-column: span 3;
          grid-row: span 3;
          object-fit: contain;
          cursor: zoom-out;
        }

        .code-gate-overlay {
          position: absolute; inset: 0; background: rgba(23,19,15,0.85);
          display: flex; align-items: center; justify-content: center; z-index: 50;
        }
        .code-gate-card {
          background: var(--cream); border: 3px solid var(--brown-deep);
          padding: 24px 28px; width: 260px;
          box-shadow: 5px 5px 0 rgba(0,0,0,0.3);
          display: flex; flex-direction: column; align-items: center; gap: 10px;
        }
        .code-gate-prompt {
          font-family: 'Press Start 2P', monospace; font-size: 12px;
          color: var(--ink); text-align: center; margin-bottom: 6px;
        }
        .code-gate-input {
          width: 100%; text-align: center; letter-spacing: 8px;
          background: var(--terminal-bg); color: var(--terminal-text);
          border: 2px solid var(--brown-deep); padding: 8px;
          font-family: 'VT323', monospace; font-size: 22px;
        }
        .code-gate-error {
          color: var(--brown-deep); font-size: 14px;
        }
        .code-gate-submit {
          background: var(--brown); color: var(--cream);
          border: none; padding: 6px 16px; cursor: pointer;
          font-family: 'VT323', monospace; font-size: 15px;
        }
        .code-gate-submit:hover { background: var(--brown-deep); }
      `}</style>

      <div className="top-bar">
        <div>Welcome to your {APP_CONFIG.welcomeTitle}, {APP_CONFIG.userName}!</div>
        <div className="top-right">
          <div
            className="autoplay-toggle"
            onClick={() => dispatch({ type: "TOGGLE_AUTOPLAY" })}
          >
            <span>Autoplay</span>
            <div className={`autoplay-track ${state.autoplay ? "on" : ""}`}>
              <div className="autoplay-thumb" />
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="settings-btn"
        aria-label="Settings"
        title="Settings"
        onClick={() => setSettingsOpen((open) => !open)}
      >
        <PixelGearIcon />
        <span>DISPLAY</span>
      </button>
      {settingsOpen && (
        <div className="settings-panel">
          {THEME_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={`color-swatch${color === themeColor ? " active" : ""}`}
              aria-label={`Set desktop colour ${color}`}
              title={color}
              style={{ background: color }}
              onClick={() => setThemeColor(color)}
            />
          ))}
        </div>
      )}

      <div className="desktop-area">
        <div className="stage">
        <div className="terminal-window">
          <div className="terminal-titlebar">
            <div className="terminal-title">
              <span className="dot" />
              <span>Terminal</span>
            </div>
            <div className="titlebar-controls">
              <div className="tb-btn">–</div>
              <div className="tb-btn">▢</div>
              <div className="tb-btn close">×</div>
            </div>
          </div>

          <div className="terminal-body" ref={bodyRef} onClick={() => inputRef.current?.focus()}>
            {state.lines.map((line, i) => (
              <div key={i} className={`line-${line.kind}`}>
                {line.text}
              </div>
            ))}

            {!state.finished && currentStage?.type === "text-input" && !state.autoplay && (
              <div className="prompt-row">
                <span className="prefix">{APP_CONFIG.promptPrefix}</span>
                <input
                  ref={inputRef}
                  className="prompt-input"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  autoFocus
                  spellCheck={false}
                />
                <span className="cursor-blink" />
              </div>
            )}

            {!state.finished && currentStage?.type === "choice" && !state.autoplay && (
              <div className="choice-row">
                {currentStage.options.map((opt) => (
                  <button key={opt.id} className="choice-btn" onClick={() => selectOption(opt)}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {!state.finished && state.autoplay && (
              <div className="autoplay-hint">
                {APP_CONFIG.promptPrefix} <span className="cursor-blink" /> (autoplay on — press ENTER to continue)
              </div>
            )}
          </div>

          <div className="debug-strip">
            {state.effectsLog.length === 0 && <div>effects log (Phase 3 will render these visually)…</div>}
            {state.effectsLog.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>

        <CharacterStage
          character={state.character}
          onCycleOutfit={() => dispatch({ type: "CYCLE_OUTFIT" })}
          onCycleShoes={() => dispatch({ type: "CYCLE_SHOES" })}
          onCycleBackground={(direction) => dispatch({ type: "CYCLE_BACKGROUND", direction })}
          onHideAccessory={(accessory) => dispatch({ type: "HIDE_ACCESSORY", accessory })}
          onBlowCake={() => dispatch({ type: "BLOW_CAKE" })}
          letterUnlocked={unlocked}
          onRequestLetterUnlock={() => {
            setPendingFolder(null);
            setCodeGateOpen(true);
            setCodeInput("");
            setCodeError(false);
          }}
        />
        </div>
      </div>

      <div className="desktop-icons">
        {DESKTOP_ITEMS.map((item) => (
          <button
            key={item.id}
            className="desktop-icon"
            onClick={() => handleDesktopIconClick(item)}
          >
            {item.type === "file" ? <PixelFileIcon /> : <PixelFolderIcon />}
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <div className="desktop-credit">{APP_CONFIG.creditLine}</div>

      {openFolder && (
        <div className="folder-overlay" onClick={() => { setOpenFolder(null); setExpandedPhoto(null); }}>
          <div
            className="folder-window"
            style={
              openFolder.dir
                ? { width: 480, height: 520 } // fixed size — expanding a photo must never resize this window
                : openFolder.id === "about"
                ? { width: 480 }
                : undefined
            }
            onClick={(e) => e.stopPropagation()}
          >
            <div className="terminal-titlebar">
              <div className="terminal-title">
                <span className="dot" />
                <span>{openFolder.label}</span>
              </div>
              <div className="titlebar-controls">
                <button
                  className="tb-btn close"
                  onClick={() => { setOpenFolder(null); setExpandedPhoto(null); }}
                >
                  ×
                </button>
              </div>
            </div>
            {openFolder.id === "about" ? (
              <div className="folder-body about-text">{ABOUT_TEXT}</div>
            ) : openFolder.dir ? (
              (PHOTOS_BY_FOLDER[openFolder.dir] || []).length > 0 ? (
                <div className="photo-grid">
                  {PHOTOS_BY_FOLDER[openFolder.dir].map((src) => (
                    <img
                      key={src}
                      src={src}
                      alt=""
                      loading="lazy"
                      className={expandedPhoto === src ? "expanded" : undefined}
                      onClick={() => setExpandedPhoto((cur) => (cur === src ? null : src))}
                    />
                  ))}
                </div>
              ) : (
                <div className="folder-body">{EMPTY_FOLDER_TEXT}</div>
              )
            ) : (
              <div className="folder-body">(empty document — content coming soon)</div>
            )}
          </div>
        </div>
      )}

      {codeGateOpen && (
        <div className="code-gate-overlay" onClick={() => setCodeGateOpen(false)}>
          <div className="code-gate-card" onClick={(e) => e.stopPropagation()}>
            <div className="code-gate-prompt">{ACCESS_PROMPT}</div>
            <input
              className="code-gate-input"
              value={codeInput}
              onChange={(e) => {
                setCodeInput(e.target.value.replace(/\D/g, "").slice(0, 4));
                setCodeError(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitAccessCode();
              }}
              maxLength={4}
              inputMode="numeric"
              autoFocus
              placeholder="_ _ _ _"
            />
            {codeError && <div className="code-gate-error">incorrect.</div>}
            <button className="code-gate-submit" onClick={submitAccessCode}>
              enter
            </button>
          </div>
        </div>
      )}

      <div className="bottom-bar">
        <button className="control-btn" onClick={() => dispatch({ type: "TOGGLE_HELP" })}>
          <span className="control-key">H</span>
          <span className="control-label">Help</span>
        </button>
        <button className="control-btn" onClick={() => dispatch({ type: "UNDO" })}>
          <span className="control-key">U</span>
          <span className="control-label">Undo</span>
        </button>
        <button className="control-btn" onClick={() => dispatch({ type: "RESTART" })}>
          <span className="control-key">R</span>
          <span className="control-label">Restart</span>
        </button>
      </div>

      {state.helpOpen && (
        <div className="help-overlay" onClick={() => dispatch({ type: "CLOSE_HELP" })}>
          <div className="help-card" onClick={(e) => e.stopPropagation()}>
            <h3>// CHEATSHEET</h3>
            <div className="cheat-list">
              {STAGES.map((s) => (
                <div className="cheat-row" key={s.id}>
                  <span className="cheat-prompt">{s.prompt}</span>
                  <span className="cheat-answer">
                    {s.type === "text-input"
                      ? (s.acceptedAnswers[0] || "").toUpperCase()
                      : s.options.filter((o) => !o.rejectsStage).map((o) => o.label).join(" / ")}
                  </span>
                </div>
              ))}
            </div>
            <button className="help-close" onClick={() => dispatch({ type: "CLOSE_HELP" })}>
              close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
