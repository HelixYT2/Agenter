import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Terminal, Bot, User, Copy, RefreshCw, Play } from 'lucide-react';

export default function ChatPlane({
  messages,
  onSendMessage,
  isAgentMode,
  toggleAgentMode,
  isGenerating,
  localConnectionStatus
}) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmit(e);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-neutral-950/50 backdrop-blur-sm relative">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-4 bg-neutral-900/80 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-black/20 p-1 rounded-lg border border-white/5">
             <button
                onClick={() => !isAgentMode && toggleAgentMode()}
                disabled={isAgentMode}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${!isAgentMode ? 'bg-white text-black shadow-sm' : 'text-neutral-400 hover:text-neutral-200'}`}
             >
                Chat
             </button>
             <button
                // Let's make it a toggle
                onClick={toggleAgentMode}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${isAgentMode ? 'bg-indigo-500 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200'}`}
             >
                <Terminal size={12} />
                Agent Mode
             </button>
          </div>
          {isAgentMode && <span className="text-xs text-indigo-400 animate-pulse font-mono">/agent active</span>}
        </div>

        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full border ${localConnectionStatus === 'Connected' ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-neutral-700 bg-neutral-800 text-neutral-500'} text-[10px]`}>
            <div className={`w-1.5 h-1.5 rounded-full ${localConnectionStatus === 'Connected' ? 'bg-green-500' : 'bg-neutral-500'}`} />
            {localConnectionStatus}
          </div>
          <select className="bg-transparent text-xs text-neutral-400 border-none outline-none cursor-pointer hover:text-white">
            <option>LM Studio (Local)</option>
            <option>GPT-4 (Remote)</option>
          </select>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 pt-20 pb-32 space-y-6 scrollbar-thin scrollbar-thumb-neutral-800">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-neutral-500 opacity-60">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4">
               {isAgentMode ? <Terminal size={32} /> : <Bot size={32} />}
            </div>
            <p>Artemis {isAgentMode ? 'Agent' : 'Chat'}</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 max-w-3xl mx-auto ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role !== 'user' && (
               <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 mt-1">
                  <Bot size={16} />
               </div>
            )}

            <div className={`flex flex-col gap-1 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-white/10 text-white rounded-br-none'
                  : 'bg-neutral-900 border border-white/5 text-neutral-200 rounded-bl-none'
              }`}>
                {msg.content}
              </div>

              {/* Message Actions (Assistant Only) */}
              {msg.role !== 'user' && (
                <div className="flex items-center gap-2 px-1">
                   <button className="p-1 hover:text-white text-neutral-500 transition-colors"><Copy size={12} /></button>
                   <button className="p-1 hover:text-white text-neutral-500 transition-colors"><RefreshCw size={12} /></button>
                </div>
              )}
            </div>

            {msg.role === 'user' && (
               <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white shrink-0 mt-1">
                  <User size={16} />
               </div>
            )}
          </div>
        ))}
        {isGenerating && (
           <div className="flex gap-4 max-w-3xl mx-auto">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 mt-1">
                  <Bot size={16} />
               </div>
               <div className="px-4 py-3 rounded-2xl bg-neutral-900 border border-white/5 text-neutral-200 rounded-bl-none flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce delay-75" />
                  <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce delay-150" />
               </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div className="absolute bottom-6 left-0 right-0 px-6">
        <div className="max-w-3xl mx-auto relative">
          <form
            onSubmit={handleSubmit}
            className={`relative flex items-end gap-2 p-2 rounded-xl border transition-all ${
              isAgentMode
                ? 'bg-indigo-950/20 border-indigo-500/30 focus-within:border-indigo-500/50'
                : 'bg-neutral-900/80 border-white/10 focus-within:border-white/20'
            } backdrop-blur-xl shadow-2xl`}
          >
            <button type="button" className="p-2 text-neutral-400 hover:text-white transition-colors">
              <Paperclip size={20} />
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isAgentMode ? "Describe a task for the agent..." : "Message Artemis..."}
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-white placeholder-neutral-500 resize-none py-2 max-h-32 min-h-[40px]"
              rows={1}
            />
            <button
              type="submit"
              disabled={!input.trim() || isGenerating}
              className={`p-2 rounded-lg transition-all ${
                input.trim()
                  ? isAgentMode ? 'bg-indigo-500 text-white' : 'bg-white text-black'
                  : 'bg-white/5 text-neutral-500 cursor-not-allowed'
              }`}
            >
              {isAgentMode ? <Play size={18} fill="currentColor" /> : <Send size={18} />}
            </button>
          </form>
          <div className="text-center mt-2 text-[10px] text-neutral-600">
             Artemis can make mistakes. Verify critical info.
          </div>
        </div>
      </div>
    </div>
  );
}
