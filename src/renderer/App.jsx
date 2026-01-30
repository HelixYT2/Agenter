import React, { useEffect, useMemo, useState } from "react";
import helixLogo from "./assets/helix-logo.svg";

const chatHistory = {
  Today: ["Launch plan for Artemis", "Model routing checks"],
  Yesterday: ["Weekly ops briefing", "Helix portal QA"],
  "Last 7 days": ["Sandbox VM regression", "Agent runbooks", "Research drafts"]
};

const sampleMessages = [
  {
    id: "m1",
    role: "assistant",
    title: "Artemis update",
    body: "Hello! I can orchestrate web, files, and tools. What should we tackle today?",
    detail:
      "I can switch into Agent Mode to run multi-step tasks and show my tool activity in the right panel.",
    sources: ["Internal runbook", "Project memory"]
  },
  {
    id: "m2",
    role: "user",
    body: "Prepare a system readiness report and schedule a nightly automation.",
    detail: "Include VM health, model uptime, and a summary of changes.",
    sources: []
  },
  {
    id: "m3",
    role: "assistant",
    body: "On it. I will draft a report and set up the recurring task once you confirm.",
    detail:
      "Next steps: generate a report draft, review with you, then schedule a nightly task.",
    sources: ["Telemetry snapshot", "Audit logs"]
  }
];

const runLog = [
  { id: 1, label: "Collect runtime telemetry", status: "completed" },
  { id: 2, label: "Analyze VM health metrics", status: "running" },
  { id: 3, label: "Draft report summary", status: "queued" }
];

const tasks = [
  {
    id: "t1",
    name: "Nightly readiness report",
    cadence: "Every day · 9:00 PM",
    status: "Active"
  },
  {
    id: "t2",
    name: "Weekly model audit",
    cadence: "Fridays · 3:00 PM",
    status: "Paused"
  }
];

const toolTabs = ["Browser", "Terminal", "Files", "Outputs", "Canvas"];

