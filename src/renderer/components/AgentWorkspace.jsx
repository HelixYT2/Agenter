import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, Download, Monitor, FileText, CheckCircle, AlertTriangle, Clock } from 'lucide-react';

export default function AgentWorkspace({ run, events, onApprove, onStop }) {
  const [activeTab, setActiveTab] = useState('run');

  if (!run) {
    return (
      <div className="flex-1 flex items-center justify-center bg-neutral-900/30 text-neutral-500">
        <div className="text-center">
          <Monitor size={48} className="mx-auto mb-4 opacity-20" />
          <p>Agent Workspace Idle</p>
        </div>
      </div>
    );
  }

  // Filter events for the timeline
  const timelineEvents = events.filter(e => ['step.started', 'step.log', 'tool.called', 'step.requires_approval', 'artifact.created', 'run.failed', 'run.completed'].includes(e.type));

  const pendingApproval = events.find(e => e.type === 'step.requires_approval' && run.status === 'waiting_approval');

  return (
    <div className="w-[450px] flex flex-col border-l border-white/10 bg-neutral-900/50 backdrop-blur-md">
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-sm">Agent Workspace</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2 h-2 rounded-full ${run.status === 'running' ? 'bg-green-500 animate-pulse' : run.status === 'completed' ? 'bg-blue-500' : 'bg-yellow-500'}`} />
            <span className="text-xs text-neutral-400 capitalize">{run.status}</span>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={onStop} className="p-2 hover:bg-white/10 rounded-lg text-neutral-400 hover:text-red-400">
            <Square size={16} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5">
        <button
          onClick={() => setActiveTab('run')}
          className={`flex-1 py-3 text-xs font-medium border-b-2 transition-colors ${activeTab === 'run' ? 'border-white text-white' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}
        >
          Run & Plan
        </button>
        <button
          onClick={() => setActiveTab('vm')}
          className={`flex-1 py-3 text-xs font-medium border-b-2 transition-colors ${activeTab === 'vm' ? 'border-white text-white' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}
        >
          VM View
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={`flex-1 py-3 text-xs font-medium border-b-2 transition-colors ${activeTab === 'files' ? 'border-white text-white' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}
        >
          Files
        </button>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'run' && (
          <div className="h-full flex flex-col overflow-y-auto p-4 space-y-6">
            {/* Plan */}
            {run.plan && run.plan.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Plan</h3>
                <div className="space-y-2">
                  {run.plan.map((step) => (
                    <div key={step.id} className="flex items-center gap-3 text-sm p-2 bg-white/5 rounded-lg border border-white/5">
                      {step.status === 'done' ? <CheckCircle size={14} className="text-green-500" /> :
                       step.status === 'running' ? <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /> :
                       step.requires_approval ? <AlertTriangle size={14} className="text-yellow-500" /> :
                       <div className="w-3.5 h-3.5 rounded-full border border-neutral-600" />}
                      <span className={step.status === 'done' ? 'text-neutral-400 line-through' : 'text-neutral-200'}>{step.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Approval Card */}
            {pendingApproval && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl space-y-3 animate-pulse-slow">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-yellow-500 shrink-0" size={20} />
                  <div>
                    <h4 className="font-semibold text-yellow-500 text-sm">Approval Required</h4>
                    <p className="text-xs text-neutral-300 mt-1">{pendingApproval.description}</p>
                    <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-[10px] font-mono border border-yellow-500/20">
                      Risk: {pendingApproval.risk}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => onApprove(run.id, 'confirm')}
                    className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black text-sm font-semibold py-2 rounded-lg transition-colors"
                  >
                    Allow
                  </button>
                  <button
                    onClick={() => onApprove(run.id, 'deny')}
                    className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
                  >
                    Deny
                  </button>
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Timeline</h3>
              <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-0 before:w-px before:bg-white/10">
                {timelineEvents.map((event, i) => (
                  <div key={i} className="pl-6 relative">
                    <div className="absolute left-1 top-1.5 w-2 h-2 rounded-full bg-neutral-700 ring-4 ring-neutral-900" />
                    <div className="space-y-1">
                      {event.type === 'step.started' && (
                        <p className="text-sm font-medium text-blue-400">{event.title}</p>
                      )}
                      {event.type === 'tool.called' && (
                        <div className="p-2 bg-black/40 rounded border border-white/5 font-mono text-xs text-neutral-300">
                          <span className="text-purple-400">$ {event.tool}</span> {event.command}
                        </div>
                      )}
                      {event.type === 'step.log' && (
                        <p className="text-xs text-neutral-400 font-mono">{event.content}</p>
                      )}
                      {event.type === 'artifact.created' && (
                        <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                          <Download size={16} className="text-green-500" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-green-400 truncate">{event.artifact.name}</p>
                            <p className="text-xs text-green-500/60">{event.artifact.size}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'vm' && (
          <div className="h-full flex flex-col bg-black">
             <div className="p-2 bg-neutral-800 flex justify-between items-center text-xs text-neutral-400">
                <span>Windows 11 Enterprise</span>
                <span>Connected (WebRTC)</span>
             </div>
             <div className="flex-1 flex items-center justify-center relative bg-indigo-950">
                {/* Mock Windows Desktop */}
                <div className="text-center opacity-50">
                   <Monitor size={64} className="mx-auto mb-4" />
                   <p>Remote Desktop Stream</p>
                </div>

                {/* Overlay for realism */}
                <div className="absolute bottom-0 left-0 right-0 h-10 bg-[#1e1e1e] flex items-center px-4 gap-4">
                   <div className="w-6 h-6 bg-blue-500 rounded-sm grid place-items-center">
                      <div className="w-3 h-3 bg-white grid place-items-center">
                         <div className="w-1.5 h-1.5 bg-blue-500"></div>
                      </div>
                   </div>
                   <div className="flex-1"></div>
                   <div className="text-xs text-white">10:42 AM</div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'files' && (
           <div className="h-full p-4">
              <div className="text-sm text-neutral-400 mb-4">/workspace</div>
              <div className="space-y-1">
                 <div className="flex items-center gap-2 p-2 hover:bg-white/5 rounded text-sm text-neutral-300 cursor-pointer">
                    <FileText size={14} />
                    <span>requirements.txt</span>
                 </div>
                 <div className="flex items-center gap-2 p-2 hover:bg-white/5 rounded text-sm text-neutral-300 cursor-pointer">
                    <FileText size={14} />
                    <span>main.py</span>
                 </div>
                 {run.artifacts?.map(a => (
                    <div key={a.id} className="flex items-center gap-2 p-2 hover:bg-white/5 rounded text-sm text-green-400 cursor-pointer">
                       <Download size={14} />
                       <span>{a.name}</span>
                    </div>
                 ))}
              </div>
           </div>
        )}
      </div>
    </div>
  );
}
