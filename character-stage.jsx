import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  SCENE_CANVAS,
  HEAD_ASSET,
  OUTFIT_ASSETS,
  SHOE_ASSETS,
  ACCESSORY_ASSETS,
  OUTFIT_HIT_REGION,
  SHOE_HIT_REGION,
  HAT_HIT_REGION,
  LAPTOP_HIT_REGION,
  CAKE_HIT_REGION,
  ENVELOPE_HIT_REGION,
  KEYBOARD_KEYS_REGION,
  KEYBOARD_KEY_COUNT,
  KEYBOARD_KEY_LETTERS,
  KEYBOARD_KEY_FREQUENCIES,
  KEYBOARD_KEY_NOTE_NAMES,
  BACKGROUND_ASSETS,
  BACKGROUND_LABELS,
  BACKGROUND_IMAGE_BOUNDS,
  OBJECT_ASSETS,
  COMPANION_ASSET,
  COMPANION_CLOSER_ASSET,
  LOVE_SEQUENCE_ASSET,
  ENVELOPE_ASSETS,
  CAKE_ASSETS,
} from "./character-assets.js";
import { LETTER } from "./content-config.js";

/**
 * CHARACTER / SCENE RENDERER
 * -------------------------------------------------
 * Every layer here — including envelope-closed/open — shares the same
 * 4167x3334 source canvas (see character-assets.js): stacking every layer
 * at 100% width/height of the same fixed-aspect box reproduces the
 * designer's composition with no per-layer offset math or CSS
 * repositioning. The envelope's content is pre-positioned by the PNG
 * itself at the canvas's horizontal middle, landing naturally between
 * the companion and the hero without any custom placement here.
 *
 * Z-INDEX MAP (all local to this component's own isolated stacking
 * context — see `isolation: isolate`, which keeps this stack from ever
 * visually escaping above Help/Undo/Restart or the desktop's folder
 * windows). The large letter is the one exception: it's rendered through
 * a React portal straight into <body> (see LetterModal below) so it can
 * sit above folder windows too without disturbing this local stack.
 *   0  background
 *   5  companion / companion-closer
 *   10 outfit
 *   11 shoes
 *   12 head
 *   13 accessories (hat, laptop) — image only, pointer-events:none
 *   14 scene props (toy-car, keyboard, dumbbell)
 *   16 confetti-burst (foreground burst effect)
 *   20 love-bubble
 *   25 cake — image only, pointer-events:none
 *   30 envelope — image only, pointer-events:none
 *   50 outfit/shoe cycling hit-regions (persistent visual controls)
 *   55 dedicated hit-regions for hat/laptop/cake/keyboard-keys — ABOVE the
 *      outfit/shoe hit-regions, because their bboxes overlap them and a
 *      click there must hit the intended foreground object, not the
 *      character underneath
 *   60 background arrows + location label
 *   65 envelope hit-region — above arrows too, since envelope can appear
 *      alongside a background
 *
 * outfit/shoe/background cycling, accessory removal, cake-blowing, and
 * envelope/letter playback are all visual-only — they update `character`
 * (via the on* callback props) or purely local component state, and never
 * touch the terminal's stage/undo state.
 */

const ASPECT = `${SCENE_CANVAS.width} / ${SCENE_CANVAS.height}`;
const pixelated = { imageRendering: "pixelated" };

function FullLayer({ src, alt, z, style, className }) {
  if (!src) return null;
  return (
    <img
      className={`scene-layer${className ? ` ${className}` : ""}`}
      src={src}
      alt={alt}
      style={{ ...pixelated, zIndex: z, pointerEvents: "none", ...style }}
    />
  );
}

function HitRegion({ region, z, label, onClick, style }) {
  return (
    <button
      type="button"
      className="hit-region"
      aria-label={label}
      title={label}
      onClick={onClick}
      style={{
        left: `${region.left}%`,
        top: `${region.top}%`,
        width: `${region.width}%`,
        height: `${region.height}%`,
        zIndex: z,
        ...style,
      }}
    />
  );
}