export default function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isAgentMode, setIsAgentMode] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState("Run Log");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [composerMode, setComposerMode] = useState("Normal Chat");
  const [conversationTitle, setConversationTitle] = useState("Artemis Readiness");
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
  const [selectedProvider, setSelectedProvider] = useState("Artemis Core");

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
      setAuthUser(data?.user || data?.identity || { name: "Artemis Operator" });
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

  const rightPanelTabs = useMemo(() => {
    if (!isAgentMode) {
      return ["Providers", "Tasks", "Canvas"];
    }
    return ["Run Log", "Confirmations", "Tools", "Canvas"];
  }, [isAgentMode]);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <div className="sidebar__header">
          <button className="primary" type="button">
            New Chat
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
              <p className="sidebar__label">Projects</p>
              <ul>
                <li>Helix Core</li>
                <li>Artemis Ops</li>
              </ul>
            </div>
          </div>
        )}
        <div className="sidebar__footer">
          <button className="ghost" type="button" onClick={() => setShowSettings(true)}>
            Settings
          </button>
          <button className="ghost" type="button">
            Help
          </button>
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
              <p className="breadcrumbs">Projects / Artemis Ops</p>
            </div>
          </div>
          <div className="topbar__right">
            <div className="chip">{selectedProvider}</div>
            <div
              className={`chip ${authStatus === "signedIn" ? "chip--on" : "chip--off"}`}
              onClick={() => setShowLoginModal(true)}
              role="button"
              tabIndex={0}
            >
              {identityLabel}
            </div>
            {isAgentMode && <div className="chip chip--on">Agent: On</div>}
            <div className="chip">Tools Ready</div>
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
                  <span>{message.role === "user" ? "You" : "Artemis"}</span>
                  {message.title && <span className="message__title">{message.title}</span>}
                </div>
                <p>{message.body}</p>
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
                <div className="message__actions">
                  <button className="ghost" type="button">
                    Copy
                  </button>
                  <button className="ghost" type="button">
                    Regenerate
                  </button>
                  <button className="ghost" type="button">
                    Continue
                  </button>
                  <button className="ghost" type="button">
                    Report
                  </button>
                  <button className="ghost" type="button">
                    Save to Project
                  </button>
                  {message.role === "assistant" && (
                    <button
                      className="ghost"
                      type="button"
                      onClick={() => setShowScheduleCard((prev) => !prev)}
                    >
                      Schedule
                    </button>
                  )}
                </div>
                {showScheduleCard && message.role === "assistant" && (
                  <div className="schedule-card">
                    <h4>Schedule this response</h4>
                    <div className="schedule-card__options">
                      <button className="ghost" type="button">
                        One-time
                      </button>
                      <button className="ghost" type="button">
                        Recurring
                      </button>
                    </div>
                    <div className="schedule-card__footer">
                      <span>Nightly at 9:00 PM · UTC-5</span>
                      <button className="primary" type="button">
                        Confirm Schedule
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
              <span className="composer__mode">Mode: {composerMode}</span>
              {isAgentMode && <span className="composer__mode">Plan · Run</span>}
            </div>
            {showActionMenu && (
              <div className="composer__menu">
                <button
                  className="ghost"
                  type="button"
                  onClick={() => {
                    setIsAgentMode((prev) => !prev);
                    setComposerMode((prev) => (prev === "Agent Mode" ? "Normal Chat" : "Agent Mode"));
                    setShowActionMenu(false);
                  }}
                >
                  {isAgentMode ? "Disable Agent mode" : "Enable Agent mode"}
                </button>
                <button className="ghost" type="button">
                  Use tools (Browser, Terminal, Files)
                </button>
                <button className="ghost" type="button">
                  Deep Research-style
                </button>
                <button className="ghost" type="button">
                  Schedule as task
                </button>
                <button className="ghost" type="button">
                  Upload file / Add context
                </button>
              </div>
            )}
            <textarea
              placeholder="Message Artemis..."
              rows={3}
              defaultValue=""
            />
            <div className="composer__actions">
              <button className="ghost" type="button">
                Attach
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

              {activeRightTab === "Run Log" && (
                <div className="right-panel__content">
                  <h3>Activity Stream</h3>
                  <ul className="run-log">
                    {runLog.map((step) => (
                      <li key={step.id} className={`run-log__item ${step.status}`}>
                        <span>{step.label}</span>
                        <span>{step.status}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="guardrails">
                    <h4>Guardrails</h4>
                    <p>Watch Mode enabled · Prompt injection warnings active</p>
                    <button className="ghost" type="button">
                      Take Over
                    </button>
                    <button className="ghost" type="button">
                      Resume Agent
                    </button>
                  </div>
                </div>
              )}

              {activeRightTab === "Confirmations" && (
                <div className="right-panel__content">
                  <h3>Confirmations</h3>
                  <p>High-impact actions require approval.</p>
                  <div className="confirmation">
                    <span>Send nightly report to exec list?</span>
                    <div>
                      <button className="primary" type="button">
                        Confirm
                      </button>
                      <button className="ghost" type="button">
                        Deny
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeRightTab === "Tools" && (
                <div className="right-panel__content">
                  <div className="tool-tabs">
                    {toolTabs.map((tab) => (
                      <button key={tab} className="ghost" type="button">
                        {tab}
                      </button>
                    ))}
                  </div>
                  <div className="tool-frame">
                    <p>Browser/terminal/file outputs will appear here.</p>
                  </div>
                </div>
              )}

              {activeRightTab === "Canvas" && (
                <div className="right-panel__content">
                  <h3>Canvas Editor</h3>
                  <p>Drafts and multi-file edits appear here with version history.</p>
                  <div className="tool-frame">Canvas preview</div>
                  <div className="tool-actions">
                    <button className="primary" type="button">
                      Apply changes
                    </button>
                    <button className="ghost" type="button">
                      Export
                    </button>
                  </div>
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
                <h3>Providers</h3>
                <label>
                  Provider
                  <select
                    value={selectedProvider}
                    onChange={(event) => setSelectedProvider(event.target.value)}
                  >
                    <option>Artemis Core</option>
                    <option>Groq</option>
                    <option>LM Studio</option>
                  </select>
                </label>
                <label>
                  API Key
                  <input type="password" placeholder="••••••••" />
                </label>
                <button className="ghost" type="button">
                  Test connection
                </button>
              </section>
              <section>
                <h3>Tasks</h3>
                <ul className="tasks">
                  {tasks.map((task) => (
                    <li key={task.id}>
                      <div>
                        <strong>{task.name}</strong>
                        <span>{task.cadence}</span>
                      </div>
                      <span className="chip">{task.status}</span>
                    </li>
                  ))}
                </ul>
                <button className="ghost" type="button">
                  Create new task
                </button>
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
