import React, { useEffect, useMemo, useRef, useState } from "react";
import { renderMarkdown } from "./lib/markdown.js";
import { loadState, saveState } from "./lib/storage.js";
import { fetchModels, streamChatCompletion, testConnection } from "./lib/lmStudio.js";
import { createAgentRunner, requestPlan } from "./lib/agentRunner.js";
import vmProfile from "./data/vmProfile.json";

const createId = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

const defaultState = {
  settings: {
    baseUrl: "http://127.0.0.1:1234",
    apiKey: ""
  },
  projects: [
    {
      id: "project-default",
      name: "Personal",
      description: "Default workspace",
      systemInstructions: "You are a helpful local assistant.",
      defaultModel: "",
      fileContext: []
    }
  ],
  chats: [
    {
      id: "chat-welcome",
      title: "Welcome",
      projectId: "project-default",
      model: "",
      messages: [
        {
          id: "msg-welcome",
          role: "assistant",
          content: "Welcome to Helix Agent. Ask anything, or toggle Agent Mode to run a multi-step task.",
          createdAt: Date.now()
        }
      ]
    }
  ],
  schedules: [],
  selectedChatId: "chat-welcome",
  selectedProjectId: "project-default"
};

const createEventBus = () => {
  const listeners = new Set();
  return {
    emit: (event) => {
      listeners.forEach((listener) => listener(event));
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
};

const scheduleOptions = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "custom", label: "Custom" }
];

const toolSections = ["Browser", "Shell", "Files", "Network"];

