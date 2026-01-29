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
      updatedAt: Date.now(),
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

const toolSections = ["Browser", "Shell", "Files"];

const RunStatusLabel = {
  idle: "Idle",
  running: "Running",
  paused: "Paused",
  awaiting_confirmation: "Awaiting confirmation",
  awaiting_takeover: "Awaiting takeover",
  stopped: "Stopped",
  complete: "Complete",
  error: "Error"
};

const formatTime = (timestamp) =>
  new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const Sidebar = ({
  chats,
  projects,
  selectedChatId,
  selectedProjectId,
  onNewChat,
  onChatSelect,
  onProjectSelect,
  onCreateProject,
  onSettings,
  onSchedules,
  collapsed,
  onToggleCollapse,
  searchQuery,
  onSearchChange
}) => (
  <aside className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}>
    <div className="sidebar__header">
      <div className="sidebar__brand">
        <p className="brand__title">Helix Agent</p>
        <p className="brand__subtitle">Local AI Workspace</p>
      </div>
      <button
        className="ghost icon-button"
        aria-label="Collapse sidebar"
        onClick={onToggleCollapse}
      >
        {collapsed ? ">" : "<"}
      </button>
    </div>
    <button className="primary" onClick={onNewChat}>
      + New chat
    </button>
    <div className="sidebar__search">
      <input
        placeholder="Search chats"
        aria-label="Search chats"
        value={searchQuery}
        onChange={(event) => onSearchChange(event.target.value)}
      />
    </div>
    <div className="sidebar__section">
      <p className="sidebar__label">Recent</p>
      <div className="sidebar__list">
        {chats.map((chat) => (
          <button
            key={chat.id}
            className={`list-button ${chat.id === selectedChatId ? "active" : ""}`}
            onClick={() => onChatSelect(chat.id)}
          >
            <span className="list-title">{chat.title || "Untitled"}</span>
            <span className="list-time">{formatTime(chat.updatedAt || chat.messages.at(-1)?.createdAt)}</span>
          </button>
        ))}
      </div>
    </div>
    <div className="sidebar__section">
      <div className="sidebar__section-header">
        <p className="sidebar__label">Projects</p>
        <button className="ghost" onClick={onCreateProject}>
          +
        </button>
      </div>
      <div className="sidebar__list">
        {projects.map((project) => (
          <button
            key={project.id}
            className={`list-button ${project.id === selectedProjectId ? "active" : ""}`}
            onClick={() => onProjectSelect(project.id)}
          >
            <span className="list-title">{project.name}</span>
          </button>
        ))}
      </div>
    </div>
    <div className="sidebar__footer">
      <button className="list-button" onClick={onSchedules}>
        Schedules
      </button>
      <button className="list-button" onClick={onSettings}>
        Settings
      </button>
    </div>
  </aside>
);

const ChatHeader = ({
  title,
  projectName,
  connectionStatus,
  model,
  models,
  agentMode,
  onModelChange,
  onModeChange
}) => (
  <header className="chat-header">
    <div>
      <h1>{title}</h1>
      <p>{projectName ? `Project: ${projectName}` : "No project"}</p>
    </div>
    <div className="chat-header__actions">
      <div className={`status-pill ${connectionStatus}`}>
        {connectionStatus === "connected" ? "Model connected" : "Disconnected"}
      </div>
      <select value={model} onChange={(event) => onModelChange(event.target.value)}>
        <option value="">Select model</option>
        {models.map((item) => (
          <option key={item.id} value={item.id}>
            {item.id}
          </option>
        ))}
      </select>
      <select value={agentMode ? "agent" : "normal"} onChange={(event) => onModeChange(event.target.value)}>
        <option value="normal">Normal</option>
        <option value="agent">Agent</option>
      </select>
    </div>
  </header>
);

const MessageList = ({ messages, onCopy, onRetry, onSchedule, isGenerating }) => (
  <div className="timeline">
    {messages.map((message) => (
      <div key={message.id} className={`message message--${message.role}`}>
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
            <button className="ghost" onClick={() => onCopy(message.content)}>
              Copy
            </button>
            <button className="ghost" onClick={() => onRetry(message.id)}>
              Retry
            </button>
            <button className="ghost" onClick={() => onSchedule(message.id)}>
              Schedule
            </button>
          </div>
        )}
      </div>
    ))}
    {isGenerating && <div className="message message--assistant">Generating…</div>}
  </div>
);

