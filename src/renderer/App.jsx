import React from "react";

const activityItems = [
  "Booting sandboxed VM profile...",
  "Connecting to local models from LM Studio...",
  "Launching secure browser session...",
  "Ready to accept tasks."
];

const schedules = [
  { label: "Daily", desc: "Run the workflow every morning at 9:00." },
  { label: "Weekly", desc: "Summarize metrics every Friday afternoon." },
  { label: "Monthly", desc: "Generate the recurring report on the 1st." }
];

export default function App() {
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand__orb" />
          <div>
            <p className="brand__title">Helix Agent</p>
            <p className="brand__subtitle">Local-first autonomous workspace</p>
          </div>
        </div>
        <div className="topbar__actions">
          <button className="ghost">Docs</button>
          <button className="primary">Start Agent Mode</button>
        </div>
      </header>

      <main className="grid">
        <section className="card tall">
          <div className="card__header">
            <h2>Agent Workspace</h2>
            <div className="pill">Live</div>
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
            <div className="pill">LM Studio</div>
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
