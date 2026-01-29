# Helix Agent (Local AI Workspace)

Helix Agent is a local-first desktop app that blends a standard chat experience with an embedded Agent Mode. Chat normally with your local model, or toggle Agent Mode inside the same conversation to plan and execute multi-step tasks inside a sandboxed VM.

## What is included
- Chat-first UI with sidebar, projects, schedules, settings, and conversation list.
- Agent Mode run panel with live status, activity feed, confirmations, and tool output placeholders.
- LM Studio connection testing, model discovery, and streaming chat requests.
- Local schedules stored in JSON via local storage.
- VM control schema and guardrails as JSON for future tool execution.
- Electron + Vite + React build setup for Windows `.exe` packaging.

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

## How to use
1. **Connect LM Studio:** Open Settings → Local Models, set the base URL (default `http://127.0.0.1:1234`), and click **Test Connection**.
2. **Start a normal chat:** Select a model in the header and send a message; responses stream into the chat.
3. **Toggle Agent Mode:** Click `/agent` or enable the Agent Mode toggle, then send a task request.
4. **Confirm or deny steps:** When a step requires confirmation, use the Confirm/Deny buttons in the run panel.
5. **Schedule a run:** Use **Schedule** on any assistant message and pick a cadence; manage schedules in the sidebar.

## Acceptance checks
- Connection test works against LM Studio base URL.
- Model list loads via `/v1/models`.
- Chat sends and streams responses via `/v1/chat/completions`.
- Agent Mode creates a plan and emits run events, pausing on confirmations.
- `npm run electron:build` produces a Windows installer `.exe` that launches without a blank window.

## Next steps
- Replace agent step mocks with real VM control and tool execution.
- Persist schedules and projects to disk (instead of local storage).
- Add real browser/shell/file outputs from the sandboxed VM.
