import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Clock, Server } from 'lucide-react';

interface HeaderProps {
  title: string;
  wsConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, wsConnected }) => {
  const [timeUTC, setTimeUTC] = useState('');
  const [timeLocal, setTimeLocal] = useState('');

  useEffect(() => {
    const updateClocks = () => {
      const now = new Date();
      setTimeUTC(now.toUTCString().slice(17, 25) + ' UTC');
      setTimeLocal(now.toLocaleTimeString());
    };
    
    updateClocks();
    const interval = setInterval(updateClocks, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="glass-panel border-b border-[var(--border-glass)] py-4 px-8 flex justify-between items-center sticky top-0 z-30">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-gray-100 tracking-wide capitalize">{title}</h2>
      </div>

      {/* Center Clocks (Local / UTC) */}
      <div className="flex items-center space-x-6 text-xs bg-black/40 px-4 py-2 rounded-lg border border-[var(--border-glass)]">
        <div className="flex items-center space-x-1.5 text-gray-300">
          <Clock className="w-3.5 h-3.5 text-[var(--accent-cyan)]" />
          <span className="font-mono">{timeLocal} (LST)</span>
        </div>
        <div className="h-4 w-px bg-gray-700"></div>
        <div className="flex items-center space-x-1.5 text-[var(--text-muted)] font-mono">
          <span>{timeUTC}</span>
        </div>
      </div>

      {/* System Status Indicators */}
      <div className="flex items-center space-x-4">
        {/* DB / Engine State */}
        <div className="flex items-center space-x-1.5 text-xs text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/25">
          <Server className="w-3 h-3" />
          <span className="font-semibold uppercase tracking-wider text-[10px]">DB Active</span>
        </div>

        {/* Live WS Connection indicator */}
        <div className={`flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
          wsConnected 
            ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25' 
            : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/25 animate-pulse'
        }`}>
          {wsConnected ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-[var(--accent-cyan)]" />
              <span className="font-semibold uppercase tracking-wider text-[10px]">WS Sync: Live</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-yellow-500" />
              <span className="font-semibold uppercase tracking-wider text-[10px]">WS Sync: Reconnecting</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
