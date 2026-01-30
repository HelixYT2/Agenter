import React, { useEffect, useMemo, useState } from "react";
import helixLogo from "./assets/helix-logo.svg";

const statusLog =
  "Completed pre-commit steps: Verified API implementation (/api/v1/auth/login and /verify) using a test script. Cleaned up test artifacts. Recorded memory of the new API architecture.";

const chatHistory = {
  Today: ["Local LLM onboarding", "VM run: Docs build"],
  Yesterday: ["Agent run: QA sweep", "Model routing checks"],
  "Last 7 days": ["Workspace onboarding", "Local relay setup", "Audit review"]
};

const sidebarLinks = [
  "Settings",
  "Connections",
  "Schedules",
  "Audit Log",
  "Account"
];

const sampleMessages = [
  {
    id: "m1",
    role: "assistant",
    title: "Helix Agent ready",
    body: "I can plan and execute multi-step tasks in a secure Windows VM workspace.",
    detail:
      "Switch to Agent Mode to see the plan, live run stream, approvals, and deliverables.",
    sources: ["Workspace memory", "Runbook v2"],
    actions: ["Copy", "Regenerate", "Continue", "Schedule", "Export"]
  },
  {
    id: "m2",
    role: "user",
    body: "Connect to my local LM Studio server and generate a release checklist.",
    detail: "Use the default base URL and show the model list.",
    sources: [],
    actions: []
  },
  {
    id: "m3",
    role: "assistant",
    body: "Connection successful. Streaming draft checklist now…",
    detail:
      "Artifacts will include a PDF report, a markdown checklist, and a signed log bundle.",
    sources: ["LM Studio /v1/models", "Audit log"],
    actions: ["Copy", "Regenerate", "Continue", "Schedule", "Export"],
    streaming: true
  }
];

const agentPlan = [
  { id: 1, label: "Confirm permission profile", status: "done" },
  { id: 2, label: "Boot Windows VM workspace", status: "running" },
  { id: 3, label: "Connect to local model", status: "queued" },
  { id: 4, label: "Generate checklist + artifacts", status: "queued" },
  { id: 5, label: "Deliver outcome + schedule", status: "queued" }
];

const timeline = [
  {
    id: "t1",
    title: "Plan created",
    description: "5 steps queued · VM provisioning requested",
    status: "complete"
  },
  {
    id: "t2",
    title: "Step 2: Boot VM",
    description: "Spinning up Windows VM in us-east-1 · ETA 45s",
    status: "running"
  },
  {
    id: "t3",
    title: "Approval required",
    description: "Download signed build tools inside VM",
    status: "blocked"
  }
];

const files = [
  { id: "f1", name: "workspace/README.md", status: "modified" },
  { id: "f2", name: "workspace/checklists/release.md", status: "new" },
  { id: "f3", name: "workspace/output/report.pdf", status: "new" }
];

const schedules = [
  {
    id: "s1",
    name: "Nightly readiness sweep",
    cadence: "Daily · 9:00 PM",
    next: "Tonight · 9:00 PM",
    enabled: true
  },
  {
    id: "s2",
    name: "Weekly audit export",
    cadence: "Weekly · Fri 3:00 PM",
    next: "Friday · 3:00 PM",
    enabled: false
  }
];

const artifacts = [
  { id: "a1", name: "Release Checklist.pdf", meta: "212 KB" },
  { id: "a2", name: "Checklist.zip", meta: "1.4 MB" },
  { id: "a3", name: "Run logs.jsonl", meta: "89 KB" }
];

