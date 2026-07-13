import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Search, 
  Check, 
  EyeOff, 
  RotateCcw,
  CheckCircle
} from 'lucide-react';
import { AlertEntry } from '../types';
import { apiService } from '../services/api';

export const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const data = await apiService.getAlerts(
        severityFilter || undefined,
        statusFilter || undefined
      );
      setAlerts(data);
    } catch (err) {
      console.error('Failed to fetch alerts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [severityFilter, statusFilter]);

  const handleUpdateStatus = async (alertId: string, newStatus: string) => {
    try {
      await apiService.updateAlert(alertId, newStatus);
      // Refresh list
      fetchAlerts();
    } catch (err) {
      console.error('Failed to update alert', err);
    }
  };

  // Client side search filtering
  const filteredAlerts = alerts.filter(alert => 
    alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (alert.ip_address && alert.ip_address.includes(searchTerm)) ||
    (alert.category && alert.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getSeverityStyle = (sev: string) => {
    switch (sev) {
      case 'Critical': return 'bg-red-500/10 text-red-400 border border-red-500/30';
      case 'High': return 'bg-orange-500/10 text-orange-400 border border-orange-500/30';
      case 'Medium': return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30';
      case 'Low': return 'bg-blue-500/10 text-blue-400 border border-blue-500/30';
      default: return 'bg-gray-500/10 text-gray-400 border border-gray-500/30';
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'New': return 'text-red-400 bg-red-400/10 border border-red-500/20';
      case 'Acknowledged': return 'text-cyan-400 bg-cyan-400/10 border border-cyan-500/20';
      case 'Suppressed': return 'text-gray-400 bg-gray-400/10 border border-gray-500/20';
      default: return 'text-green-400 bg-green-400/10 border border-green-500/20';
    }
  };

  return (
    <div className="space-y-6 p-6 overflow-y-auto max-h-[calc(100vh-80px)]">
      {/* Filters & Actions Bar */}
      <div className="glass-panel p-4 rounded-xl border border-[var(--border-glass)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search alerts, IPs, signatures, techniques..."
            className="w-full bg-black/40 border border-[var(--border-glass)] rounded-lg py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-[var(--accent-cyan)] transition-all font-mono"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap gap-3">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-black/40 border border-[var(--border-glass)] rounded-lg py-2 px-3 text-xs text-gray-300 focus:outline-none focus:border-[var(--accent-cyan)] font-mono"
          >
            <option value="">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-black/40 border border-[var(--border-glass)] rounded-lg py-2 px-3 text-xs text-gray-300 focus:outline-none focus:border-[var(--accent-cyan)] font-mono"
          >
            <option value="">All Statuses</option>
            <option value="New">New</option>
            <option value="Acknowledged">Acknowledged</option>
            <option value="Suppressed">Suppressed</option>
            <option value="Resolved">Resolved</option>
          </select>

          <button
            onClick={fetchAlerts}
            className="bg-purple-500/10 hover:bg-purple-500/20 text-[var(--accent-violet)] border border-purple-500/25 py-2 px-3.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all cursor-pointer"
          >
            Triage Refresh
          </button>
        </div>
      </div>

      {/* Alerts Grid */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-cyan)] mx-auto mb-3"></div>
            <span className="text-xs text-[var(--text-muted)] font-mono">LOADING EVENTS QUEUE...</span>
          </div>
        ) : filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert) => (
            <div 
              key={alert.id} 
              className="glass-panel p-5 rounded-xl border border-[var(--border-glass)] hover:border-[var(--accent-violet)]/30 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded tracking-widest ${getSeverityStyle(alert.severity)}`}>
                    {alert.severity}
                  </span>
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded tracking-widest ${getStatusStyle(alert.status)}`}>
                    {alert.status}
                  </span>
                  <span className="text-xs text-[var(--accent-cyan)] font-mono">
                    MITRE ATT&CK: {alert.mitre_technique || 'T1204'}
                  </span>
                  <span className="text-xs text-[var(--text-muted)] font-mono">
                    {new Date(alert.timestamp).toLocaleString()}
                  </span>
                </div>
                
                <h4 className="font-extrabold text-base text-white">{alert.title}</h4>
                <p className="text-xs text-gray-300 leading-relaxed max-w-3xl">{alert.description}</p>
                
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs font-mono text-[var(--text-muted)] pt-1">
                  <span>Category: <strong className="text-gray-300">{alert.category}</strong></span>
                  <span>Origin IP: <strong className="text-gray-300">{alert.ip_address || 'unknown'}</strong></span>
                  {alert.username && <span>Target User: <strong className="text-gray-300">{alert.username}</strong></span>}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 self-stretch md:self-auto justify-end md:flex-col min-w-[140px]">
                {alert.status === 'New' && (
                  <button
                    onClick={() => handleUpdateStatus(alert.id, 'Acknowledged')}
                    className="flex items-center justify-center space-x-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-[var(--accent-cyan)] border border-cyan-500/25 py-1.5 px-3 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer w-full"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Acknowledge</span>
                  </button>
                )}
                {alert.status !== 'Suppressed' && alert.status !== 'Resolved' && (
                  <button
                    onClick={() => handleUpdateStatus(alert.id, 'Suppressed')}
                    className="flex items-center justify-center space-x-1.5 bg-gray-500/10 hover:bg-gray-500/20 text-gray-400 border border-gray-500/25 py-1.5 px-3 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer w-full"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Suppress</span>
                  </button>
                )}
                {alert.status !== 'Resolved' && (
                  <button
                    onClick={() => handleUpdateStatus(alert.id, 'Resolved')}
                    className="flex items-center justify-center space-x-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/25 py-1.5 px-3 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer w-full"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Resolve</span>
                  </button>
                )}
                {(alert.status === 'Suppressed' || alert.status === 'Resolved') && (
                  <button
                    onClick={() => handleUpdateStatus(alert.id, 'New')}
                    className="flex items-center justify-center space-x-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-[var(--accent-violet)] border border-purple-500/25 py-1.5 px-3 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer w-full"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Re-open</span>
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="glass-panel p-12 text-center rounded-xl border border-[var(--border-glass)]">
            <AlertTriangle className="w-10 h-10 text-[var(--text-muted)] opacity-50 mx-auto mb-3" />
            <p className="text-sm font-bold text-gray-200">Alert Ingestion Queue is Clean</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">No security detections match the selected query criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};
