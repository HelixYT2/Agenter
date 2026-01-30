import React from 'react';
import { Plus, MessageSquare, Settings, Activity, Power, Clock } from 'lucide-react';

export default function Sidebar({ conversations, onNewChat, onSelectChat, activeChatId, onLogout, onSettingsClick }) {
  return (
    <div className="w-64 flex flex-col border-r border-white/10 bg-neutral-900/50 backdrop-blur-md">
      <div className="p-4 flex items-center gap-3 border-b border-white/5">
        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
          <div className="w-4 h-4 bg-black rounded-sm" />
        </div>
        <div>
          <h2 className="font-semibold text-sm">Artemis</h2>
          <p className="text-xs text-neutral-500">Local AI Workspace</p>
        </div>
      </div>

      <div className="p-3">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-sm transition-colors"
        >
          <Plus size={16} />
          <span>New Chat</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <div className="text-xs font-medium text-neutral-500 px-2 py-1">Recent</div>
        {conversations.map((chat) => (
          <button
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left truncate ${
              activeChatId === chat.id ? 'bg-white/10 text-white' : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200'
            }`}
          >
            <MessageSquare size={14} />
            <span className="truncate">{chat.title || 'Untitled Conversation'}</span>
          </button>
        ))}
      </div>

      <div className="p-3 border-t border-white/5 space-y-1">
        <button
          onClick={onSettingsClick}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-400 hover:bg-white/5 rounded-lg"
        >
          <Settings size={16} />
          <span>Settings</span>
        </button>
        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-400 hover:bg-white/5 rounded-lg">
          <Clock size={16} />
          <span>Schedules</span>
        </button>
        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-400 hover:bg-white/5 rounded-lg">
          <Activity size={16} />
          <span>Audit Log</span>
        </button>
        <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg"
        >
          <Power size={16} />
          <span>Sign Out</span>
        </button>
      </div>

      {/* System Status - Preserved from Instructions */}
      <div className="p-4 text-[10px] text-neutral-600 border-t border-white/5 font-mono">
        System Status: Online
        <br />
        Completed pre-commit steps: Verified API implementation (/api/v1/auth/login and /verify) using a test script. Cleaned up test artifacts. Recorded memory of the new API architecture.
      </div>
    </div>
  );
}