export default function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isAgentMode, setIsAgentMode] = useState(true);
  const [activeRightTab, setActiveRightTab] = useState("Run");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [conversationTitle, setConversationTitle] = useState("Local AI Workspace");
  const [authStatus, setAuthStatus] = useState("signedOut");
  const [authUser, setAuthUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [loginState, setLoginState] = useState({
    email: "",
    password: "",
    loading: false,
    error: ""
  });
  const [showScheduleCard, setShowScheduleCard] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("LM Studio (Local)");
  const [selectedModel, setSelectedModel] = useState("Qwen2.5 7B Instruct");
  const [connectionMode, setConnectionMode] = useState("Mode B: Localhost-first");

  useEffect(() => {
    const storedToken = window.localStorage.getItem("helix.jwt");
    if (storedToken) {
      setAuthToken(storedToken);
      verifyToken(storedToken);
    }
  }, []);

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoginState((prev) => ({ ...prev, loading: true, error: "" }));

    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginState.email,
          password: loginState.password
        })
      });

      if (!response.ok) {
        throw new Error("Login failed. Please check your credentials.");
      }

      const data = await response.json();
      const token = data?.token || data?.jwt || data?.accessToken;
      if (!token) {
        throw new Error("No token returned by the server.");
      }

      window.localStorage.setItem("helix.jwt", token);
      setAuthToken(token);
      await verifyToken(token);
      setShowLoginModal(false);
    } catch (error) {
      setLoginState((prev) => ({
        ...prev,
        error: error.message || "Login failed. Try again."
      }));
    } finally {
      setLoginState((prev) => ({ ...prev, loading: false }));
    }
  };

  const verifyToken = async (token) => {
    try {
      const response = await fetch("/api/v1/auth/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Verification failed.");
      }

      const data = await response.json();
      setAuthStatus("signedIn");
      setAuthUser(data?.user || data?.identity || { name: "Helix Operator" });
    } catch (error) {
      setAuthStatus("signedOut");
      setAuthUser(null);
      setAuthToken(null);
      window.localStorage.removeItem("helix.jwt");
    }
  };

  const handleLogout = () => {
    setAuthStatus("signedOut");
    setAuthUser(null);
    setAuthToken(null);
    window.localStorage.removeItem("helix.jwt");
  };

  const identityLabel =
    authStatus === "signedIn"
      ? `Signed in as ${authUser?.name || authUser?.email || "Operator"}`
      : "Signed out";

  const rightPanelTabs = useMemo(
    () => ["Run", "VM", "Files", "Logs", "Schedules"],
    []
  );

  const composerPlaceholder = isAgentMode
    ? "Describe a task. The agent can plan + execute in a VM."
    : "Message Helix Agent…";

  return (
    <div className="app-shell">
      <aside className={`sidebar ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <div className="sidebar__header">
          <button className="primary" type="button">
            New chat
          </button>
          <button
            className="ghost icon"
            type="button"
            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
          >
            {isSidebarCollapsed ? ">" : "<"}
          </button>
        </div>
        {!isSidebarCollapsed && (
          <div className="sidebar__content">
            <label className="search">
              <span>Search chats</span>
              <input type="text" placeholder="Search conversations" />
            </label>
            <div className="sidebar__section">
              {Object.entries(chatHistory).map(([group, items]) => (
                <div key={group} className="sidebar__group">
                  <p className="sidebar__label">{group}</p>
                  <ul>
                    {items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="sidebar__section">
              <p className="sidebar__label">Workspace</p>
              <ul>
                <li>Helix Agent</li>
                <li>Ops · Local AI</li>
              </ul>
            </div>
          </div>
        )}
        <div className="sidebar__footer">
          {sidebarLinks.map((item) => (
            <button
              key={item}
              className="ghost"
              type="button"
              onClick={() => setShowSettings(item === "Settings")}
            >
              {item}
            </button>
          ))}
          {authStatus === "signedIn" ? (
            <button className="ghost" type="button" onClick={handleLogout}>
              Logout
            </button>
          ) : (
            <button className="ghost" type="button" onClick={() => setShowLoginModal(true)}>
              Account
            </button>
          )}
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar__left">
            <img src={helixLogo} alt="Helix logo" className="topbar__logo" />
            <div>
              <input
                className="conversation-title"
                value={conversationTitle}
                onChange={(event) => setConversationTitle(event.target.value)}
              />
              <p className="breadcrumbs">Workspace · Helix Agent</p>
            </div>
          </div>
          <div className="topbar__right">
            <div className="chip">{selectedModel}</div>
            <div className="chip">{selectedProvider}</div>
            <button
              className={`chip agent-toggle ${isAgentMode ? "chip--on" : ""}`}
              type="button"
              onClick={() => setIsAgentMode((prev) => !prev)}
            >
              Agent Mode {isAgentMode ? "On" : "Off"}
            </button>
            <div className="chip chip--on">Local model: Connected</div>
            <div className="chip chip--on">VM: Running</div>
            <div
              className={`chip ${authStatus === "signedIn" ? "chip--on" : "chip--off"}`}
              onClick={() => setShowLoginModal(true)}
              role="button"
              tabIndex={0}
            >
              {identityLabel}
            </div>
            <button className="ghost icon" type="button">
              ⋯
            </button>
          </div>
        </header>

        <main className={`chat-layout ${isAgentMode ? "agent" : ""}`}>
          <section className="chat-timeline">
            {sampleMessages.map((message) => (
              <article
                key={message.id}
                className={`message ${message.role === "user" ? "user" : "assistant"}`}
              >
                <div className="message__header">
                  <span>{message.role === "user" ? "You" : "Helix"}</span>
                  {message.title && <span className="message__title">{message.title}</span>}
                </div>
                <p>{message.body}</p>
                {message.streaming && (
                  <div className="streaming">
                    <span className="caret" />
                    Streaming response…
                    <button className="ghost" type="button">
                      Stop generating
                    </button>
                  </div>
                )}
                {message.detail && (
                  <details>
                    <summary>Details</summary>
                    <p>{message.detail}</p>
                  </details>
                )}
                {message.sources.length > 0 && (
                  <div className="message__sources">
                    <span>Sources</span>
                    <ul>
                      {message.sources.map((source) => (
                        <li key={source}>{source}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {message.role === "assistant" && (
                  <div className="artifact-strip">
                    {artifacts.map((artifact) => (
                      <button key={artifact.id} className="ghost" type="button">
                        {artifact.name} · {artifact.meta}
                      </button>
                    ))}
                  </div>
                )}
                <div className="message__actions">
                  {message.actions.map((action) => (
                    <button
                      key={action}
                      className="ghost"
                      type="button"
                      onClick={() => action === "Schedule" && setShowScheduleCard((prev) => !prev)}
                    >
                      {action}
                    </button>
                  ))}
                </div>
                {showScheduleCard && message.role === "assistant" && (
                  <div className="schedule-card">
                    <h4>Schedule this run</h4>
                    <div className="schedule-card__options">
                      <button className="ghost" type="button">
                        Daily
                      </button>
                      <button className="ghost" type="button">
                        Weekly
                      </button>
                      <button className="ghost" type="button">
                        Monthly
                      </button>
                      <button className="ghost" type="button">
                        Custom
                      </button>
                    </div>
                    <label className="schedule-card__field">
                      Instructions
                      <input
                        type="text"
                        placeholder="Auto-filled from this run"
                        defaultValue="Generate the release checklist + artifacts."
                      />
                    </label>
                    <div className="schedule-card__footer">
                      <span>Next run: Tonight · 9:00 PM · Local time</span>
                      <button className="primary" type="button">
                        Save schedule
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </section>

          <section className="composer">
            <div className="composer__meta">
              <button
                className="ghost icon"
                type="button"
                onClick={() => setShowActionMenu((prev) => !prev)}
              >
                +
              </button>
              <span className="composer__mode">/agent shortcut available</span>
              {isAgentMode && <span className="composer__mode">Plan · Run · Approvals</span>}
            </div>
            {showActionMenu && (
              <div className="composer__menu">
                <button
                  className="ghost"
                  type="button"
                  onClick={() => {
                    setIsAgentMode((prev) => !prev);
                    setShowActionMenu(false);
                  }}
                >
                  {isAgentMode ? "Disable Agent Mode" : "Enable Agent Mode"}
                </button>
                <button className="ghost" type="button">
                  Attach files / add context
                </button>
                <button className="ghost" type="button">
                  Start run with approvals
                </button>
                <button className="ghost" type="button">
                  Schedule this prompt
                </button>
              </div>
            )}
            <textarea placeholder={composerPlaceholder} rows={3} defaultValue="" />
            <div className="composer__actions">
              <button className="ghost" type="button">
                Attach
              </button>
              <button className="ghost" type="button">
                Slash commands
              </button>
              <button className="primary" type="button">
                Send
              </button>
            </div>
          </section>

          {isAgentMode && (
            <aside className="right-panel">
              <div className="right-panel__tabs">
                {rightPanelTabs.map((tab) => (
                  <button
                    key={tab}
                    className={`ghost ${activeRightTab === tab ? "active" : ""}`}
                    type="button"
                    onClick={() => setActiveRightTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {activeRightTab === "Run" && (
                <div className="right-panel__content">
                  <div className="panel-section">
                    <h3>Plan</h3>
                    <ul className="plan">
                      {agentPlan.map((step) => (
                        <li key={step.id} className={`plan__step ${step.status}`}>
                          <span>{step.label}</span>
                          <span className="status-chip">{step.status}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="panel-section">
                    <h3>Live timeline</h3>
                    <ul className="timeline">
                      {timeline.map((item) => (
                        <li key={item.id} className={`timeline__item ${item.status}`}>
                          <strong>{item.title}</strong>
                          <span>{item.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="panel-section approval">
                    <h4>Waiting for approval</h4>
                    <p>Install build tools inside VM (high risk: executable download).</p>
                    <div className="approval__actions">
                      <button className="primary" type="button">
                        Confirm
                      </button>
                      <button className="ghost" type="button">
                        Deny
                      </button>
                      <button className="ghost" type="button">
                        Allow once
                      </button>
                    </div>
                  </div>
                  <div className="panel-section run-controls">
                    <button className="ghost" type="button">
                      Pause
                    </button>
                    <button className="ghost" type="button">
                      Stop
                    </button>
                    <button className="ghost" type="button">
                      Restart from step
                    </button>
                    <button className="ghost" type="button">
                      Export logs
                    </button>
                    <div className="meter">
                      <span>Tokens: 12.4k</span>
                      <span>VM time: 06:12</span>
                    </div>
                  </div>
                </div>
              )}

              {activeRightTab === "VM" && (
                <div className="right-panel__content">
                  <div className="vm-status">
                    <div>
                      <strong>VM Ready</strong>
                      <p>Windows 11 · us-east-1 · Session 24m</p>
                    </div>
                    <div className="vm-badge">Secure</div>
                  </div>
                  <div className="tool-frame">
                    Remote desktop stream (WebRTC/noVNC)
                  </div>
                  <div className="tool-actions">
                    <button className="ghost" type="button">
                      Capture input
                    </button>
                    <button className="ghost" type="button">
                      Screenshot
                    </button>
                    <button className="ghost" type="button">
                      Clipboard
                    </button>
                    <button className="ghost" type="button">
                      Upload to VM
                    </button>
                    <button className="ghost" type="button">
                      Download workspace
                    </button>
                  </div>
                </div>
              )}

              {activeRightTab === "Files" && (
                <div className="right-panel__content">
                  <div className="panel-section">
                    <h3>Workspace files</h3>
                    <ul className="file-list">
                      {files.map((file) => (
                        <li key={file.id}>
                          <span>{file.name}</span>
                          <span className="status-chip">{file.status}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="tool-frame">Diff viewer · /workspace/checklists/release.md</div>
                  <button className="ghost" type="button">
                    Open in editor
                  </button>
                </div>
              )}

              {activeRightTab === "Logs" && (
                <div className="right-panel__content">
                  <div className="panel-section">
                    <h3>Structured logs</h3>
                    <div className="log-filters">
                      <button className="ghost" type="button">
                        All steps
                      </button>
                      <button className="ghost" type="button">
                        Browser tool
                      </button>
                      <button className="ghost" type="button">
                        Terminal tool
                      </button>
                      <button className="ghost" type="button">
                        File ops
                      </button>
                    </div>
                    <div className="tool-frame">
                      run.created → plan.created → step.started → tool.called
                    </div>
                  </div>
                  <button className="ghost" type="button">
                    Export JSONL
                  </button>
                </div>
              )}

              {activeRightTab === "Schedules" && (
                <div className="right-panel__content">
                  <div className="panel-section">
                    <h3>Scheduled runs</h3>
                    <ul className="schedule-list">
                      {schedules.map((item) => (
                        <li key={item.id}>
                          <div>
                            <strong>{item.name}</strong>
                            <span>{item.cadence}</span>
                            <span>Next run: {item.next}</span>
                          </div>
                          <button className="ghost" type="button">
                            {item.enabled ? "Disable" : "Enable"}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button className="ghost" type="button">
                    Create schedule
                  </button>
                </div>
              )}
            </aside>
          )}
        </main>
      </div>

      {showSettings && (
        <div className="modal-overlay" role="presentation">
          <div className="modal">
            <header>
              <h2>Settings</h2>
              <button className="ghost" type="button" onClick={() => setShowSettings(false)}>
                Close
              </button>
            </header>
            <div className="modal__content">
              <section>
                <h3>Local model connections</h3>
                <label>
                  Connection mode
                  <select
                    value={connectionMode}
                    onChange={(event) => setConnectionMode(event.target.value)}
                  >
                    <option>Mode B: Localhost-first</option>
                    <option>Mode A: Remote inference</option>
                    <option>Mode C: Hosted UI + local relay</option>
                  </select>
                </label>
                <label>
                  Base URL
                  <input type="text" defaultValue="http://127.0.0.1:1234/v1" />
                </label>
                <label>
                  API key (optional)
                  <input type="password" placeholder="••••••••" />
                </label>
                <label>
                  Default model
                  <select
                    value={selectedModel}
                    onChange={(event) => setSelectedModel(event.target.value)}
                  >
                    <option>Qwen2.5 7B Instruct</option>
                    <option>Meta-Llama 3.1 8B</option>
                    <option>Mistral Small</option>
                  </select>
                </label>
                <div className="button-row">
                  <button className="ghost" type="button">
                    Test connection
                  </button>
                  <button className="ghost" type="button">
                    Load /v1/models
                  </button>
                </div>
                <p className="hint">
                  CORS note: Localhost-first avoids private network restrictions by serving the UI
                  locally.
                </p>
              </section>
              <section>
                <h3>Agent guardrails</h3>
                <div className="guardrails">
                  <p>Permission profile: Standard</p>
                  <p>Outbound network: Allowlisted only</p>
                  <p>Secrets: Encrypted at rest</p>
                </div>
              </section>
              <section>
                <h3>System status</h3>
                <div className="system-status">
                  <p>{statusLog}</p>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {showLoginModal && (
        <div className="modal-overlay" role="presentation">
          <div className="modal">
            <header>
              <h2>Sign in</h2>
              <button className="ghost" type="button" onClick={() => setShowLoginModal(false)}>
                Close
              </button>
            </header>
            <form className="modal__content" onSubmit={handleLogin}>
              <label>
                Email
                <input
                  type="email"
                  value={loginState.email}
                  onChange={(event) =>
                    setLoginState((prev) => ({ ...prev, email: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={loginState.password}
                  onChange={(event) =>
                    setLoginState((prev) => ({ ...prev, password: event.target.value }))
                  }
                  required
                />
              </label>
              {loginState.error && <p className="error">{loginState.error}</p>}
              <div className="modal__actions">
                <button className="primary" type="submit" disabled={loginState.loading}>
                  {loginState.loading ? "Signing in..." : "Sign in"}
                </button>
                <button className="ghost" type="button">
                  Continue with Google (soon)
                </button>
                <button className="ghost" type="button">
                  Passkeys (soon)
                </button>
              </div>
              {authStatus === "signedIn" && authUser && (
                <div className="account-panel">
                  <p>{identityLabel}</p>
                  <span>Subscription: Starter (placeholder)</span>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
