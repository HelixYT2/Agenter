# Helix Agent (Local AI Workspace)

This repository is a web-first scaffold for a Local AI Workspace inspired by ChatGPT’s chat UI + Agent Mode UI. It runs entirely in the browser and connects to a local OpenAI-compatible model server (LM Studio) while orchestrating a Windows VM workspace for agent execution.

## What is included
- Glassy “mission control” web UI with a chat plane + agent workspace plane.
- UI sections for:
  - Local model connection management (LM Studio base URL + model list).
  - Agent run plans, approvals, and live timeline.
  - Embedded VM panel with controls for files, logs, and downloads.
  - Scheduling UX and audit-ready log views.
- JWT auth integration with `/api/v1/auth/login` and `/api/v1/auth/verify`.

## Default connection mode
**Mode B (Localhost-first)**: run the UI locally so it can safely call `http://127.0.0.1:1234/v1` without browser private-network restrictions. Mode A (remote inference) and Mode C (local relay) remain pluggable.

## Getting started
```bash
npm install
npm run dev
```

## Documentation
- `docs/web-implementation-plan.md` — full implementation plan, file structure, UI components, and API contracts.
- `docs/ui-map.md` — UI map and interaction flows.
