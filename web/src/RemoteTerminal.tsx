import React, { useEffect, useRef, useState } from 'react';
import { Play, Square, Terminal as TerminalIcon } from 'lucide-react';

const RemoteTerminal = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const eventSource = new EventSource('http://localhost:3001/api/terminal/stream');
    
    eventSource.onmessage = (event) => {
      const parsed = JSON.parse(event.data);
      setLogs(prev => {
        const next = [...prev, parsed];
        if (next.length > 500) next.shift(); // Keep last 500 lines
        return next;
      });
      // Auto-scroll to bottom
      setTimeout(() => {
         if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 50);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const handleStart = async () => {
    await fetch('http://localhost:3001/api/terminal/start', { method: 'POST' });
  };

  const handleStop = async () => {
    await fetch('http://localhost:3001/api/terminal/stop', { method: 'POST' });
  };

  return (
    <div className="flex flex-col h-[500px] w-full bg-black rounded-xl border border-white/10 overflow-hidden font-mono text-sm shadow-inner relative">
       {/* Toolbar */}
       <div className="flex items-center justify-between p-3 bg-bmcdark-900 border-b border-white/10">
          <div className="flex items-center gap-2 text-slate-400">
             <TerminalIcon size={16} />
             <span className="font-bold text-xs uppercase tracking-widest text-emerald-400">Run_Services Server Process</span>
          </div>
          <div className="flex items-center gap-2">
             <button onClick={handleStart} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition cursor-pointer font-bold uppercase text-xs">
                <Play size={14} /> Start Service
             </button>
             <button onClick={handleStop} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition cursor-pointer font-bold uppercase text-xs">
                <Square size={14} /> Kill
             </button>
          </div>
       </div>

       {/* Logs Area */}
       <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 text-emerald-500/90 whitespace-pre-wrap leading-relaxed text-xs">
          {logs.length === 0 ? <span className="opacity-50">Terminal disconnected or process not running... click 'Start' to launch.</span> : logs.join('')}
       </div>
    </div>
  );
};

export default RemoteTerminal;