export default function App() {
  const [state, setState] = useState(() => {
    const loaded = loadState();
    if (!loaded) {
      return defaultState;
    }
    return {
      ...defaultState,
      ...loaded,
      settings: {
        ...defaultState.settings,
        ...loaded.settings
      },
      projects: loaded.projects?.length ? loaded.projects : defaultState.projects,
      chats: loaded.chats?.length ? loaded.chats : defaultState.chats
    };
  });
  const [models, setModels] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [composerValue, setComposerValue] = useState("");
  const [agentMode, setAgentMode] = useState(false);
  const [runEvents, setRunEvents] = useState([]);
  const [runStatus, setRunStatus] = useState("idle");
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  const [takeOverMode, setTakeOverMode] = useState(false);
  const [activeView, setActiveView] = useState("chat");
  const [activeToolTab, setActiveToolTab] = useState("Browser");
  const [settingsPanel, setSettingsPanel] = useState("general");
  const [scheduleDraft, setScheduleDraft] = useState(null);
  const [testMessage, setTestMessage] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const eventBus = useMemo(() => createEventBus(), []);
  const runnerRef = useRef(createAgentRunner({ bus: eventBus }));
  const searchRef = useRef(null);
  const composerRef = useRef(null);

  const selectedChat = state.chats.find((chat) => chat.id === state.selectedChatId);
  const selectedProject = state.projects.find((project) => project.id === state.selectedProjectId);
  const currentModel = selectedChat?.model || selectedProject?.defaultModel || models[0]?.id || "";

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    const unsubscribe = eventBus.subscribe((event) => {
      setRunEvents((prev) => [event, ...prev].slice(0, 100));
      if (event.type === "run_started") {
        setRunStatus("running");
      }
      if (event.type === "run_paused") {
        setRunStatus("paused");
      }
      if (event.type === "run_resumed") {
        setRunStatus("running");
      }
      if (event.type === "run_completed") {
        setRunStatus("complete");
        insertAssistantMessage("Run complete. Summary ready.");
      }
      if (event.type === "run_stopped") {
        setRunStatus("stopped");
        insertAssistantMessage("Run stopped by user.");
      }
      if (event.type === "run_error") {
        setRunStatus("error");
      }
      if (event.type === "step_requires_confirmation") {
        setPendingConfirmation({
          step: event.step,
          why: event.step?.why || "This action may modify external state."
        });
      }
      if (event.type === "step_output" && selectedChat) {
        updateChat(selectedChat.id, {
          messages: [
            ...selectedChat.messages,
            {
              id: createId("tool"),
              role: "tool",
              content: event.output,
              createdAt: Date.now()
            }
          ]
        });
      }
    });
    return () => unsubscribe();
  }, [eventBus, selectedChat]);

  useEffect(() => {
    const handler = (event) => {
      const isCmdK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (isCmdK) {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") {
        setScheduleDraft(null);
        setTakeOverMode(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const updateSettings = (updates) => {
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...updates
      }
    }));
  };

  const updateChat = (chatId, updates) => {
    setState((prev) => ({
      ...prev,
      chats: prev.chats.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              ...updates
            }
          : chat
      )
    }));
  };

  const appendTokenToMessage = (messages, messageId, token) =>
    messages.map((message) =>
      message.id === messageId ? { ...message, content: message.content + token } : message
    );

  const insertAssistantMessage = (content) => {
    if (!selectedChat) return;
    updateChat(selectedChat.id, {
      messages: [
        ...selectedChat.messages,
        {
          id: createId("msg"),
          role: "assistant",
          content,
          createdAt: Date.now()
        }
      ]
    });
  };

  const handleSend = async () => {
    if (!composerValue.trim() || !selectedChat) {
      return;
    }
    const userMessage = {
      id: createId("msg"),
      role: "user",
      content: composerValue.trim(),
      createdAt: Date.now()
    };
    const updatedMessages = [...selectedChat.messages, userMessage];
    updateChat(selectedChat.id, { messages: updatedMessages, title: selectedChat.title || "New chat" });
    setComposerValue("");

    if (agentMode) {
      setActiveView("run");
      await startAgentRun(userMessage.content);
      return;
    }

    const assistantId = createId("msg");
    updateChat(selectedChat.id, {
      messages: [
        ...updatedMessages,
        {
          id: assistantId,
          role: "assistant",
          content: "",
          createdAt: Date.now()
        }
      ]
    });

    try {
      await streamChatCompletion({
        baseUrl: state.settings.baseUrl,
        apiKey: state.settings.apiKey,
        payload: {
          model: currentModel,
          messages: buildPromptMessages(updatedMessages, selectedProject),
          temperature: 0.3
        },
        onToken: (token) => {
          setState((prev) => ({
            ...prev,
            chats: prev.chats.map((chat) =>
              chat.id === selectedChat.id
                ? { ...chat, messages: appendTokenToMessage(chat.messages, assistantId, token) }
                : chat
            )
          }));
        }
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        chats: prev.chats.map((chat) =>
          chat.id === selectedChat.id
            ? { ...chat, messages: appendTokenToMessage(chat.messages, assistantId, `\n\nError: ${error.message}`) }
            : chat
        )
      }));
    }
  };

  const buildPromptMessages = (messages, project) => {
    const systemMessages = project?.systemInstructions
      ? [{ role: "system", content: project.systemInstructions }]
      : [];
    return [...systemMessages, ...messages.map(({ role, content }) => ({ role, content }))];
  };

  const startAgentRun = async (goal) => {
    setRunEvents([]);
    setPendingConfirmation(null);
    setRunStatus("running");
    const assistantId = createId("msg");
    updateChat(selectedChat.id, {
      messages: [
        ...selectedChat.messages,
        {
          id: assistantId,
          role: "assistant",
          content: "Planning the task...",
          createdAt: Date.now()
        }
      ]
    });

    try {
      const plan = await requestPlan({
        goal,
        model: currentModel,
        baseUrl: state.settings.baseUrl,
        apiKey: state.settings.apiKey,
        streamChat: streamChatCompletion
      });
      setState((prev) => ({
        ...prev,
        chats: prev.chats.map((chat) =>
          chat.id === selectedChat.id
            ? {
                ...chat,
                messages: appendTokenToMessage(
                  chat.messages,
                  assistantId,
                  `\n\nPlan:\n${plan.plan.map((item) => `- ${item}`).join("\n")}`
                )
              }
            : chat
        )
      }));
      runnerRef.current.run(plan);
    } catch (error) {
      setState((prev) => ({
        ...prev,
        chats: prev.chats.map((chat) =>
          chat.id === selectedChat.id
            ? { ...chat, messages: appendTokenToMessage(chat.messages, assistantId, `\n\nError: ${error.message}`) }
            : chat
        )
      }));
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleConnectionTest = async () => {
    setTestMessage("Testing...");
    try {
      const data = await testConnection(state.settings);
      setConnectionStatus("connected");
      setModels(data.data || []);
      setTestMessage("Connected to LM Studio.");
    } catch (error) {
      setConnectionStatus("disconnected");
      setTestMessage(error.message);
    }
  };

  const handleLocateModels = async () => {
    try {
      const result = await fetchModels(state.settings);
      setModels(result);
    } catch (error) {
      setTestMessage(error.message);
    }
  };

  const handleConfirmStep = (decision) => {
    if (!pendingConfirmation) {
      return;
    }
    eventBus.emit({
      type: decision === "confirm" ? "step_confirmed" : "step_denied",
      stepId: pendingConfirmation.step.id
    });
    setPendingConfirmation(null);
  };

  const handleCreateSchedule = (messageId, cadence) => {
    setState((prev) => ({
      ...prev,
      schedules: [
        ...prev.schedules,
        {
          id: createId("schedule"),
          messageId,
          chatId: selectedChat?.id,
          cadence,
          enabled: true,
          nextRun: new Date(Date.now() + 86400000).toISOString()
        }
      ]
    }));
    setScheduleDraft(null);
  };

  const handleNewChat = () => {
    const chatId = createId("chat");
    setState((prev) => ({
      ...prev,
      chats: [
        {
          id: chatId,
          title: "New chat",
          projectId: prev.selectedProjectId,
          model: prev.projects.find((project) => project.id === prev.selectedProjectId)?.defaultModel || "",
          messages: []
        },
        ...prev.chats
      ],
      selectedChatId: chatId
    }));
  };

  const handleCreateProject = () => {
    const projectId = createId("project");
    setState((prev) => ({
      ...prev,
      projects: [
        ...prev.projects,
        {
          id: projectId,
          name: `Project ${prev.projects.length + 1}`,
          description: "",
          systemInstructions: "You are a helpful agent.",
          defaultModel: prev.projects[0]?.defaultModel || "",
          fileContext: []
        }
      ],
      selectedProjectId: projectId
    }));
  };

  const handleToggleSchedule = (scheduleId) => {
    setState((prev) => ({
      ...prev,
      schedules: prev.schedules.map((item) =>
        item.id === scheduleId ? { ...item, enabled: !item.enabled } : item
      )
    }));
  };

  const handleProjectSelect = (projectId) => {
    setState((prev) => ({
      ...prev,
      selectedProjectId: projectId
    }));
  };

  const handleChatSelect = (chatId) => {
    setState((prev) => ({
      ...prev,
      selectedChatId: chatId
    }));
  };

  const handleModelChange = (value) => {
    if (!selectedChat) return;
    updateChat(selectedChat.id, { model: value });
  };

  return (
    <div className={`app ${sidebarCollapsed ? "app--collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="sidebar__header">
          <div>
            <p className="brand__title">Helix Agent</p>
            <p className="brand__subtitle">Local AI Workspace</p>
          </div>
          <button
            className="ghost icon-button"
            aria-label="Collapse sidebar"
            onClick={() => setSidebarCollapsed((prev) => !prev)}
          >
            {sidebarCollapsed ? ">" : "<"}
          </button>
        </div>
        <button className="primary" onClick={handleNewChat}>
          + New chat
        </button>
        <div className="sidebar__search">
          <input ref={searchRef} placeholder="Search chats" aria-label="Search chats" />
        </div>
        <div className="sidebar__section">
          <p className="sidebar__label">Recent chats</p>
          <ul>
            {state.chats.map((chat) => (
              <li key={chat.id}>
                <button
                  className={`list-button ${chat.id === selectedChat?.id ? "active" : ""}`}
                  onClick={() => handleChatSelect(chat.id)}
                >
                  <span>{chat.title || "Untitled"}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="sidebar__section">
          <div className="sidebar__section-header">
            <p className="sidebar__label">Projects</p>
            <button className="ghost" onClick={handleCreateProject}>
              +
            </button>
          </div>
          <ul>
            {state.projects.map((project) => (
              <li key={project.id}>
                <button
                  className={`list-button ${project.id === selectedProject?.id ? "active" : ""}`}
                  onClick={() => handleProjectSelect(project.id)}
                >
                  <span>{project.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="sidebar__section">
          <p className="sidebar__label">Library</p>
          <button className="list-button" onClick={() => setActiveView("schedules")}>
            Schedules
          </button>
          <button className="list-button" onClick={() => setActiveView("settings")}>
            Settings
          </button>
        </div>
      </aside>

      <section className="main">
        <header className="topbar">
          <div>
            <h1>{selectedChat?.title || "New chat"}</h1>
            <p>{selectedProject ? `Project: ${selectedProject.name}` : "No project"}</p>
          </div>
          <div className="topbar__actions">
            <div className={`status-pill ${connectionStatus}`}>
              {connectionStatus === "connected" ? "Model connected" : "Disconnected"}
            </div>
            <select value={currentModel} onChange={(event) => handleModelChange(event.target.value)}>
              <option value="">Select model</option>
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.id}
                </option>
              ))}
            </select>
            <label className="toggle">
              <input
                type="checkbox"
                checked={agentMode}
                onChange={(event) => setAgentMode(event.target.checked)}
              />
              <span>Agent Mode</span>
            </label>
          </div>
        </header>
        <div className="mobile-tabs" role="tablist">
          <button
            className={`tab ${activeView === "chat" ? "active" : ""}`}
            onClick={() => setActiveView("chat")}
          >
            Chat
          </button>
          <button
            className={`tab ${activeView === "run" ? "active" : ""}`}
            onClick={() => setActiveView("run")}
          >
            Run
          </button>
          <button
            className={`tab ${activeView === "settings" ? "active" : ""}`}
            onClick={() => setActiveView("settings")}
          >
            Settings
          </button>
        </div>

        <div className="content">
          {activeView === "chat" && (
            <div className="chat-panel">
              <div className="timeline">
                {selectedChat?.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`message message--${message.role}`}
                    aria-live={message.role === "assistant" ? "polite" : "off"}
                  >
                    {message.role === "tool" ? (
                      <details className="tool-card">
                        <summary>Tool output</summary>
                        <div
                          className="message__content"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
                        />
                      </details>
                    ) : (
                      <div
                        className="message__content"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
                      />
                    )}
                    {message.role === "assistant" && (
                      <div className="message__actions">
                        <button
                          className="ghost"
                          onClick={() => navigator.clipboard.writeText(message.content)}
                        >
                          Copy
                        </button>
                        <button
                          className="ghost"
                          onClick={() => setScheduleDraft({ messageId: message.id })}
                        >
                          Schedule
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="composer">
                <textarea
                  ref={composerRef}
                  rows={3}
                  value={composerValue}
                  onChange={(event) => setComposerValue(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Send a message or type /agent to toggle Agent Mode"
                  aria-label="Message composer"
                />
              <div className="composer__actions">
                <button className="ghost" aria-label="Attach file">
                  +
                </button>
                <button
                  className="ghost"
                  onClick={() => setAgentMode((prev) => !prev)}
                  aria-label="Toggle Agent Mode"
                >
                  /agent
                </button>
                <select aria-label="Tool selector" className="tool-select">
                  <option>Tools</option>
                  <option>Browser</option>
                  <option>Files</option>
                  <option>Shell</option>
                </select>
                <button className="primary" onClick={handleSend}>
                  Send
                </button>
              </div>
            </div>
            </div>
          )}

          {activeView === "settings" && (
            <div className="settings-panel">
              <div className="settings-tabs">
                <button
                  className={`tab ${settingsPanel === "general" ? "active" : ""}`}
                  onClick={() => setSettingsPanel("general")}
                >
                  General
                </button>
                <button
                  className={`tab ${settingsPanel === "models" ? "active" : ""}`}
                  onClick={() => setSettingsPanel("models")}
                >
                  Local Models
                </button>
              </div>
              {settingsPanel === "general" && (
                <div className="settings-card">
                  <h2>Sandbox VM Profile</h2>
                  <p>{vmProfile.description}</p>
                  <ul>
                    {vmProfile.guardrails.map((rule) => (
                      <li key={rule}>{rule}</li>
                    ))}
                  </ul>
                </div>
              )}
              {settingsPanel === "models" && (
                <div className="settings-card">
                  <h2>LM Studio Connection</h2>
                  <label>
                    API Base URL
                    <input
                      value={state.settings.baseUrl}
                      onChange={(event) => updateSettings({ baseUrl: event.target.value })}
                    />
                  </label>
                  <label>
                    API Key
                    <input
                      type="password"
                      value={state.settings.apiKey}
                      onChange={(event) => updateSettings({ apiKey: event.target.value })}
                    />
                  </label>
                  <div className="inline">
                    <button className="ghost" onClick={handleConnectionTest}>
                      Test Connection
                    </button>
                    <button className="ghost" onClick={handleLocateModels}>
                      Locate Models
                    </button>
                  </div>
                  {testMessage && <p className="status-text">{testMessage}</p>}
                </div>
              )}
            </div>
          )}

          {activeView === "schedules" && (
            <div className="settings-panel">
              <h2>Schedules</h2>
              <div className="schedule-list">
                {state.schedules.map((schedule) => (
                  <div className="schedule-item" key={schedule.id}>
                    <div>
                      <strong>{schedule.cadence}</strong>
                      <p>Next run: {schedule.nextRun}</p>
                    </div>
                    <button className="ghost" onClick={() => handleToggleSchedule(schedule.id)}>
                      {schedule.enabled ? "Disable" : "Enable"}
                    </button>
                  </div>
                ))}
                {!state.schedules.length && <p>No scheduled runs yet.</p>}
              </div>
            </div>
          )}

          <aside className={`run-panel ${activeView === "run" ? "active" : ""}`}>
            <div className="run-panel__header">
              <h2>Agent Run</h2>
              <span className={`pill ${runStatus}`}>{runStatus}</span>
            </div>
            <div className="run-panel__controls">
              <button className="ghost" onClick={() => runnerRef.current.pause()}>
                Pause
              </button>
              <button className="ghost" onClick={() => setTakeOverMode(true)}>
                Take Over
              </button>
              <button className="ghost danger" onClick={() => runnerRef.current.stop()}>
                Stop
              </button>
              <button className="ghost" onClick={() => runnerRef.current.resume()}>
                Resume
              </button>
            </div>

            <div className="run-panel__section">
              <h3>Activity</h3>
              <ul>
                {runEvents.slice(0, 6).map((event) => (
                  <li key={`${event.type}-${event.timestamp}`}>
                    {event.type.replace(/_/g, " ")}
                  </li>
                ))}
              </ul>
            </div>

            {pendingConfirmation && (
              <div className="confirmation">
                <h3>Confirmation required</h3>
                <p>{pendingConfirmation.step.action}</p>
                <span>{pendingConfirmation.why}</span>
                <div className="inline">
                  <button className="primary" onClick={() => handleConfirmStep("confirm")}>
                    Confirm
                  </button>
                  <button className="ghost" onClick={() => handleConfirmStep("deny")}>
                    Deny
                  </button>
                  <button className="ghost">Edit</button>
                </div>
              </div>
            )}

            <div className="run-panel__section">
              <h3>Tool Outputs</h3>
              <div className="tool-tabs">
                {toolSections.map((tool) => (
                  <button
                    key={tool}
                    className={`tab ${activeToolTab === tool ? "active" : ""}`}
                    onClick={() => setActiveToolTab(tool)}
                  >
                    {tool}
                  </button>
                ))}
              </div>
              <div className="tool-output">
                <p>{activeToolTab} output will appear here.</p>
              </div>
            </div>
            <div className="run-panel__section">
              <h3>Local Models</h3>
              <p className="muted">{currentModel ? `Using ${currentModel}` : "No model selected."}</p>
            </div>
          </aside>
        </div>
      </section>

      {scheduleDraft && (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="modal__content">
            <h3>Schedule this response</h3>
            <div className="inline">
              {scheduleOptions.map((option) => (
                <button
                  key={option.value}
                  className="ghost"
                  onClick={() => handleCreateSchedule(scheduleDraft.messageId, option.label)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button className="ghost" onClick={() => setScheduleDraft(null)}>
              Close
            </button>
          </div>
        </div>
      )}

      {takeOverMode && (
        <div className="takeover" role="dialog" aria-modal="true">
          <div className="takeover__card">
            <h3>Take Over Mode</h3>
            <p>You now control the sandboxed VM. Agent input is paused.</p>
            <button className="primary" onClick={() => setTakeOverMode(false)}>
              Return control to agent
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
