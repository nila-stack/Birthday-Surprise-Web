import React, { useState, useEffect } from "react";

/**
 * PHASE 1 — DESKTOP SHELL
 * -------------------------------------------------
 * Purpose: establish the visual environment only.
 * No game state, no terminal logic, no character logic yet.
 * Those arrive in Phase 2 (Terminal), Phase 3 (Character), Phase 4 (state machine).
 *
 * Everything here is either:
 *   - real chrome (top bar, window frame, control bar) — will stay mostly as-is
 *   - a clearly labeled placeholder — will be replaced once assets/logic land
 */

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap');`;

function useClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000 * 15);
    return () => clearInterval(id);
  }, []);
  const day = time.toLocaleDateString(undefined, { weekday: "short" });
  const date = time.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
  const hm = time.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${day} ${date}  ${hm}`;
}

function PixelFolderIcon() {
  return (
    <svg width="40" height="34" viewBox="0 0 40 34" style={{ imageRendering: "pixelated" }}>
      <rect x="0" y="4" width="16" height="4" fill="#8B4A2B" />
      <rect x="0" y="8" width="40" height="26" fill="#A85A34" />
      <rect x="0" y="8" width="40" height="4" fill="#C97A4A" />
    </svg>
  );
}

function PixelFileIcon() {
  return (
    <svg width="30" height="36" viewBox="0 0 30 36" style={{ imageRendering: "pixelated" }}>
      <rect x="0" y="0" width="30" height="36" fill="#F1EAD9" stroke="#C9BFA6" strokeWidth="2" />
      <rect x="18" y="0" width="12" height="10" fill="#C9BFA6" />
      <rect x="5" y="14" width="20" height="2" fill="#C9BFA6" />
      <rect x="5" y="19" width="20" height="2" fill="#C9BFA6" />
      <rect x="5" y="24" width="14" height="2" fill="#C9BFA6" />
    </svg>
  );
}

const DESKTOP_ITEMS = [
  { type: "folder", label: "album 1" },
  { type: "folder", label: "album 2" },
  { type: "folder", label: "album 3" },
  { type: "file", label: "about.txt" },
];

function DesktopIcon({ item }) {
  return (
    <button className="desktop-icon" title="Placeholder — not yet wired to anything">
      {item.type === "folder" ? <PixelFolderIcon /> : <PixelFileIcon />}
      <span>{item.label}</span>
    </button>
  );
}

function ControlButton({ letter, label }) {
  return (
    <button className="control-btn" disabled title="Wired up in Phase 12">
      <span className="control-key">{letter}</span>
      <span className="control-label">{label}</span>
    </button>
  );
}

export default function DesktopShell() {
  const clock = useClock();
  const [autoplay, setAutoplay] = useState(false);

  return (
    <div className="shell-root">
      <style>{`
        ${FONT_IMPORT}

        .shell-root {
          --cream: #EFE6D3;
          --cream-dark: #DDD0B4;
          --orange: #E2661F;
          --orange-deep: #C6520F;
          --terminal-bg: #17130F;
          --terminal-text: #E7DFC9;
          --brown: #7A4426;
          --brown-deep: #5C3018;
          --ink: #2B1F16;

          position: relative;
          width: 100%;
          min-height: 640px;
          background: var(--orange);
          background-image:
            radial-gradient(circle at 15% 10%, rgba(255,255,255,0.05), transparent 40%),
            radial-gradient(circle at 90% 90%, rgba(0,0,0,0.08), transparent 45%);
          font-family: 'VT323', monospace;
          color: var(--ink);
          overflow: hidden;
          border-radius: 4px;
          box-sizing: border-box;
        }
        .shell-root * { box-sizing: border-box; }

        /* ---------- TOP BAR ---------- */
        .top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--cream);
          border-bottom: 2px solid var(--brown-deep);
          padding: 6px 14px;
          font-size: 15px;
          letter-spacing: 0.5px;
        }
        .top-left { display: flex; align-items: center; gap: 18px; }
        .brand {
          width: 22px; height: 22px;
          background: var(--orange-deep);
          display: flex; align-items: center; justify-content: center;
          image-rendering: pixelated;
        }
        .brand span { color: var(--cream); font-size: 10px; font-family: 'Press Start 2P', monospace; }
        .menu-item { opacity: 0.75; cursor: default; }
        .top-right { display: flex; align-items: center; gap: 14px; font-size: 14px; opacity: 0.85; }

        /* ---------- DESKTOP AREA ---------- */
        .desktop-area {
          position: relative;
          display: flex;
          padding: 26px;
          gap: 26px;
          min-height: 520px;
        }

        .icon-column {
          display: flex;
          flex-direction: column;
          gap: 22px;
          width: 90px;
        }
        .desktop-icon {
          background: none;
          border: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          color: var(--cream);
          text-shadow: 1px 1px 0 rgba(0,0,0,0.35);
          font-size: 15px;
          padding: 4px;
        }
        .desktop-icon:hover { filter: brightness(1.1); }

        /* ---------- STAGE (terminal + character) ---------- */
        .stage {
          flex: 1;
          display: flex;
          align-items: flex-start;
          gap: 40px;
        }

        .terminal-window {
          flex: 1;
          max-width: 760px;
          background: var(--terminal-bg);
          border: 3px solid var(--cream-dark);
          box-shadow: 4px 4px 0 rgba(0,0,0,0.25);
        }
        .terminal-titlebar {
          background: var(--cream);
          border-bottom: 2px solid var(--brown-deep);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          font-size: 16px;
        }
        .terminal-title { display: flex; align-items: center; gap: 8px; }
        .dot { width: 8px; height: 8px; background: var(--orange-deep); }
        .titlebar-controls { display: flex; gap: 6px; }
        .tb-btn {
          width: 22px; height: 20px;
          background: var(--brown);
          color: var(--cream);
          display: flex; align-items: center; justify-content: center;
          font-size: 12px;
          border: 1px solid var(--brown-deep);
        }
        .tb-btn.close { background: var(--ink); }

        .terminal-body {
          padding: 18px 20px;
          min-height: 340px;
          color: var(--terminal-text);
          font-size: 18px;
          line-height: 1.5;
        }
        .terminal-placeholder {
          opacity: 0.55;
          font-style: italic;
        }
        .cursor-blink {
          display: inline-block;
          width: 9px; height: 16px;
          background: var(--terminal-text);
          margin-left: 4px;
          animation: blink 1s steps(1) infinite;
          vertical-align: middle;
        }
        @keyframes blink { 50% { opacity: 0; } }

        .character-slot {
          width: 220px;
          min-height: 340px;
          border: 2px dashed rgba(239,230,211,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: var(--cream);
          opacity: 0.7;
          font-size: 15px;
          padding: 16px;
        }

        /* ---------- BOTTOM CONTROL BAR ---------- */
        .bottom-bar {
          position: absolute;
          bottom: 22px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 10px;
          background: var(--cream);
          border: 2px solid var(--brown-deep);
          padding: 8px;
          box-shadow: 3px 3px 0 rgba(0,0,0,0.2);
        }
        .control-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          background: var(--brown);
          border: none;
          padding: 8px 14px;
          cursor: not-allowed;
          opacity: 0.55;
        }
        .control-key {
          color: var(--cream);
          font-family: 'Press Start 2P', monospace;
          font-size: 11px;
        }
        .control-label {
          color: var(--cream-dark);
          font-size: 12px;
          letter-spacing: 0.5px;
        }

        /* ---------- AUTOPLAY TOGGLE ---------- */
        .autoplay-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }
        .autoplay-track {
          width: 40px; height: 20px;
          background: var(--brown);
          border: 1px solid var(--brown-deep);
          position: relative;
        }
        .autoplay-thumb {
          position: absolute;
          top: 2px; left: 2px;
          width: 14px; height: 14px;
          background: var(--cream);
          transition: left 0.15s ease;
        }
        .autoplay-track.on { background: var(--orange-deep); }
        .autoplay-track.on .autoplay-thumb { left: 22px; }
      `}</style>

      {/* TOP BAR */}
      <div className="top-bar">
        <div className="top-left">
          <div className="brand"><span>&gt;_</span></div>
          <div className="menu-item">File</div>
          <div className="menu-item">View</div>
        </div>
        <div className="top-right">
          <div
            className="autoplay-toggle"
            onClick={() => setAutoplay((a) => !a)}
            title="Visual only — wired up in Phase 12"
          >
            <span>Autoplay</span>
            <div className={`autoplay-track ${autoplay ? "on" : ""}`}>
              <div className="autoplay-thumb" />
            </div>
          </div>
          <span>{clock}</span>
        </div>
      </div>

      {/* DESKTOP AREA */}
      <div className="desktop-area">
        <div className="icon-column">
          {DESKTOP_ITEMS.map((item) => (
            <DesktopIcon key={item.label} item={item} />
          ))}
        </div>

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
            <div className="terminal-body">
              <div className="terminal-placeholder">
                Terminal logic arrives in Phase 2.
                <span className="cursor-blink" />
              </div>
            </div>
          </div>

          <div className="character-slot">
            Boy character
            <br />
            (Phase 3)
          </div>
        </div>
      </div>

      {/* BOTTOM CONTROL BAR */}
      <div className="bottom-bar">
        <ControlButton letter="H" label="Help" />
        <ControlButton letter="U" label="Undo" />
        <ControlButton letter="R" label="Restart" />
      </div>
    </div>
  );
}
