import React, { useState } from "react";
import helixLogo from "./assets/helix-logo.svg";

const activityItems = [
  "Booting secure runtime core...",
  "Syncing local operators and policies...",
  "Establishing encrypted workspace...",
  "Standing by for mission input."
];

const schedules = [
  { label: "Daily", desc: "Run the workflow every morning at 9:00." },
  { label: "Weekly", desc: "Summarize metrics every Friday afternoon." },
  { label: "Monthly", desc: "Generate the recurring report on the 1st." }
];

export default function App() {
  const [loginStarted, setLoginStarted] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);
  const loginUrl = "https://www.helixcorporation.org/login";

  const handleLogin = () => {
    window.open(loginUrl, "_blank", "noopener,noreferrer");
    setLoginStarted(true);
    setAccessGranted(false);
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img className="brand__logo" src={helixLogo} alt="Helix logo" />
          <div>
            <p className="brand__title">Helix Agent</p>
            <p className="brand__subtitle">Monochrome secure operations console</p>
          </div>
        </div>
        <div className="topbar__actions">
          <button className="ghost">System Status</button>
          <button className="primary">Launch Workspace</button>
        </div>
      </header>

      <main className="grid">
        <section className="card hero">
          <div className="hero__content">
            <h1>Orbit-ready autonomous operations.</h1>
            <p>
              A focused, monochrome interface inspired by the Helix mark. Keep your
              mission data contained, minimal, and fast to reach.
            </p>
            <div className="hero__actions">
              <button className="ghost">View Protocols</button>
              <button className="primary">Start Session</button>
            </div>
          </div>
          <div className="hero__logo">
            <img src={helixLogo} alt="Helix emblem" />
            <span>Helix Secure</span>
          </div>
        </section>

        <section className="card access">
          <div className="card__header">
            <h2>Access Gateway</h2>
            <div className="pill">Login</div>
          </div>
          <p className="muted">
            Authenticate via the Helix portal to unlock operational tools. Login opens
            in your default browser and returns you here to continue.
          </p>
          <div className="access__status">
            <strong>Status</strong>
            <span>
              {accessGranted
                ? "Access verified · Welcome back."
                : loginStarted
                ? "Awaiting login confirmation."
                : "Not authenticated."}
            </span>
          </div>
          <div className="access__actions">
            <button className="primary" onClick={handleLogin}>
              Login
            </button>
            <button
              className="ghost"
              onClick={() => setAccessGranted(true)}
              disabled={!loginStarted}
            >
              I&apos;ve logged in
            </button>
            <button className="ghost" disabled={!accessGranted}>
              Continue to Console
            </button>
          </div>
        </section>

        <section className="card tall">
          <div className="card__header">
            <h2>Agent Workspace</h2>
            <div className="pill ghost">Live</div>
          </div>
          <div className="workspace">
            <div className="workspace__viewer">
              <div className="viewer__toolbar">
                <span>Remote Browser</span>
                <div className="viewer__controls">
                  <button className="ghost">Pause</button>
                  <button className="ghost">Take Over</button>
                  <button className="ghost danger">Stop</button>
                </div>
              </div>
              <div className="viewer__preview">
                <p>Sandboxed VM output will render here.</p>
              </div>
            </div>
            <aside className="workspace__status">
              <h3>Activity</h3>
              <ul>
                {activityItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <div className="callout">
                <h4>Confirmations</h4>
                <p>
                  Agent mode pauses before high-impact actions. Sensitive inputs are
                  masked during takeover.
                </p>
              </div>
            </aside>
          </div>
        </section>

        <section className="card">
          <div className="card__header">
            <h2>Conversation</h2>
            <div className="pill ghost">/agent</div>
          </div>
          <div className="chat">
            <div className="chat__bubble agent">
              <p>Hi! Assign me a mission and I will handle the web, files, and tools.</p>
            </div>
            <div className="chat__bubble user">
              <p>Draft a research brief and schedule a weekly report.</p>
            </div>
          </div>
          <div className="composer">
            <input
              type="text"
              placeholder="Describe a task, or type /agent to begin..."
            />
            <button className="ghost">+</button>
            <button className="primary">Send</button>
          </div>
        </section>

        <section className="card">
          <div className="card__header">
            <h2>Local Models</h2>
            <div className="pill ghost">LM Studio</div>
          </div>
          <div className="stack">
            <label>
              API Base URL
              <input type="text" placeholder="http://localhost:1234/v1" />
            </label>
            <label>
              API Key
              <input type="password" placeholder="Paste your local model key" />
            </label>
            <label>
              Model Discovery
              <div className="inline">
                <button className="ghost">Locate Models</button>
                <button className="ghost">Connect</button>
              </div>
            </label>
          </div>
        </section>

        <section className="card">
          <div className="card__header">
            <h2>Sandboxed VM</h2>
            <div className="pill">Secured</div>
          </div>
          <div className="stack">
            <p className="muted">
              The agent runs in an isolated VM with restricted host access.
            </p>
            <div className="status">
              <div>
                <strong>VM Status</strong>
                <span>Idle · Awaiting tasks</span>
              </div>
              <button className="ghost">Configure VM</button>
            </div>
            <div className="status">
              <div>
                <strong>Guardrails</strong>
                <span>Confirmations, prompt-injection monitoring, watch mode</span>
              </div>
              <button className="ghost">Review Policies</button>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card__header">
            <h2>Automation</h2>
            <div className="pill ghost">Clock</div>
          </div>
          <div className="stack">
            {schedules.map((item) => (
              <div className="schedule" key={item.label}>
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.desc}</span>
                </div>
                <button className="ghost">Enable</button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