// Local, purely-presentational envelope <-> letter toggle. Triggered once by
// character.finale flipping true; not part of terminal/undo state.
// envelopeArt: 'closed' -> 'open' (one-way, first click only — the
// closed->open transition/700ms delay only plays once). letterOpen toggles
// freely after that: click envelope -> open, click X -> close, click
// envelope again -> open again, indefinitely.
function useFinaleSequence(finale) {
  const [envelopeArt, setEnvelopeArt] = useState("closed");
  const [letterOpen, setLetterOpen] = useState(false);
  const openedOnceRef = useRef(false);

  useEffect(() => {
    if (!finale) {
      setEnvelopeArt("closed");
      setLetterOpen(false);
      openedOnceRef.current = false;
    }
  }, [finale]);

  const clickEnvelope = () => {
    if (letterOpen) return;
    if (!openedOnceRef.current) {
      openedOnceRef.current = true;
      setEnvelopeArt("open");
      setTimeout(() => setLetterOpen(true), 700);
    } else {
      setLetterOpen(true);
    }
  };
  const closeLetter = () => setLetterOpen(false);

  return { envelopeArt, letterOpen, clickEnvelope, closeLetter };
}

// Minimal Web Audio helper — one shared AudioContext, created lazily on the
// first key press so the browser's autoplay gesture requirement is
// satisfied. No samples/library, just a short sine-wave blip per key.
function usePianoKeys() {
  const ctxRef = useRef(null);
  return (freq) => {
    if (!ctxRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      ctxRef.current = new AudioCtx();
    }
    const ctx = ctxRef.current;
    if (ctx.state === "suspended") ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  };
}

