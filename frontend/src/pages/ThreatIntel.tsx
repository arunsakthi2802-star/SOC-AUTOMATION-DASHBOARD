import React, { useState } from 'react';
import { SearchCode, Globe, ShieldCheck, ShieldAlert, Cpu, History } from 'lucide-react';
import { ThreatIntelLookup } from '../types';
import { apiService } from '../services/api';

export const ThreatIntel: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ThreatIntelLookup | null>(null);
  const [history, setHistory] = useState<ThreatIntelLookup[]>([]);
  const [error, setError] = useState('');

  const handleLookup = async (searchQuery: string) => {
    if (!searchQuery) return;
    setLoading(true);
    setError('');
    
    try {
      const data = await apiService.lookupThreat(searchQuery);
      setResult(data);
      
      // Update local history (avoid duplicates)
      setHistory(prev => {
        const filtered = prev.filter(h => h.query !== data.query);
        return [data, ...filtered].slice(0, 8); // Keep last 8 queries
      });
    } catch (err) {
      setError('Lookup request failed. Check API connectivity.');
    } finally {
      setLoading(false);
    }
  };

  const getReputationBadge = (rep: string) => {
    switch (rep) {
      case 'Malicious':
        return 'bg-red-500/10 text-red-400 border border-red-500/30 font-bold';
      case 'Suspicious':
        return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 font-bold';
      default:
        return 'bg-green-500/10 text-green-400 border border-green-500/30 font-bold';
    }
  };

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto max-h-[calc(100vh-80px)]">
      {/* Search Console & Info Cards */}
      <div className="lg:col-span-8 space-y-6">
        {/* Search Console */}
        <div className="glass-panel p-6 rounded-xl border border-[var(--border-glass)]">
          <h3 className="text-sm font-bold tracking-wider text-gray-200 uppercase flex items-center space-x-2 mb-4">
            <SearchCode className="w-5 h-5 text-[var(--accent-cyan)]" />
            <span>Threat Intelligence Lookup Command</span>
          </h3>
          <p className="text-xs text-[var(--text-muted)] mb-4">
            Query suspicious host domains, attacker IP addresses, or SHA256 file hashes to cross-reference with VirusTotal and AbuseIPDB threat databases.
          </p>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. 185.190.140.23, botnet.c2-servers.net, or SHA256 hash"
              className="flex-1 bg-black/40 border border-[var(--border-glass)] rounded-lg py-2.5 px-4 text-xs text-white focus:outline-none focus:border-[var(--accent-cyan)] font-mono"
            />
            <button
              onClick={() => handleLookup(query)}
              disabled={loading}
              className="btn-cyber-cyan py-2.5 px-6 rounded-lg text-xs font-bold text-white tracking-widest uppercase cursor-pointer"
            >
              {loading ? 'Querying...' : 'Scan IOC'}
            </button>
          </div>
          {error && <p className="text-red-400 text-xs mt-2 font-mono">{error}</p>}
        </div>

        {/* Results Panel */}
        {loading ? (
          <div className="glass-panel p-12 rounded-xl border border-[var(--border-glass)] text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-cyan)] mx-auto mb-3"></div>
            <span className="text-xs text-[var(--text-muted)] font-mono">RETRIEVING THREAT FEEDS...</span>
          </div>
        ) : result ? (
          <div className="glass-panel p-6 rounded-xl border border-[var(--border-glass)] space-y-6 bg-gradient-to-br from-black/20 to-transparent">
            {/* Header / Reputation score */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[var(--border-glass)] pb-4">
              <div>
                <h4 className="text-lg font-bold text-white font-mono break-all">{result.query}</h4>
                <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase block mt-1">Queried on: {new Date(result.timestamp).toLocaleTimeString()}</span>
              </div>
              <span className={`text-xs uppercase tracking-widest px-3 py-1 rounded ${getReputationBadge(result.reputation)}`}>
                {result.reputation} Classification
              </span>
            </div>

            {/* Score Indicators Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-black/30 p-4 rounded-xl border border-[var(--border-glass)] text-center flex flex-col justify-center items-center">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)]">VirusTotal Positive detections</span>
                <span className={`text-2xl font-black font-mono mt-2 ${result.vt_positives > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {result.vt_positives} / {result.vt_total}
                </span>
              </div>

              <div className="bg-black/30 p-4 rounded-xl border border-[var(--border-glass)] text-center flex flex-col justify-center items-center">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)]">AbuseIPDB Confidence Score</span>
                <span className={`text-2xl font-black font-mono mt-2 ${result.abuse_score > 50 ? 'text-red-400' : result.abuse_score > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {result.abuse_score}%
                </span>
              </div>

              <div className="bg-black/30 p-4 rounded-xl border border-[var(--border-glass)] text-center flex flex-col justify-center items-center">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)]">Mitigation Level</span>
                <span className={`text-sm font-bold uppercase tracking-widest mt-3.5 px-2.5 py-0.5 rounded ${result.reputation === 'Malicious' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
                  {result.reputation === 'Malicious' ? 'Block List' : 'Allow Traffic'}
                </span>
              </div>
            </div>

            {/* Metadata Section */}
            <div className="space-y-4">
              <h5 className="text-xs font-bold tracking-widest uppercase text-gray-400">Target IOC Metadata</h5>
              
              <div className="bg-black/30 p-4 rounded-xl border border-[var(--border-glass)] grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs text-gray-300">
                {result.details.isp && (
                  <div>
                    <span className="text-gray-500 block">ISP Authority</span>
                    <strong className="text-white mt-0.5 block">{result.details.isp}</strong>
                  </div>
                )}
                {result.details.country && (
                  <div>
                    <span className="text-gray-500 block">Geolocation Country</span>
                    <strong className="text-white mt-0.5 block">{result.details.country}</strong>
                  </div>
                )}
                {result.details.file_type && (
                  <div>
                    <span className="text-gray-500 block">Identified File Type</span>
                    <strong className="text-white mt-0.5 block">{result.details.file_type}</strong>
                  </div>
                )}
                {result.details.threat_name && (
                  <div>
                    <span className="text-gray-500 block">Threat Classification</span>
                    <strong className="text-red-400 mt-0.5 block">{result.details.threat_name}</strong>
                  </div>
                )}
                {result.details.domain_associated && (
                  <div>
                    <span className="text-gray-500 block">Associated Domain</span>
                    <strong className="text-white mt-0.5 block break-all">{result.details.domain_associated}</strong>
                  </div>
                )}
                {result.details.registrar && (
                  <div>
                    <span className="text-gray-500 block">Domain Registrar</span>
                    <strong className="text-white mt-0.5 block">{result.details.registrar}</strong>
                  </div>
                )}

                <div className="md:col-span-2 border-t border-white/5 pt-3">
                  <span className="text-gray-500 block mb-1">Threat Context / Analysis logs</span>
                  <p className="text-xs text-gray-300 leading-relaxed font-sans">
                    {result.details.abuse_history || result.details.behavior || 'Clean signature record. No malicious exploit patterns identified in sandboxed telemetry.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-panel p-12 rounded-xl border border-[var(--border-glass)] text-center text-gray-500 font-mono text-xs">
            Scan an indicator of compromise to view detailed threat intelligence feeds.
          </div>
        )}
      </div>

      {/* History Sidebar */}
      <div className="lg:col-span-4 glass-panel p-6 rounded-xl border border-[var(--border-glass)] flex flex-col justify-start space-y-4">
        <h3 className="text-sm font-bold tracking-wider text-gray-200 uppercase flex items-center space-x-2 border-b border-[var(--border-glass)] pb-3">
          <History className="w-4.5 h-4.5 text-[var(--accent-violet)]" />
          <span>Recent Scans</span>
        </h3>
        
        <div className="space-y-2.5 overflow-y-auto max-h-[360px] pr-1">
          {history.length > 0 ? (
            history.map((h) => (
              <div 
                key={h.query} 
                onClick={() => { setQuery(h.query); handleLookup(h.query); }}
                className="p-3 bg-black/25 rounded-lg border border-[var(--border-glass)] hover:border-[var(--accent-cyan)]/30 cursor-pointer transition-colors font-mono text-xs flex justify-between items-center"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <span className="text-gray-300 block truncate font-bold">{h.query}</span>
                  <span className="text-[10px] text-gray-500 block mt-0.5">VT Score: {h.vt_positives}/{h.vt_total}</span>
                </div>
                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded shrink-0 ${
                  h.reputation === 'Malicious' ? 'text-red-400 bg-red-500/10' : h.reputation === 'Suspicious' ? 'text-yellow-400 bg-yellow-500/10' : 'text-green-400 bg-green-500/10'
                }`}>
                  {h.reputation}
                </span>
              </div>
            ))
          ) : (
            <p className="text-[11px] text-[var(--text-muted)] font-mono text-center py-6">No recent lookups recorded.</p>
          )}
        </div>
      </div>
    </div>
  );
};
