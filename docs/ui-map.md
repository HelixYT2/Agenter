# Artemis (Helix Agent) Chat-First UI Map

## UI Map (Routes, Screens, Panels)

### Primary Route
- **`/` Chat Workspace**
  - Persistent left sidebar (collapsible)
  - Main chat column (top bar, timeline, composer)
  - Contextual right panel (Agent Mode or tool/canvas usage)

### Overlays & Panels
- **Login Modal** (Identity chip)
- **Settings Modal** (Providers + Tasks management)
- **Composer Action Menu** (+ button)
- **Right Panel Tabs** (Run Log, Confirmations, Tools, Canvas)

### Settings Subviews (Modal sections)
- Providers (model selection, API key, test connection)
- Tasks (list, pause/delete, create new task)

## Component List (Exact)
- `AppShell`
  - `Sidebar`
    - `NewChatButton`
    - `SidebarSearch`
    - `ChatHistoryGroup`
    - `ProjectsList`
    - `SidebarFooter`
  - `TopBar`
    - `ConversationTitleInput`
    - `Breadcrumbs`
    - `ModelSelectorChip`
    - `IdentityChip`
    - `AgentModeChip`
    - `SystemStatusChip`
    - `OverflowMenu`
  - `ChatTimeline`
    - `MessageBubble`
    - `MessageActions`
    - `MessageDetails`
    - `MessageSources`
    - `ScheduleCard`
  - `Composer`
    - `ActionMenu`
    - `ModeIndicator`
    - `MessageInput`
    - `AttachmentButton`
    - `SendButton`
  - `RightPanel`
    - `RunLog`
    - `Confirmations`
    - `ToolWorkspaceTabs`
    - `CanvasEditor`
  - `SettingsModal`
    - `ProvidersPanel`
    - `TasksPanel`
  - `LoginModal`
    - `LoginForm`
    - `SubscriptionPanel`

## Interaction Flows

### Normal Chat Flow
1. User selects or creates a chat from the sidebar.
2. User types in composer and sends message.
3. Assistant responds with optional Details/Sources.
4. User can copy/regenerate/save to project.

### Enable Agent Mode via Composer “+”
1. User opens composer action menu via “+”.
2. Selects “Enable Agent mode”.
3. Agent mode chip appears in top bar.
4. Right panel opens with Run Log + Confirmations + Tools tabs.

### Agent Run, Pause, Confirm/Deny, Takeover, Resume
1. Agent run log shows queued/running/completed steps.
2. Confirmations panel surfaces high-impact action.
3. User clicks Confirm or Deny.
4. Browser tool tab shows live session.
5. User selects “Take Over” to pause the agent.
6. “Resume Agent” returns control to the agent.

### Login Flow (/api/v1/auth/login + /verify)
1. User clicks Identity chip when signed out.
2. Login modal collects email + password.
3. Submit POST `/api/v1/auth/login`.
4. Store returned JWT securely.
5. POST `/api/v1/auth/verify` with JWT.
6. Update identity chip to “Signed in as …” with logout.
7. Show placeholder subscription status panel.

### Schedule Task from Message
1. User clicks “Schedule” on assistant message.
2. Schedule card prompts one-time/recurring.
3. User confirms schedule.
4. Confirmation card appears in chat.
5. Task is listed in Settings → Tasks.

## Implementation Plan (Phased Rollout)

### Phase 1: Chat-First Layout (Minimal Refactor)
- Replace dashboard tiles with chat timeline + sidebar.
- Add top bar chips and composer action menu.
- Keep existing content as message samples.

### Phase 2: Agent Mode Right Panel
- Add Run Log, Confirmations, Tools, Canvas tabs.
- Introduce takeover/resume UX and guardrails indicators.

### Phase 3: Auth Integration
- Implement login modal calling `/api/v1/auth/login` and `/api/v1/auth/verify`.
- Store JWT securely and hydrate identity chip.
- Add logout handling and subscription placeholder.

### Phase 4: Tasks + Providers
- Implement task scheduling UI and Settings → Tasks list.
- Add Providers panel and connection test UI.

## Implementation Status Note
Completed pre-commit steps: Verified API implementation (/api/v1/auth/login and /verify) using a test script. Cleaned up test artifacts. Recorded memory of the new API architecture.
