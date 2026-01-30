# Helix Agent Web Implementation Blueprint

## Mission
Build a web-first “Local AI Workspace” that mirrors ChatGPT’s chat UI + Agent Mode UI, with a browser-based Windows VM workspace and a local LLM connector. The app runs as a website (no desktop `.exe`) while keeping the system modular for hosted or relay-based connectivity.

## Default Connection Mode
**Mode B: Localhost-first (default)**
- Serve the UI locally so it can safely call `http://127.0.0.1:1234/v1` without private-network/CORS restrictions.
- Users run a simple `npm run dev` (or a bundled `start-server` script) and open `http://localhost:PORT` in their browser.
- Keep Mode A (remote inference) and Mode C (local relay) pluggable via server configuration.

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
│  │  │  ├─ model-connector.ts
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
- **Sidebar**: new chat, search, conversation list, quick nav (Settings, Connections, Schedules, Audit Log, Account).
- **Top bar**: workspace name, model selector, Agent Mode toggle, connection status chips.
- **Three-region layout**: left sidebar, center chat, right agent workspace.

### Chat Plane
- **Message cards**: user right-aligned, assistant left-aligned.
- **Action bar**: Copy, Regenerate, Continue, Schedule, Export.
- **Attachments**: file chips + inline previews for images.
- **Streaming**: token-by-token with caret + Stop Generating.
- **Composer**: multi-line input, attachments, slash helper, mode-aware placeholder.

### Agent Workspace Plane
- **Run tab**: plan list, live timeline, approval cards, run controls, cost/compute meter.
- **VM tab**: embedded remote desktop (WebRTC/noVNC), toolbar (clipboard, upload/download, snapshot).
- **Files tab**: `/workspace` tree + diff viewer.
- **Logs tab**: structured logs, filters, JSONL export.
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

### Connections
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
- Local LLM connection setup + model list from `/v1/models`.
- Streaming chat with markdown + code blocks.
- Agent Mode plan + live timeline + approvals.
- VM session embedded + file/artifact export.
- Run outcome summary + scheduled re-run configuration.
- Audit log capturing all steps and tool usage.
