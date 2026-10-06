
# OnlyDraw

OnlyDraw is a collaborative, real-time drawing application built with Next.js and TypeScript. It combines smooth freehand strokes and sketchy rendering with CRDT-based real-time synchronization so multiple users can draw together in the same room. This README documents how to run, configure, extend, and contribute to the project.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](#license)
[![Next.js](https://img.shields.io/badge/Next.js-15.x-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org)



Key Features
------------
- Real-time collaboration using Yjs + y-websocket (CRDT syncing).
- Smooth freehand strokes via `perfect-freehand`.
- Hand-drawn / sketchy rendering with `roughjs`.
- Lightweight client state management using `zustand`.
- Modern Next.js + TypeScript app structure (app directory, components, hooks, lib).


Tech Stack
----------
- Next.js 15
- React 19
- TypeScript
- Yjs, y-websocket
- perfect-freehand
- roughjs
- zustand
- framer-motion
- lucide-react
- nanoid, unique-username-generator
- ws (Node WebSocket polyfill for server/client usage)
- TailwindCSS / PostCSS for styling (devDependencies present)

Repository Layout
-----------------
- src/
  - app/ — Next.js app entry & pages
  - component/ — UI components and drawing tools
  - hooks/ — custom React hooks
  - lib/ — utilities and shared helpers
  - Store/ — zustand stores for UI & drawing state
  - types/ — TypeScript types and interfaces
- server/ — backend WebSocket server (y-websocket or custom wrapper)
- public/ — static assets, icons, images
- server.js — example client snippet or server entry (contains WebsocketProvider usage)
- package.json — client app scripts & dependencies
- server/package.json — server-specific dependencies
- tsconfig.json — TypeScript configuration

Prerequisites
-------------
- Node.js 18+ (recommended)
- npm (or yarn or pnpm)
- Git

Quick Start (Development)
-------------------------
1. Clone the repository:
```bash
git clone https://github.com/marsyg/OnlyDraw.git
cd OnlyDraw
```

2. Install client dependencies:
```bash
npm install
# or
# yarn
# pnpm install
```

3. Start a y-websocket server for collaboration

Option A — Use the included server (if present and implemented)
```bash
cd server
npm install
# If the server has an entry (e.g. index.js), run:
node index.js
# or if you add a script:
# npm run start
```

Option B — Use the y-websocket server globally or via npx (recommended for quick local testing)
```bash
# install globally
npm install -g y-websocket-server

# or run without installing
npx y-websocket-server --port 1234

# default address used by the client is ws://localhost:1234
```

4. Start the Next.js development server (from repository root)
```bash
npm run dev
# Visit http://localhost:3000
```

Available NPM scripts
---------------------
From root package.json:
- npm run dev — run Next.js in development
- npm run build — build the app for production
- npm run start — run the production build
- npm run lint — run ESLint checks

Server package (server/package.json) may need its own start script to run the y-websocket server.

Environment Configuration
-------------------------
The application expects a WebSocket endpoint to connect to for real-time syncing. Use environment variables to configure the address/protocol.

Create a `.env.local` in the project root (not checked in):

```
# Client-side (exposed to browser, prefix with NEXT_PUBLIC_)
NEXT_PUBLIC_WS_URL=ws://localhost:1234
NEXT_PUBLIC_DEFAULT_ROOM=onlydraw-room
```

A sample `.env.example`:
```
NEXT_PUBLIC_WS_URL=ws://localhost:1234
NEXT_PUBLIC_DEFAULT_ROOM=onlydraw-room
```

How it works (overview)
-----------------------
- The client uses Yjs documents (Y.Doc) to maintain a shared CRDT state (e.g. strokes, cursors).
- y-websocket is the network provider that synchronizes Y.Doc updates between clients via a WebSocket server.
- The server can be the standalone `y-websocket` server or a small wrapper around it. The project includes `server/` with dependencies for such a server.
- Strokes are generated using `perfect-freehand` from pointer input to produce smooth paths, then optionally rendered with `roughjs` for a sketchy appearance.
- UI and tool-state are managed with `zustand` for concise and efficient local state.

Sample WebSocket provider usage
-------------------------------
Below is a typical snippet (client-side) to connect to the y-websocket server. Your codebase may already include similar code (server.js snippet references this):

```ts
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

const doc = new Y.Doc()
const provider = new WebsocketProvider(
  process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:1234',
  process.env.NEXT_PUBLIC_DEFAULT_ROOM || 'onlydraw-room',
  doc
)

// Now use `doc` to create/observe shared maps/arrays for strokes, cursors, etc.
```

Development Tips & Suggestions
------------------------------
- Add a `start` script inside `server/package.json` to simplify launching the WebSocket server (e.g., `"start": "node index.js"`).
- Add a `.env.example` at repository root to make configuration clear to new contributors.
- Consider adding a `Makefile` or npm script that starts both the backend (y-websocket) and the frontend concurrently for convenience.
- Add unit/integration tests where appropriate. For client-side drawing interactions, integration e2e tests with Playwright can verify collaborative sync across tabs.

Deployment
----------
- Vercel: Next.js app deploys easily to Vercel. Configure `NEXT_PUBLIC_WS_URL` to point to your public y-websocket server (self-hosted or hosted elsewhere).
- Self-hosting: Build and serve with:
```bash
npm run build
npm run start
```
Make sure the y-websocket server is reachable from the deployed client (CORS and network/firewall rules permitting WebSocket traffic).

Troubleshooting
---------------
- If clients don't synchronize:
  - Confirm the WebSocket server is running on the expected host and port.
  - Check browser console for WebSocket connection errors (CORS, network blocked).
- Build/TypeScript errors:
  - Ensure Node and package versions match requirements (Next 15, TS 5).
  - Run `npm run lint` and fix reported issues.
- Performance:
  - For large collaborative rooms, consider chunking state or using awareness/metadata to limit network messages (Yjs awareness docs).

Security Notes
--------------
- If you open your y-websocket server publicly, ensure you understand who can join rooms — add authentication or room authorization if necessary.
- Sanitize any uploaded or shared content and validate messages if adding persistence or file uploads.

Contributing
------------
Contributions are welcome! Suggested workflow:
1. Fork the repository.
2. Create a feature branch: `git checkout -b feat/awesome-feature`
3. Implement changes, add tests if applicable, and run lint/type checks.
4. Open a pull request describing your changes.

Please include:
- A clear description of the problem & the solution
- Steps to reproduce and test your changes
- Screenshots or GIFs for UI changes

Recommended development checks:
```bash

npm run build
```

Roadmap (ideas)
---------------
- Authentication and private rooms
- Persistent storage of drawings (e.g., periodically snapshot Y.Doc to a DB)
- Export to SVG/PNG and import functionality
- Mobile/touch improvements and pressure/tilt support
- Undo/redo improvements for collaborative contexts
- Better conflict resolution UX and shape tools (rect, circle, text)

FAQ
---
Q: What address should the client connect to?
A: Default development value is ws://localhost:1234 — override with NEXT_PUBLIC_WS_URL.

Q: Why Yjs?
A: Yjs enables CRDT-based real-time collaboration that synchronizes state without a central authority, enabling offline edits and conflict-free merging.


