// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/// <reference types="vite/client" />

import type { AgentSurface } from '@bunyan/document';

declare global {
  interface Window {
    /**
     * The agent surface (D22) — `createAgentSurface(doc)`. Ships with the app, zero install. Wired by
     * App on the surviving mount (never inside `bootstrap()` — StrictMode's discarded first app would
     * race its dead document onto the global). Everything the UI can do goes through the same command
     * layer this exposes (D19).
     */
    bunyan?: AgentSurface;
  }
}

export {};
