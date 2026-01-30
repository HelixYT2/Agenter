# Artemis Web UI Map

## Primary Route
- **`/` Chat Workspace**
  - Persistent left sidebar (collapsible)
  - Main chat column (top bar, timeline, composer)
  - Agent workspace right panel (Run, VM, Files, Logs, Schedules)

## Portal Integration
- **Portal → Artemis**: portal CTA (“Open Artemis”) routes to Artemis with `?session=` handoff.
- **Artemis → Portal**: persistent “Back to Portal” link in header + sidebar.
- **SSO handoff**: Artemis exchanges `?session=` for JWT and cleans the URL.

## Overlays & Panels
- **Login Modal** (Identity chip)
- **Settings Modal** (Local Connector, guardrails, system status)
- **Composer Action Menu** (+ button)
- **Schedule Modal** (name, instructions, cadence)

## Component Inventory
- `AppShell`
  - `Sidebar`
    - `Brand`
    - `NewChatButton`
    - `SidebarSearch`
    - `ConversationGroups`
    - `WorkspaceSwitcher`
    - `QuickLinks`
    - `BackToPortal`
  - `TopBar`
    - `WorkspaceTitle`
    - `ModelSelector`
    - `AgentModeToggle`
    - `ConnectionStatusChips`
    - `PortalLink`
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
    - `FilesTab` (Tree + artifact downloads)
    - `LogsTab` (Filters + JSONL export)
    - `SchedulesTab` (Cadence + enable/disable)
  - `SettingsModal`
    - `LocalConnectorPanel`
    - `GuardrailsPanel`
    - `SystemStatusPanel`
  - `LoginModal`
    - `LoginForm`
    - `SubscriptionPanel`
  - `ScheduleModal`
    - `ScheduleForm`

## Interaction Flows
### Local Connector pairing
1. Open Settings → Local model connections.
2. Artemis displays “Local Model: Not detected” until the connector is paired.
3. Enter pairing code and click “Pair connector.”
4. Click “Test connector” and load `/v1/models`.

### Agent Mode Run
1. Toggle Agent Mode or type `/agent`.
2. Plan appears with 3–8 steps.
3. Live timeline streams events (step started, tool calls, logs).
4. Approval card blocks until Confirm/Deny.
5. Run completes with Outcome summary + artifacts.

### VM Session
1. Start run to boot a Windows VM session.
2. VM tab streams the desktop (WebRTC/noVNC/RDP gateway).
3. Toolbar enables clipboard, upload, download, and reset.

### Scheduling
1. Click “Schedule” on an assistant response.
2. Configure cadence and instructions in the modal.
3. Task appears in the schedules list and can be toggled.

## Implementation Status Note
Completed pre-commit steps: Verified API implementation (/api/v1/auth/login and /verify) using a test script. Cleaned up test artifacts. Recorded memory of the new API architecture.
