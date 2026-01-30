# Artemis (Local AI Workspace)

Artemis is a web-first Local AI Workspace inspired by ChatGPT’s chat UI + Agent Mode UI. It runs in the browser and connects to a local model through a secure Local Connector, while orchestrating a Windows VM workspace for agent execution.

## Portal integration
Artemis is paired with a portal site (marketing + account). The portal links to Artemis via **Open Artemis**, and Artemis keeps a persistent **Back to Portal** link in its header and sidebar. A short-lived session handoff (`?session=`) can be exchanged for an Artemis JWT, and the URL is cleaned immediately after exchange.

## What is included
- Glassy “mission control” web UI with a chat plane + agent workspace plane.
- UI sections for:
  - Local Connector pairing + model list loading.
  - Agent run plans, approvals, live timeline, and artifacts.
  - Embedded VM panel with controls for files, logs, and downloads.
  - Scheduling UX and audit-ready log views.
- JWT auth integration with `/api/v1/auth/login` and `/api/v1/auth/verify`.

## Default connection mode
**Local Connector (default)**: Artemis calls a localhost connector that proxies LM Studio (`/v1/models`, `/v1/chat/completions`), adds CORS headers, and requires pairing. Localhost-first and remote inference remain optional modes.

## Getting started
```bash
npm install
npm run dev
```

## Documentation
- `docs/web-implementation-plan.md` — implementation blueprint, file structure, UI components, API contracts.
- `docs/ui-map.md` — UI map and interaction flows.