const Composer = ({
  value,
  onChange,
  onSend,
  onKeyDown,
  onToggleAgent,
  agentMode,
  isGenerating,
  onStopGenerating,
  commandMenu,
  onCommandSelect
}) => (
  <div className="composer">
    {commandMenu.open && (
      <div className="command-menu">
        {commandMenu.items.map((item, index) => (
          <button
            key={item.label}
            className={`command-item ${commandMenu.activeIndex === index ? "active" : ""}`}
            onClick={() => onCommandSelect(item)}
          >
            {item.label}
          </button>
        ))}
      </div>
    )}
    <div className="composer__input">
      <textarea
        rows={3}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Ask Helix anything..."
        aria-label="Message composer"
      />
      {agentMode && <span className="mode-pill">Agent Mode</span>}
    </div>
    <div className="composer__actions">
      <button className="ghost" aria-label="Attach file">
        +
      </button>
      <button className="ghost" onClick={onToggleAgent} aria-label="Toggle Agent Mode">
        /agent
      </button>
      {isGenerating ? (
        <button className="ghost danger" onClick={onStopGenerating}>
          Stop
        </button>
      ) : (
        <button className="primary" onClick={onSend}>
          Send
        </button>
      )}
    </div>
  </div>
);

const AgentPanel = ({
  runStatus,
  runEvents,
  pendingConfirmation,
  onConfirm,
  onDeny,
  onEditPayload,
  onPause,
  onResume,
  onStop,
  onTakeover,
  takeoverRequested
}) => (
  <aside className="run-panel">
    <div className="run-panel__header">
      <h2>Agent Run</h2>
      <span className={`pill ${runStatus}`}>{RunStatusLabel[runStatus] || "Idle"}</span>
    </div>
    <div className="run-panel__controls">
      <button className="ghost" onClick={onPause}>
        Pause
      </button>
      <button className="ghost" onClick={onTakeover}>
        Take over
      </button>
      <button className="ghost danger" onClick={onStop}>
        Stop
      </button>
      <button className="ghost" onClick={onResume}>
        Resume
      </button>
    </div>
    <div className="run-panel__body">
      <div className="run-panel__section">
        <h3>Activity</h3>
        <ul>
          {runEvents.map((event) => (
            <li key={`${event.type}-${event.timestamp}`}>{event.label || event.type.replace(/_/g, " ")}</li>
          ))}
        </ul>
      </div>

      {takeoverRequested && (
        <div className="callout">
          <strong>Take over requested</strong>
          <p>Agent needs you to complete a sensitive action in the mock browser.</p>
        </div>
      )}

      {pendingConfirmation && (
        <div className="confirmation">
          <h3>Confirmation required</h3>
          <p>{pendingConfirmation.step.action}</p>
          <span>{pendingConfirmation.why}</span>
          <details className="payload">
            <summary>Action payload</summary>
            <pre>{pendingConfirmation.payloadText}</pre>
          </details>
          {pendingConfirmation.isEditing && (
            <textarea
              className="payload-editor"
              value={pendingConfirmation.payloadText}
              onChange={(event) => onEditPayload(event.target.value)}
            />
          )}
          <div className="inline">
            <button className="primary" onClick={onConfirm}>
              Confirm
            </button>
            <button className="ghost" onClick={onDeny}>
              Deny
            </button>
            <button className="ghost" onClick={pendingConfirmation.onToggleEdit}>
              Edit action
            </button>
          </div>
        </div>
      )}

      <div className="run-panel__section">
        <h3>Tool outputs</h3>
        {toolSections.map((tool) => (
          <details key={tool} className="tool-output">
            <summary>{tool} preview (mock)</summary>
            <p>Mock output placeholder. Real tool wiring coming soon.</p>
          </details>
        ))}
      </div>

      <div className="run-panel__section">
        <h3>Sandbox integration</h3>
        <p className="muted">Coming soon. VM controls are disabled until integration is complete.</p>
        <div className="inline">
          <button className="ghost" disabled>
            Configure
          </button>
          <button className="ghost" disabled>
            Open console
          </button>
        </div>
      </div>
    </div>
  </aside>
);

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
  const [takeoverRequested, setTakeoverRequested] = useState(false);
  const [activeView, setActiveView] = useState("chat");
  const [settingsPanel, setSettingsPanel] = useState("general");
  const [scheduleDraft, setScheduleDraft] = useState(null);
  const [testMessage, setTestMessage] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [commandMenu, setCommandMenu] = useState({ open: false, activeIndex: 0, items: [] });

  const eventBus = useMemo(() => createEventBus(), []);
  const runnerRef = useRef(createAgentRunner({ bus: eventBus }));
  const abortRef = useRef(null);

  const selectedChat = state.chats.find((chat) => chat.id === state.selectedChatId);
  const selectedProject = state.projects.find((project) => project.id === state.selectedProjectId);
  const currentModel = selectedChat?.model || selectedProject?.defaultModel || models[0]?.id || "";

  const filteredChats = state.chats.filter((chat) =>
    chat.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    const unsubscribe = eventBus.subscribe((event) => {
      setRunEvents((prev) => [{ ...event, label: event.label }, ...prev].slice(0, 80));
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
        setRunStatus("awaiting_confirmation");
        setPendingConfirmation({
          step: event.step,
          why: event.step?.why || "This action may modify external state.",
          payloadText: JSON.stringify(event.step?.payload || {}, null, 2),
          isEditing: false
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
      if (event.type === "takeover_requested") {
        setRunStatus("awaiting_takeover");
        setTakeoverRequested(true);
      }
      if (event.type === "takeover_started") {
        setRunStatus("paused");
      }
      if (event.type === "takeover_ended") {
        setRunStatus("running");
        setTakeoverRequested(false);
      }
    });
    return () => unsubscribe();
  }, [eventBus, selectedChat]);

  useEffect(() => {
    const handler = (event) => {
      const isCmdK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (isCmdK) {
        event.preventDefault();
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

  const buildPromptMessages = (messages, project) => {
    const systemMessages = project?.systemInstructions
      ? [{ role: "system", content: project.systemInstructions }]
      : [];
    return [...systemMessages, ...messages.map(({ role, content }) => ({ role, content }))];
  };

  const handleSend = async (overrideContent) => {
    if (!selectedChat) {
      return;
    }
    const content = overrideContent || composerValue.trim();
    if (!content) {
      return;
    }
    const userMessage = {
      id: createId("msg"),
      role: "user",
      content,
      createdAt: Date.now()
    };
    const updatedMessages = [...selectedChat.messages, userMessage];
    updateChat(selectedChat.id, {
      messages: updatedMessages,
      title: selectedChat.title || "New chat",
      updatedAt: Date.now()
    });
    setComposerValue("");

    if (agentMode) {
      setActiveView("chat");
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

    setIsGenerating(true);
    abortRef.current = new AbortController();

    try {
      await streamChatCompletion({
        baseUrl: state.settings.baseUrl,
        apiKey: state.settings.apiKey,
        payload: {
          model: currentModel,
          messages: buildPromptMessages(updatedMessages, selectedProject),
          temperature: 0.3
        },
        signal: abortRef.current.signal,
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
      if (error.name !== "AbortError") {
        setState((prev) => ({
          ...prev,
          chats: prev.chats.map((chat) =>
            chat.id === selectedChat.id
              ? { ...chat, messages: appendTokenToMessage(chat.messages, assistantId, `\n\nError: ${error.message}`) }
              : chat
          )
        }));
      }
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
    }
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
    if (commandMenu.open) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setCommandMenu((prev) => ({
          ...prev,
          activeIndex: Math.min(prev.activeIndex + 1, prev.items.length - 1)
        }));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setCommandMenu((prev) => ({
          ...prev,
          activeIndex: Math.max(prev.activeIndex - 1, 0)
        }));
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const selected = commandMenu.items[commandMenu.activeIndex];
        if (selected) {
          handleCommandSelect(selected);
        }
        return;
      }
      if (event.key === "Escape") {
        setCommandMenu({ open: false, activeIndex: 0, items: [] });
        return;
      }
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
      return;
    }
    if (event.key === "/") {
      setCommandMenu({
        open: true,
        activeIndex: 0,
        items: [{ label: "/agent", action: "agent" }]
      });
    }
  };

  const handleCommandSelect = (command) => {
    if (command.action === "agent") {
      setAgentMode(true);
      setComposerValue("");
      setCommandMenu({ open: false, activeIndex: 0, items: [] });
    }
  };

  const handleComposerChange = (value) => {
    setComposerValue(value);
    if (!value.startsWith("/")) {
      setCommandMenu({ open: false, activeIndex: 0, items: [] });
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

  const handleConfirmStep = () => {
    if (!pendingConfirmation) {
      return;
    }
    let payload = null;
    try {
      payload = JSON.parse(pendingConfirmation.payloadText || "{}");
    } catch (error) {
      payload = pendingConfirmation.step.payload;
    }
    eventBus.emit({
      type: "step_confirmed",
      stepId: pendingConfirmation.step.id,
      payload
    });
    setPendingConfirmation(null);
  };

  const handleDenyStep = () => {
    if (!pendingConfirmation) {
      return;
    }
    eventBus.emit({
      type: "step_denied",
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
          updatedAt: Date.now(),
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

  const handleRetry = (messageId) => {
    if (!selectedChat) return;
    const messageIndex = selectedChat.messages.findIndex((message) => message.id === messageId);
    const previousUser = [...selectedChat.messages]
      .slice(0, messageIndex)
      .reverse()
      .find((message) => message.role === "user");
    if (previousUser) {
      handleSend(previousUser.content);
    }
  };

  const handleStopGenerating = () => {
    abortRef.current?.abort();
  };

  const handleTakeoverStart = () => {
    setTakeOverMode(true);
    runnerRef.current.startTakeover();
  };

  const handleTakeoverEnd = () => {
    setTakeOverMode(false);
    runnerRef.current.endTakeover();
  };

  const handleModeChange = (value) => {
    setAgentMode(value === "agent");
  };

  return (
    <div className={`app ${sidebarCollapsed ? "app--collapsed" : ""}`}>
      <Sidebar
        chats={filteredChats}
        projects={state.projects}
        selectedChatId={state.selectedChatId}
        selectedProjectId={state.selectedProjectId}
        onNewChat={handleNewChat}
        onChatSelect={handleChatSelect}
        onProjectSelect={handleProjectSelect}
        onCreateProject={handleCreateProject}
        onSettings={() => setActiveView("settings")}
        onSchedules={() => setActiveView("schedules")}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main className="main">
        <ChatHeader
          title={selectedChat?.title || "New chat"}
          projectName={selectedProject?.name}
          connectionStatus={connectionStatus}
          model={currentModel}
          models={models}
          agentMode={agentMode}
          onModelChange={handleModelChange}
          onModeChange={handleModeChange}
        />

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
            <section className="chat-panel">
              <MessageList
                messages={selectedChat?.messages || []}
                onCopy={(content) => navigator.clipboard.writeText(content)}
                onRetry={handleRetry}
                onSchedule={(messageId) => setScheduleDraft({ messageId })}
                isGenerating={isGenerating}
              />
              <Composer
                value={composerValue}
                onChange={handleComposerChange}
                onSend={() => handleSend()}
                onKeyDown={handleKeyDown}
                onToggleAgent={() => setAgentMode((prev) => !prev)}
                agentMode={agentMode}
                isGenerating={isGenerating}
                onStopGenerating={handleStopGenerating}
                commandMenu={commandMenu}
                onCommandSelect={handleCommandSelect}
              />
            </section>
          )}

          {activeView === "settings" && (
            <section className="settings-panel">
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
                  <h2>Sandbox integration (planned)</h2>
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
            </section>
          )}

          {activeView === "schedules" && (
            <section className="settings-panel">
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
            </section>
          )}

          <div className={`run-panel-wrapper ${activeView === "run" ? "active" : ""}`}>
            <AgentPanel
              runStatus={runStatus}
              runEvents={runEvents}
              pendingConfirmation={
                pendingConfirmation && {
                  ...pendingConfirmation,
                  onToggleEdit: () =>
                    setPendingConfirmation((prev) => ({
                      ...prev,
                      isEditing: !prev.isEditing
                    }))
                }
              }
              onConfirm={handleConfirmStep}
              onDeny={handleDenyStep}
              onEditPayload={(value) =>
                setPendingConfirmation((prev) => ({
                  ...prev,
                  payloadText: value
                }))
              }
              onPause={() => runnerRef.current.pause()}
              onResume={() => runnerRef.current.resume()}
              onStop={() => runnerRef.current.stop()}
              onTakeover={handleTakeoverStart}
              takeoverRequested={takeoverRequested}
            />
          </div>
        </div>
      </main>

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
            <h3>You are in control</h3>
            <p>Browser preview is mocked. Return control to resume the agent.</p>
            <button className="primary" onClick={handleTakeoverEnd}>
              Return control to agent
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
