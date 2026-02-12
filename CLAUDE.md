# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

THE TRAITORS is a multiplayer social deduction browser game (3-20 players) built with vanilla HTML/CSS/JavaScript and PeerJS for peer-to-peer WebRTC connectivity. No backend server — the host player acts as the authoritative game server.

## Development

No build system, package manager, or dependencies to install. The app is three files: `index.html`, `script.js`, `styles.css`, plus assets in `assets/`.

**Run locally:** Open `index.html` directly in a browser, or use any static file server (e.g., `python -m http.server 8000`).

**Multiplayer testing** requires multiple browser profiles or devices connecting to the same game code.

**No automated tests or linting** — all testing is manual in-browser.

**Deployment:** GitHub Pages from `main` branch (static files, no build step).

## Architecture

### Single-file game logic (`script.js`)

All game logic, networking, and UI management lives in `script.js` (~1400 lines). Key globals:

- `gameState` — single object holding all game state (player info, phase, votes, roles)
- `peer` — PeerJS instance for WebRTC
- `connections` — map of peer connections (host maintains connections to all players)

### Networking (P2P via PeerJS)

- **Star topology**: all players connect to the host; host relays messages
- Host creates a PeerJS peer using the 4-digit game code as its ID
- Joining players connect to that peer ID
- All communication is JSON messages with a `type` field routed through `handleMessage(data, conn)`
- Key message types: `join`, `gameStart`, `gameState`, `deliberationStart`, `vote`, `murderVote`, `playerEliminated`, `gameOver`, `stateSync`
- PeerJS loaded from CDN (unpkg.com), STUN servers are Google's public servers (hardcoded)

### Screen-based UI

UI is a set of full-screen divs toggled by `showScreen(screenId)`. Flow:

`welcomeScreen` → `nameScreen` → `hostSetupScreen`/`waitingRoomScreen` → `roleRevealScreen` → `gameScreen` → `deliberationScreen`/`murderVoteScreen` → `gameOverScreen`

### Game phases

`gameState.phase` transitions: `lobby` → `playing` → `deliberation` → `playing` → `gameOver`

Murder voting is enabled via a timer (10 minutes after deliberation). Traitors vote secretly; host reveals the result.

### State persistence

Game state is saved to `localStorage` (key: `traitorsGameState`) on every state change. On page reload, players see a reconnect prompt if a game was in progress.

### Role system

- Roles: `agent` (good) and `traitor` (bad)
- `assignRoles()` randomly distributes roles; traitor count is configurable by host
- Traitors see each other's identities; agents do not
- Eliminated players have their roles revealed

## Key Functions

- `hostGame()` / `joinGame(code)` — initialize as host or join existing game
- `initializePeer(id, callback)` — setup PeerJS with STUN config
- `handleMessage(data, conn)` — central message router
- `broadcastToAll(message)` — host sends to all connected players
- `assignRoles()` — random role distribution
- `saveGameState()` / `loadGameState()` — localStorage persistence
- `showScreen(screenId)` — UI screen transitions

## Styling (`styles.css`)

Mobile-first responsive design using CSS Grid and Flexbox. No CSS preprocessor or framework.

After every change, please update the version number in the html file.