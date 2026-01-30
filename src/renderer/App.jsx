import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatPlane from './components/ChatPlane';
import AgentWorkspace from './components/AgentWorkspace';
import Login from './components/Login';
import { api } from './lib/api';
import { subscribeToRun } from './lib/events';
import { X } from 'lucide-react';

// Settings Modal Component
function SettingsModal({ isOpen, onClose, llmUrl, setLlmUrl }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-[500px] bg-neutral-900 border border-white/10 rounded-xl shadow-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-neutral-400 mb-1">Local LLM Base URL</label>
            <input
              type="text"
              value={llmUrl}
              onChange={(e) => setLlmUrl(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
              placeholder="http://localhost:1234/v1"
            />
            <p className="text-xs text-neutral-500 mt-1">Point this to your local LM Studio or OpenAI-compatible server.</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-neutral-200">Done</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('helix_token'));
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [activeChatMessages, setActiveChatMessages] = useState([]);
  const [isAgentMode, setIsAgentMode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Settings
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [llmBaseUrl, setLlmBaseUrl] = useState('http://localhost:1234/v1');
  const PROXY_URL = 'http://localhost:3001/v1'; // Local Connector

  // Agent Run State
  const [activeRun, setActiveRun] = useState(null);
  const [runEvents, setRunEvents] = useState([]);

  // Load user if token exists
  useEffect(() => {
    if (token) {
      api.auth.verify(token).then((res) => {
        if (res.valid) {
          setUser(res.user);
          loadConversations();
        } else {
          setToken(null);
          localStorage.removeItem('helix_token');
        }
      }).catch(() => setToken(null));
    }
  }, [token]);

  const loadConversations = async () => {
    try {
      const convos = await api.conversations.list(token);
      setConversations(convos);
      if (convos.length > 0 && !activeChatId) {
        selectChat(convos[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const selectChat = async (id) => {
    setActiveChatId(id);
    const convo = await api.conversations.getMessages(token, id);
    setActiveChatMessages(convo.messages || []);
    setActiveRun(null);
    setRunEvents([]);
  };

  const handleNewChat = async () => {
    const convo = await api.conversations.create(token, 'New Chat');
    setConversations([convo, ...conversations]);
    selectChat(convo.id);
  };

  const handleSendMessage = async (content) => {
    if (!activeChatId) return;

    // Add User Message
    const userMsg = await api.conversations.addMessage(token, activeChatId, 'user', content);
    setActiveChatMessages(prev => [...prev, userMsg]);
    setIsGenerating(true);

    if (isAgentMode) {
      // Start Agent Run
      try {
        const run = await api.runs.create(token, activeChatId, content);
        setActiveRun(run);
        setRunEvents([]);

        subscribeToRun(run.id, (event) => {
          setRunEvents(prev => [...prev, event]);

          if (event.type === 'plan.updated') {
            setActiveRun(prev => ({ ...prev, plan: event.plan }));
          }
          if (event.type === 'run.completed' || event.type === 'run.failed') {
             setActiveRun(prev => ({ ...prev, status: event.type === 'run.completed' ? 'completed' : 'failed' }));
             setIsGenerating(false);
          }
          if (event.type === 'step.requires_approval') {
             setActiveRun(prev => ({ ...prev, status: 'waiting_approval' }));
          }
        });

      } catch (err) {
        console.error("Failed to start run", err);
        setIsGenerating(false);
      }
    } else {
      // Normal Chat - Connect to Local LLM via Proxy
      try {
        const response = await fetch(`${PROXY_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Target-Url': llmBaseUrl
          },
          body: JSON.stringify({
            model: "local-model", // LM Studio often ignores this or needs a specific one
            messages: [
              { role: "system", content: "You are Artemis, a helpful AI assistant." },
              ...activeChatMessages.map(m => ({ role: m.role, content: m.content })),
              { role: "user", content }
            ],
            stream: false // Simplified for this demo, real app would handle stream
          })
        });

        if (!response.ok) {
           throw new Error(`Local LLM Error: ${response.statusText}`);
        }

        const data = await response.json();
        const botContent = data.choices?.[0]?.message?.content || "No response from model.";

        const botMsg = await api.conversations.addMessage(token, activeChatId, 'assistant', botContent);
        setActiveChatMessages(prev => [...prev, botMsg]);

      } catch (err) {
        // Fallback Mock if Connection Fails
        console.warn("Using fallback mock response:", err);
        setTimeout(async () => {
            const botMsg = await api.conversations.addMessage(token, activeChatId, 'assistant',
                `[Connection Error: ${err.message}] I'm falling back to mock mode. I received: "${content}"`);
            setActiveChatMessages(prev => [...prev, botMsg]);
        }, 500);
      } finally {
        setIsGenerating(false);
      }
    }
  };

  const handleApprove = async (runId, decision) => {
    await api.runs.approve(token, runId, decision);
  };

  if (!token) {
    return <Login onLogin={(t, u) => {
      setToken(t);
      setUser(u);
      localStorage.setItem('helix_token', t);
    }} />;
  }

  return (
    <div className="flex h-screen w-screen bg-black text-white overflow-hidden font-sans">
      <Sidebar
        conversations={conversations}
        onNewChat={handleNewChat}
        onSelectChat={selectChat}
        activeChatId={activeChatId}
        onLogout={() => {
          setToken(null);
          localStorage.removeItem('helix_token');
        }}
        onSettingsClick={() => setSettingsOpen(true)}
      />

      <ChatPlane
        messages={activeChatMessages}
        onSendMessage={handleSendMessage}
        isAgentMode={isAgentMode}
        toggleAgentMode={() => setIsAgentMode(!isAgentMode)}
        isGenerating={isGenerating}
        localConnectionStatus="Connected"
      />

      {isAgentMode && activeRun && (
        <AgentWorkspace
          run={activeRun}
          events={runEvents}
          onApprove={handleApprove}
          onStop={() => {}}
        />
      )}

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        llmUrl={llmBaseUrl}
        setLlmUrl={setLlmBaseUrl}
      />

      {/* Hack: Overlay invisible button on sidebar settings area if I can't edit Sidebar props?
          No, I will edit Sidebar.jsx to add the prop.
      */}
    </div>
  );
}
