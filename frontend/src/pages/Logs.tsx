import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Shield, Play, Pause, Trash2, Filter } from 'lucide-react';
import { LogEntry } from '../types';
import { apiService } from '../services/api';

interface LogsProps {
  liveLogs: LogEntry[];
  clearLiveLogs: () => void;
}

export const Logs: React.FC<LogsProps> = ({ liveLogs, clearLiveLogs }) => {
  const [historicalLogs, setHistoricalLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [isLive, setIsLive] = useState(true); // Toggle live WS feeds vs static audit
  const logTerminalEndRef = useRef<HTMLDivElement>(null);

  const fetchHistoricalLogs = async () => {
    setLoading(true);
    try {
      const data = await apiService.getLogs(
        sourceFilter || undefined,
        severityFilter || undefined,
        150
      );
      setHistoricalLogs(data);
    } catch (err) {
      console.error('Failed to load logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLive) {
      fetchHistoricalLogs();
    }
  }, [sourceFilter, severityFilter, isLive]);

  // Scroll to bottom on new live logs
  useEffect(() => {
    if (isLive && logTerminalEndRef.current) {
      logTerminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [liveLogs, isLive]);

  const activeLogs = isLive ? liveLogs : historicalLogs;

  const getSeverityColor = (sev: string) => {
    const s = sev.toLowerCase();
    if (s === 'critical') return 'text-red-500 font-bold';
    if (s === 'high') return 'text-orange-400 font-bold';
    if (s === 'medium') return 'text-yellow-400';
    if (s === 'low') return 'text-blue-400';
    return 'text-green-400';
  };

  return (
    <div className="space-y-6 p-6 h-[calc(100vh-80px)] flex flex-col justify-between">
      {/* Log Feed Controls */}
      <div className="glass-panel p-4 rounded-xl border border-[var(--border-glass)] flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center space-x-4">
          <div className="flex bg-black/50 rounded-lg p-1 border border-[var(--border-glass)] font-mono text-xs">
            <button
              onClick={() => setIsLive(true)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md cursor-pointer transition-all ${
                isLive 
                  ? 'bg-[var(--accent-cyan)] text-white shadow-md' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>LIVE SIGNAL</span>
            </button>
            <button
              onClick={() => setIsLive(false)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md cursor-pointer transition-all ${
                !isLive 
                  ? 'bg-[var(--accent-violet)] text-white shadow-md' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Pause className="w-3.5 h-3.5" />
              <span>PAUSE (AUDIT)</span>
            </button>
          </div>

          {isLive && (
            <button
              onClick={clearLiveLogs}
              className="flex items-center space-x-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 py-2 px-3 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Terminal</span>
            </button>
          )}
        </div>

        {/* Filters (Active during Audit Mode) */}
        <div className={`flex flex-wrap gap-3 items-center ${isLive ? 'opacity-40 pointer-events-none' : ''}`}>
          <div className="flex items-center space-x-1.5 text-xs text-gray-400 font-mono">
            <Filter className="w-3.5 h-3.5" />
            <span>Audit Query Filters:</span>
          </div>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-black/40 border border-[var(--border-glass)] rounded-lg py-1.5 px-2.5 text-xs text-gray-300 focus:outline-none focus:border-[var(--accent-cyan)] font-mono"
          >
            <option value="">All Sources</option>
            <option value="Windows-DC">Windows-DC</option>
            <option value="Linux-Web">Linux-Web</option>
            <option value="Firewall-Core">Firewall-Core</option>
            <option value="Nginx-Reverse-Proxy">Nginx-Proxy</option>
            <option value="AWS-CloudTrail">AWS Cloud</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-black/40 border border-[var(--border-glass)] rounded-lg py-1.5 px-2.5 text-xs text-gray-300 focus:outline-none focus:border-[var(--accent-cyan)] font-mono"
          >
            <option value="">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
            <option value="Informational">Informational</option>
          </select>

          {!isLive && (
            <button
              onClick={fetchHistoricalLogs}
              className="bg-purple-500/10 hover:bg-purple-500/20 text-[var(--accent-violet)] border border-purple-500/20 py-1.5 px-3 rounded-lg text-xs font-bold uppercase cursor-pointer"
            >
              Run Query
            </button>
          )}
        </div>
      </div>

      {/* Terminal Display Panel */}
      <div className="glass-panel flex-1 bg-[#05050a]/95 border border-[var(--border-glass)] rounded-xl p-4 font-mono text-xs overflow-y-auto shadow-inner flex flex-col space-y-2.5 scrollbar-thin">
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-glass)] pb-2 text-[var(--text-muted)] flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-[var(--accent-cyan)]" />
            <span className="font-bold">SOC_SHELL_EVENTS://LOG_RECEIVER</span>
          </div>
          <span className="text-[10px] uppercase font-bold">
            {isLive ? '🔴 RECEIVING REAL-TIME PACKETS' : '⏸️ SYSTEM AUDIT VIEW'}
          </span>
        </div>

        {/* Console Event logs list */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loading && !isLive ? (
            <div className="flex flex-col items-center justify-center h-full space-y-2 py-20 text-[var(--text-muted)]">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--accent-cyan)]"></div>
              <span>QUERYING STORAGE CYBER ENGINE...</span>
            </div>
          ) : activeLogs.length > 0 ? (
            activeLogs.map((log, i) => (
              <div 
                key={log.id || i} 
                className="hover:bg-white/5 p-1.5 rounded transition-colors border-l-2 border-transparent hover:border-[var(--accent-cyan)]/30 flex items-start gap-3"
              >
                <span className="text-gray-500 flex-shrink-0 select-none">
                  [{new Date(log.timestamp).toLocaleTimeString()}]
                </span>
                
                <span className="text-[var(--accent-cyan)] font-semibold flex-shrink-0 w-24 truncate select-none">
                  {log.source}
                </span>

                <span className={`w-14 uppercase tracking-widest text-[10px] flex-shrink-0 select-none ${getSeverityColor(log.severity)}`}>
                  {log.severity}
                </span>

                <div className="flex-1 min-w-0 break-all text-gray-300">
                  <span className="text-white font-semibold mr-1 text-[11px] select-none">
                    [EID:{log.event_id}]
                  </span>
                  <span>{log.message}</span>
                  {log.ip_address && (
                    <span className="text-[var(--accent-violet)] ml-2 text-[10px]">
                      (src_ip: {log.ip_address})
                    </span>
                  )}
                  {log.username && (
                    <span className="text-yellow-400/80 ml-2 text-[10px]">
                      (user: {log.username})
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-20 text-[var(--text-muted)] text-center space-y-1.5">
              <Shield className="w-8 h-8 opacity-40 text-[var(--text-muted)]" />
              <p className="font-bold">No event logs received in the current buffer.</p>
              <p className="text-[10px] opacity-70">
                {isLive 
                  ? 'Verify simulator.py daemon is executing and transmitting logs.' 
                  : 'Adjust filters or check audit logs database.'}
              </p>
            </div>
          )}
          {isLive && <div ref={logTerminalEndRef} />}
        </div>
      </div>
    </div>
  );
};
