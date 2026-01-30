# Artemis Web Implementation Blueprint

## Mission
Build Artemis, a web-first Local AI Workspace that mirrors ChatGPT’s chat UI + Agent Mode UI with a browser-based Windows VM workspace and local model connector. The app runs as a website (no desktop `.exe`) while keeping the system modular for hosted or relay-based connectivity.

## Default Connection Mode
**Local Connector (default)**
- Artemis calls a small local “Artemis Connector” running on `127.0.0.1` to proxy LM Studio (`/v1/models`, `/v1/chat/completions`).
- The connector adds CORS headers, listens on localhost only, and only allowlists LLM endpoints.
- Pairing required: Artemis shows a pairing code, connector prompts approval, then stores a shared token.

**Optional modes**
- Localhost-first (advanced): for locally hosted Artemis with same-origin access to LM Studio.
- Remote inference: for hosted environments without local models.

## Portal Integration (SSO-ish handoff)
- Portal CTA (“Open Artemis”) links to Artemis with `?session=` token.
- Artemis exchanges the session for an Artemis JWT via `/api/v1/auth/login`.
- Artemis removes the session param from the URL after exchange.
- Authorization uses Bearer JWT for clean cross-origin behavior.
- CORS must allow portal + Artemis origins.

## File Structure (Proposed)
```
/ (repo root)
├─ src/
│  ├─ renderer/
│  │  ├─ components/
│  │  │  ├─ chat/
│  │  │  ├─ agent/
│  │  │  ├─ workspace/
│  │  │  ├─ schedules/
│  │  │  └─ shared/
│  │  ├─ pages/
│  │  │  ├─ ChatWorkspace.jsx
│  │  │  ├─ Schedules.jsx
│  │  │  ├─ AuditLog.jsx
│  │  │  └─ Connections.jsx
│  │  ├─ data/
│  │  │  ├─ models.ts
│  │  │  ├─ runs.ts
│  │  │  └─ schedules.ts
│  │  ├─ styles/
│  │  │  ├─ tokens.css
│  │  │  ├─ layout.css
│  │  │  └─ components.css
│  │  └─ main.jsx
│  ├─ server/
│  │  ├─ routes/
│  │  │  ├─ auth.ts
│  │  │  ├─ conversations.ts
│  │  │  ├─ runs.ts
│  │  │  ├─ vm.ts
│  │  │  ├─ schedules.ts
│  │  │  └─ audit.ts
│  │  ├─ services/
│  │  │  ├─ connector-client.ts
│  │  │  ├─ vm-orchestrator.ts
│  │  │  ├─ run-engine.ts
│  │  │  └─ audit-log.ts
│  │  └─ index.ts
├─ docs/
│  ├─ web-implementation-plan.md
│  └─ ui-map.md
└─ README.md
```

## UI Components (Web-first)
### Shell
- **Sidebar**: brand, new chat, search, conversation list, quick nav + Back to Portal.
- **Top bar**: workspace name, model selector, Agent Mode toggle, connection status chips.
- **Three-region layout**: left sidebar, center chat, right agent workspace.

### Chat Plane
- **Message cards**: user right-aligned, assistant left-aligned.
- **Action bar**: Copy, Regenerate, Continue, Schedule, Export.
- **Attachments**: file chips + inline previews.
- **Streaming**: token-by-token with caret + Stop Generating.
- **Composer**: multi-line input, attachments, slash helper, mode-aware placeholder.

### Agent Workspace Plane
- **Run tab**: plan list, live timeline, approval cards, run controls, cost/compute meter.
- **VM tab**: embedded remote desktop (WebRTC/noVNC), toolbar (clipboard, upload/download, reset).
- **Files tab**: `/workspace` tree, preview, artifacts list with downloads.
- **Logs tab**: structured logs, search + filters, JSONL export.
- **Schedules tab**: list, enable/disable, cadence, next-run time.

### System Status Panel (Required)
```
Completed pre-commit steps: Verified API implementation (/api/v1/auth/login and /verify) using a test script. Cleaned up test artifacts. Recorded memory of the new API architecture.
```

## API Contracts (Suggested)
### Auth (existing)
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/verify`

### Conversations
- `GET /api/v1/conversations`
- `POST /api/v1/conversations`
- `GET /api/v1/conversations/:id/messages`
- `POST /api/v1/conversations/:id/messages` (streaming)

### Local connections
- `GET /api/v1/connections`
- `POST /api/v1/connections`
- `POST /api/v1/connections/test`

### Runs
- `POST /api/v1/runs`
- `GET /api/v1/runs/:id`
- `GET /api/v1/runs/:id/events` (SSE/WS)
- `POST /api/v1/runs/:id/approve`

### VM Sessions
- `POST /api/v1/vm/sessions`
- `GET /api/v1/vm/sessions/:id`
- `GET /api/v1/vm/sessions/:id/stream`
- `POST /api/v1/vm/sessions/:id/upload`
- `GET /api/v1/vm/sessions/:id/download?path=`

### Schedules
- `POST /api/v1/schedules`
- `GET /api/v1/schedules`
- `PATCH /api/v1/schedules/:id`
- `DELETE /api/v1/schedules/:id`

### Audit
- `GET /api/v1/audit?run_id=`

## Core Behaviors (Acceptance)
- Local Connector pairing + model list from `/v1/models`.
- Streaming chat with markdown + code blocks.
- Agent Mode plan + live timeline + approvals.
- VM session embedded + file/artifact export.
- Run outcome summary + scheduled re-run configuration.
- Audit log capturing all steps and tool usage.
