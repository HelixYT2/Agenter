# Helix Agent (Local AI Workspace)

This repository is a starter scaffold for a local Agent AI desktop application. It focuses on the user interface and packaging flow so you can build a Windows `.exe` via Electron.

## What is included
- Glassy “mission control” UI inspired by agent mode.
- UI sections for:
  - Agent workspace with remote browser preview, activity feed, and controls.
  - Chat/composer with `/agent` affordance.
  - Local model configuration (LM Studio base URL + key).
  - Sandboxed VM status and guardrails.
  - Automation scheduling cards.
- Electron shell with Vite + React renderer.

## Getting started
```bash
npm install
npm run electron:dev
```

## Build a Windows `.exe`
```bash
npm run electron:build
```
This uses `electron-builder` with the `nsis` target to generate a Windows installer `.exe`.

## Next steps
- Implement VM orchestration (e.g., Hyper-V/WSL2 virtualization hooks).
- Connect to LM Studio or other local inference servers.
- Add agent runtime, tool execution, and permissions gating.
- Replace placeholder activity feed with real events.
