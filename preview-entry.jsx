import React from "react";
import { createRoot } from "react-dom/client";
import TerminalTest from "./terminal-test.jsx";

// Preview-only mount point. Renders the existing Phase 2/3 component
// unmodified — no logic lives in this file.
createRoot(document.getElementById("root")).render(<TerminalTest />);