// Large letter, portaled straight into <body> so it can render above the
// desktop's folder windows (unlike everything else in this component,
// which is intentionally trapped below Help/Undo/Restart by
// `isolation: isolate`). No translucent backdrop — just the artwork,
// centered on the whole viewport, with a top-right close control.
function LetterModal({ onClose }) {
  return createPortal(
    <div className="letter-modal">
      <div className="letter-frame">
        <button type="button" className="letter-close" aria-label="Close letter" onClick={onClose}>
          ×
        </button>
        <div className="letter-paper">
          <p className="letter-greeting">{LETTER.greeting}</p>
          {LETTER.paragraphs.map((text, i) => (
            <p key={i}>{text}</p>
          ))}
          <p className="letter-closing">{LETTER.closing}</p>
          <p className="letter-signature">{LETTER.signature}</p>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function CharacterStage({
  character,
  onCycleOutfit,
  onCycleShoes,
  onCycleBackground,
  onHideAccessory,
  onBlowCake,
  letterUnlocked,
  onRequestLetterUnlock,
}) {
  const c = character || {};
  const { envelopeArt, letterOpen, clickEnvelope, closeLetter } = useFinaleSequence(c.finale);
  const playKey = usePianoKeys();
  const [pendingLetterOpen, setPendingLetterOpen] = useState(false);

  // The letter is gated behind the code prompt (owned by terminal-test.jsx,
  // shared with the photo folders). If already unlocked, clicking the
  // envelope behaves exactly as before. If not, we ask the parent to show
  // the gate and remember that this envelope click is still "pending" —
  // once `letterUnlocked` flips true, the envelope opens automatically.
  useEffect(() => {
    if (letterUnlocked && pendingLetterOpen) {
      setPendingLetterOpen(false);
      clickEnvelope();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [letterUnlocked]);

  const handleEnvelopeClick = () => {
    if (!letterUnlocked) {
      setPendingLetterOpen(true);
      onRequestLetterUnlock?.();
      return;
    }
    clickEnvelope();
  };

  const companionSrc = c.loveSequence
    ? COMPANION_CLOSER_ASSET
    : c.showCompanion
    ? COMPANION_ASSET
    : null;
  const backgroundSrc = c.background ? BACKGROUND_ASSETS[c.background] : null;
  const showArrows = !!c.background;
  const hidden = c.hiddenAccessories || [];
  const showHat = c.accessories?.includes("birthday-hat") && !hidden.includes("birthday-hat");
  const showLaptop = c.accessories?.includes("laptop") && !hidden.includes("laptop");
  const showKeyboardKeys = (c.objectsVisible || []).some((o) => o.id === "keyboard");
  const keyWidth = KEYBOARD_KEYS_REGION.width / KEYBOARD_KEY_COUNT;

  // A/S/D/F/G/H/J/K physical keys play the same notes as the on-screen keys.
  useEffect(() => {
    if (!showKeyboardKeys) return;
    const map = { a: 0, s: 1, d: 2, f: 3, g: 4, h: 5, j: 6, k: 7 };
    const handler = (e) => {
      const idx = map[e.key.toLowerCase()];
      if (idx === undefined) return;
      playKey(KEYBOARD_KEY_FREQUENCIES[idx]);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showKeyboardKeys, playKey]);

  return (
    <div className="animation-wrap">
      <div className="animation-area">
      <style>{`
        .animation-area {
          position: relative;
          width: 460px;
          max-width: 100%;
          aspect-ratio: ${ASPECT};
          max-height: 100%;
          background: transparent;
          overflow: hidden;
          flex-shrink: 0;
          isolation: isolate;
        }
        .scene-layer {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .hit-region {
          position: absolute;
          background: transparent;
          border: none;
          padding: 0;
          cursor: pointer;
        }
        .piano-key {
          position: absolute;
          top: ${KEYBOARD_KEYS_REGION.top}%;
          height: ${KEYBOARD_KEYS_REGION.height}%;
          background: transparent;
          border: none;
          padding: 0;
          cursor: pointer;
          z-index: 55;
        }
        .piano-key:hover { background: rgba(255,255,255,0.2); }
        .piano-key:active { background: rgba(255,255,255,0.35); }

        .anim-pop { animation: confetti-fall 2.6s ease-in forwards; }
        .anim-slide-across { animation: car-drive 4.5s linear forwards; }
        .anim-appear { animation: obj-appear 0.4s ease-out; }
        @keyframes confetti-fall {
          0% { transform: translate(0, -18%) rotate(0deg); opacity: 1; }
          55% { transform: translate(3%, 45%) rotate(10deg); opacity: 1; }
          100% { transform: translate(-3%, 135%) rotate(-8deg); opacity: 0.85; }
        }
        @keyframes car-drive {
          0% { transform: translateX(-135%); opacity: 0; }
          8% { opacity: 1; }
          100% { transform: translateX(135%); opacity: 1; }
        }
        @keyframes obj-appear {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .bg-arrow {
          position: absolute;
          top: ${BACKGROUND_IMAGE_BOUNDS.verticalCenter}%;
          transform: translateY(-50%);
          width: 26px; height: 26px;
          background: var(--brown);
          border: 1px solid var(--brown-deep);
          color: var(--cream);
          font-family: 'Press Start 2P', monospace;
          font-size: 10px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          z-index: 60;
        }
        .bg-arrow:hover { background: var(--brown-deep); }
        .bg-arrow.right { right: 4px; }

        .animation-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex-shrink: 0;
          max-height: 100%;
        }
        .location-strip {
          height: 20px;
          line-height: 20px;
          margin-top: 6px;
          font-family: 'Press Start 2P', monospace;
          font-size: 9px;
          color: var(--brown-deep);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }

        /* LetterModal is portaled straight into <body> (see below), so it's
           NOT a DOM descendant of .shell-root — CSS custom properties like
           var(--brown) don't inherit into it and silently resolve to
           nothing. That's the actual reason the close button read as
           invisible before: its background was transparent, not just
           poorly positioned. Colours below are literal hex for that reason. */
        .letter-modal {
          position: fixed;
          inset: 0;
          z-index: 35;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          pointer-events: none;
        }
        .letter-frame {
          position: relative;
          pointer-events: auto;
        }
        .letter-paper {
          box-sizing: border-box;
          width: min(85vw, 520px);
          max-height: 85vh;
          overflow-y: auto;
          padding: 32px 36px;
          background: #F4EBD6;
          border: 3px solid #5C3018;
          box-shadow: 6px 6px 0 rgba(0,0,0,0.35);
          color: #2B1F16;
          font-family: 'VT323', monospace;
          font-size: 22px;
          line-height: 1.35;
        }
        .letter-paper p { margin: 0 0 14px; }
        .letter-greeting { font-size: 26px; }
        .letter-closing { margin-top: 22px; margin-bottom: 4px; }
        .letter-signature { font-size: 26px; margin-bottom: 0; }
        .letter-close {
          position: absolute;
          top: -18px;
          right: -18px;
          width: 34px; height: 34px;
          background: #7A4426; color: #EFE6D3;
          border: 2px solid #5C3018;
          box-shadow: 3px 3px 0 rgba(0,0,0,0.35);
          font-family: 'Press Start 2P', monospace; font-size: 15px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          z-index: 1;
        }
        .letter-close:hover { background: #5C3018; }
      `}</style>

      {/* background: not automatic from the companion/finale — only the background stage sets this */}
      <FullLayer src={backgroundSrc} alt={`background-${c.background}`} z={0} />

      {/* companion enters, then moves closer during the love sequence */}
      <FullLayer src={companionSrc} alt="companion" z={5} />

      {/* hero: outfit -> shoes -> head -> accessories, all on the shared canvas */}
      <FullLayer src={c.outfit ? OUTFIT_ASSETS[c.outfit] : null} alt={`outfit-${c.outfit}`} z={10} />
      <FullLayer src={c.shoes ? SHOE_ASSETS[c.shoes] : null} alt={`shoes-${c.shoes}`} z={11} />
      <FullLayer src={HEAD_ASSET} alt="head" z={12} />
      {showHat && <FullLayer src={ACCESSORY_ASSETS["birthday-hat"]} alt="birthday hat" z={13} />}
      {showLaptop && <FullLayer src={ACCESSORY_ASSETS.laptop} alt="laptop" z={13} />}

      {/* persistent outfit/shoe click-to-cycle hit regions (visual only, no story/undo impact) */}
      <HitRegion region={OUTFIT_HIT_REGION} z={50} label="Cycle outfit" onClick={onCycleOutfit} />
      <HitRegion region={SHOE_HIT_REGION} z={50} label="Cycle shoes" onClick={onCycleShoes} />

      {/* dedicated hit-regions for hat/laptop — above the outfit hit-region, which their bboxes overlap */}
      {showHat && (
        <HitRegion
          region={HAT_HIT_REGION}
          z={55}
          label="Remove birthday hat"
          onClick={() => onHideAccessory?.("birthday-hat")}
        />
      )}
      {showLaptop && (
        <HitRegion
          region={LAPTOP_HIT_REGION}
          z={55}
          label="Remove laptop"
          onClick={() => onHideAccessory?.("laptop")}
        />
      )}

      {/* scene: SHOW_OBJECT effects — full-bleed, same shared canvas as everything else.
          confetti-burst falls and toy-car drives off-canvas (both clipped by overflow:hidden);
          dumbbell is a plain static appear; keyboard/dumbbell are removed from
          state a stage later (see terminal-test.jsx) */}
      {(c.objectsVisible || []).map((obj) => {
        const src = OBJECT_ASSETS[obj.id];
        if (!src) return null;
        const z = obj.id === "confetti-burst" ? 16 : 14;
        return (
          <FullLayer
            key={obj.id}
            src={src}
            alt={obj.id}
            z={z}
            className={`anim-${obj.animation || "appear"}`}
          />
        );
      })}

      {/* keyboard — clickable keys (+ A/S/D/F/G/H/J/K), simple Web Audio tones */}
      {showKeyboardKeys &&
        KEYBOARD_KEY_FREQUENCIES.map((freq, i) => (
          <button
            key={i}
            type="button"
            className="piano-key"
            aria-label={`Play note ${KEYBOARD_KEY_NOTE_NAMES[i]} (key ${KEYBOARD_KEY_LETTERS[i]})`}
            style={{ left: `${KEYBOARD_KEYS_REGION.left + i * keyWidth}%`, width: `${keyWidth}%` }}
            onClick={() => playKey(freq)}
          />
        ))}

      {/* love sequence heart bubble, alongside companion-closer */}
      {c.loveSequence && <FullLayer src={LOVE_SEQUENCE_ASSET} alt="love" z={20} />}

      {/* cake: appears lit after the birthday question, click blows it out */}
      {c.cakeState && <FullLayer src={CAKE_ASSETS[c.cakeState]} alt={`cake-${c.cakeState}`} z={25} />}
      {c.cakeState === "lit" && (
        <HitRegion region={CAKE_HIT_REGION} z={55} label="Blow out the candles" onClick={onBlowCake} />
      )}

      {/* finale: envelope — shared-canvas layer like everything else, pre-positioned
          by the PNG itself (naturally between the companion and the hero). Toggles the
          letter open/closed indefinitely once c.finale is true. */}
      {c.finale && envelopeArt === "closed" && (
        <FullLayer src={ENVELOPE_ASSETS.closed} alt="envelope closed" z={30} />
      )}
      {c.finale && envelopeArt === "open" && (
        <FullLayer src={ENVELOPE_ASSETS.open} alt="envelope open" z={30} />
      )}
      {c.finale && !letterOpen && (
        <HitRegion region={ENVELOPE_HIT_REGION} z={65} label="Open envelope" onClick={handleEnvelopeClick} />
      )}

      {/* background selector — right arrow only, cycles forward through the loop */}
      {showArrows && (
        <button
          type="button"
          className="bg-arrow right"
          aria-label="Next background"
          onClick={() => onCycleBackground?.(1)}
        >
          {">"}
        </button>
      )}

      {letterOpen && <LetterModal onClose={closeLetter} />}
      </div>
      {/* location label lives OUTSIDE the background image/canvas entirely, in its own strip */}
      {showArrows && <div className="location-strip">{BACKGROUND_LABELS[c.background]}</div>}
    </div>
  );
}
