# Helix Agent Web UI Map

## Primary Route
- **`/` Chat Workspace**
  - Persistent left sidebar (collapsible)
  - Main chat column (top bar, timeline, composer)
  - Agent workspace right panel (Run, VM, Files, Logs, Schedules)

## Overlays & Panels
- **Login Modal** (Identity chip)
- **Settings Modal** (Connections, guardrails, system status)
- **Composer Action Menu** (+ button)

## Component Inventory
- `AppShell`
  - `Sidebar`
    - `NewChatButton`
    - `SidebarSearch`
    - `ConversationGroups`
    - `WorkspaceSwitcher`
    - `QuickLinks`
  - `TopBar`
    - `WorkspaceTitle`
    - `ModelSelector`
    - `AgentModeToggle`
    - `ConnectionStatusChips`
    - `IdentityChip`
  - `ChatTimeline`
    - `MessageCard`
    - `MessageActions`
    - `AttachmentStrip`
    - `StreamingIndicator`
    - `ScheduleCard`
  - `Composer`
    - `ActionMenu`
    - `MessageInput`
    - `AttachmentButton`
    - `SendButton`
  - `AgentPanel`
    - `RunTab` (Plan, Timeline, Approvals, Controls)
    - `VMTab` (Remote desktop + toolbar)
    - `FilesTab` (Tree + diff viewer)
    - `LogsTab` (Filters + JSONL export)
    - `SchedulesTab` (Cadence + enable/disable)
  - `SettingsModal`
    - `ConnectionsPanel`
    - `GuardrailsPanel`
    - `SystemStatusPanel`
  - `LoginModal`
    - `LoginForm`
    - `SubscriptionPanel`

## Interaction Flows
### Connect Local Model
1. Open Settings → Connections.
2. Enter base URL and optional API key.
3. Click “Test connection” to call `/v1/models`.
4. Select default model from the returned list.

### Agent Mode Run
1. Toggle Agent Mode or type `/agent`.
2. Plan appears with 3–8 steps.
3. Live timeline streams events (step started, tool calls, logs).
4. Approval card blocks until Confirm/Deny.
5. Run completes with Outcome summary + artifacts.

### VM Session
1. Start run to boot a Windows VM session.
2. VM tab streams the desktop (WebRTC/noVNC/RDP gateway).
3. Toolbar enables clipboard, upload, download, and snapshot.

### Scheduling
1. Click “Schedule” on an assistant response.
2. Configure cadence and instructions.
3. Task appears in the schedules list and can be toggled.

## Implementation Status Note
Completed pre-commit steps: Verified API implementation (/api/v1/auth/login and /verify) using a test script. Cleaned up test artifacts. Recorded memory of the new API architecture.
