import React, { useState, useEffect } from 'react';
import { 
  TicketCheck, 
  UserPlus, 
  MessageSquarePlus, 
  Briefcase,
  AlertTriangle,
  FolderOpen,
  Send,
  Plus
} from 'lucide-react';
import { IncidentEntry, IncidentStatus, AlertSeverity } from '../types';
import { apiService } from '../services/api';

export const Incidents: React.FC = () => {
  const [incidents, setIncidents] = useState<IncidentEntry[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<IncidentEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  
  // Investigation actions state
  const [timelineComment, setTimelineComment] = useState('');
  const [assignee, setAssignee] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [lessonsLearned, setLessonsLearned] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<IncidentStatus>('Open');

  // Manual Creation state
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newSeverity, setNewSeverity] = useState<AlertSeverity>('Medium');
  const [newEvidenceVal, setNewEvidenceVal] = useState('');

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const data = await apiService.getIncidents(statusFilter || undefined);
      setIncidents(data);
      // Keep selected incident updated
      if (selectedIncident) {
        const updated = data.find((i: IncidentEntry) => i.id === selectedIncident.id);
        if (updated) setSelectedIncident(updated);
      }
    } catch (err) {
      console.error('Failed to fetch incidents', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [statusFilter]);

  // Load action forms when selection changes
  useEffect(() => {
    if (selectedIncident) {
      setAssignee(selectedIncident.assigned_to || '');
      setRootCause(selectedIncident.root_cause || '');
      setLessonsLearned(selectedIncident.lessons_learned || '');
      setSelectedStatus(selectedIncident.status);
    }
  }, [selectedIncident]);

  const handleUpdateIncident = async () => {
    if (!selectedIncident) return;
    try {
      await apiService.updateIncident(selectedIncident.id, {
        status: selectedStatus,
        assigned_to: assignee || undefined,
        root_cause: rootCause || undefined,
        lessons_learned: lessonsLearned || undefined,
        timeline_event: timelineComment ? timelineComment : undefined
      });
      setTimelineComment('');
      await fetchIncidents();
    } catch (err) {
      console.error('Failed to update incident', err);
    }
  };

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDesc) return;
    
    try {
      const evidence = newEvidenceVal ? [{ type: "IP Address", value: newEvidenceVal, description: "Initial IOC" }] : [];
      await apiService.createIncident(newTitle, newDesc, newSeverity, undefined, evidence);
      
      // Reset creation state
      setIsCreating(false);
      setNewTitle('');
      setNewDesc('');
      setNewSeverity('Medium');
      setNewEvidenceVal('');
      
      fetchIncidents();
    } catch (err) {
      console.error('Failed to create manual incident', err);
    }
  };

  const getSeverityStyle = (sev: string) => {
    switch (sev) {
      case 'Critical': return 'bg-red-500/10 text-red-400 border border-red-500/30';
      case 'High': return 'bg-orange-500/10 text-orange-400 border border-orange-500/30';
      case 'Medium': return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30';
      default: return 'bg-blue-500/10 text-blue-400 border border-blue-500/30';
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Open': return 'text-red-400 border border-red-500/20 bg-red-400/5';
      case 'Investigating': return 'text-cyan-400 border border-cyan-500/20 bg-cyan-400/5';
      case 'Resolved': return 'text-green-400 border border-green-500/20 bg-green-400/5';
      default: return 'text-gray-400 border border-gray-500/20 bg-gray-400/5';
    }
  };

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto max-h-[calc(100vh-80px)]">
      {/* Left Pane: Incident ticket listings */}
      <div className={`${selectedIncident || isCreating ? 'lg:col-span-6' : 'lg:col-span-12'} space-y-4`}>
        {/* Toolbar */}
        <div className="glass-panel p-4 rounded-xl border border-[var(--border-glass)] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-black/40 border border-[var(--border-glass)] rounded-lg py-2 px-3 text-xs text-gray-300 focus:outline-none focus:border-[var(--accent-cyan)] font-mono"
            >
              <option value="">All Statuses</option>
              <option value="Open">Open</option>
              <option value="Investigating">Investigating</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          <button
            onClick={() => { setSelectedIncident(null); setIsCreating(true); }}
            className="btn-cyber-cyan flex items-center space-x-1.5 py-2 px-4 rounded-lg text-xs font-bold text-white tracking-widest uppercase cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Open Case</span>
          </button>
        </div>

        {/* List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-cyan)] mx-auto mb-3"></div>
              <span className="text-xs text-[var(--text-muted)] font-mono">LOADING CYBER INCIDENTS...</span>
            </div>
          ) : incidents.length > 0 ? (
            incidents.map((inc) => (
              <div
                key={inc.id}
                onClick={() => { setIsCreating(false); setSelectedIncident(inc); }}
                className={`glass-panel p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  selectedIncident?.id === inc.id 
                    ? 'border-[var(--accent-cyan)] shadow-[0_0_15px_rgba(6,182,212,0.15)] bg-cyan-950/10'
                    : 'border-[var(--border-glass)] hover:border-gray-500/30'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded tracking-widest ${getSeverityStyle(inc.severity)}`}>
                        {inc.severity}
                      </span>
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded tracking-widest ${getStatusStyle(inc.status)}`}>
                        {inc.status}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] font-mono">
                        {new Date(inc.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-sm text-gray-100">{inc.title}</h4>
                  </div>
                </div>
                
                <div className="flex justify-between items-center text-xs font-mono text-[var(--text-muted)] border-t border-[var(--border-glass)] pt-3">
                  <span>Owner: <strong className="text-gray-300">{inc.assigned_to || 'UNASSIGNED'}</strong></span>
                  <span>Timeline: <strong className="text-gray-300">{inc.timeline.length} Steps</strong></span>
                </div>
              </div>
            ))
          ) : (
            <div className="glass-panel p-12 text-center rounded-xl border border-[var(--border-glass)]">
              <TicketCheck className="w-10 h-10 text-[var(--text-muted)] opacity-50 mx-auto mb-3" />
              <p className="text-sm font-bold text-gray-200">No Incident Tickets Logged</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Excellent! All threats have been mitigated or closed.</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Pane: Investigation Detailed View */}
      {selectedIncident && (
        <div className="lg:col-span-6 glass-panel p-6 rounded-xl border border-[var(--accent-cyan)]/30 flex flex-col justify-between space-y-6 bg-gradient-to-b from-black/40 to-black/10">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-[var(--border-glass)] pb-4">
            <div>
              <h3 className="text-lg font-bold text-white">{selectedIncident.title}</h3>
              <span className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5 block">CASE FILE ID: {selectedIncident.id}</span>
            </div>
            <button 
              onClick={() => setSelectedIncident(null)} 
              className="text-gray-400 hover:text-white font-bold text-xs bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded"
            >
              Close Triage
            </button>
          </div>

          {/* Incident Details Summary */}
          <div className="space-y-4 text-xs">
            <p className="text-gray-300 leading-relaxed"><strong className="text-gray-400">Description:</strong> {selectedIncident.description}</p>
            
            {selectedIncident.mitre_technique && (
              <p className="font-mono text-[var(--accent-cyan)]"><strong className="text-gray-400">MITRE Technique:</strong> {selectedIncident.mitre_technique}</p>
            )}

            {/* Evidence/IOC Box */}
            {selectedIncident.evidence.length > 0 && (
              <div className="bg-black/30 p-3 rounded-lg border border-[var(--border-glass)] font-mono">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-cyan)] block mb-1">Indicators of Compromise (IOC)</span>
                {selectedIncident.evidence.map((ev, i) => (
                  <div key={i} className="flex justify-between items-center text-[11px] py-1 border-b border-white/5 last:border-b-0">
                    <span className="text-gray-400">{ev.type}: {ev.value}</span>
                    <span className="text-[var(--text-muted)] text-[10px]">{ev.description}</span>
                  </div>
                ))}
              </div>
            )}
            
            {/* Triage / Management Forms */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-black/20 p-4 rounded-xl border border-[var(--border-glass)]">
              <div>
                <label className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)] block mb-1">Assigned Analyst</label>
                <input
                  type="text"
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  placeholder="e.g. Analyst L2 Aakash"
                  className="w-full bg-black/40 border border-[var(--border-glass)] rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-[var(--accent-cyan)] font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)] block mb-1">Case Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as IncidentStatus)}
                  className="w-full bg-black/40 border border-[var(--border-glass)] rounded-lg py-1.5 px-2 text-xs text-gray-300 focus:outline-none focus:border-[var(--accent-cyan)] font-mono"
                >
                  <option value="Open">Open</option>
                  <option value="Investigating">Investigating</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)] block mb-1">Root Cause</label>
                <textarea
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  placeholder="Analyze logs to verify intrusion source..."
                  rows={2}
                  className="w-full bg-black/40 border border-[var(--border-glass)] rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-[var(--accent-cyan)] font-mono resize-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)] block mb-1">Lessons Learned</label>
                <textarea
                  value={lessonsLearned}
                  onChange={(e) => setLessonsLearned(e.target.value)}
                  placeholder="Document remediations, block list configs..."
                  rows={2}
                  className="w-full bg-black/40 border border-[var(--border-glass)] rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-[var(--accent-cyan)] font-mono resize-none"
                />
              </div>
            </div>
          </div>

          {/* Interactive Timeline */}
          <div className="border-t border-[var(--border-glass)] pt-4 space-y-3 flex-1 flex flex-col justify-between min-h-[220px]">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)] block">Investigation Audit Timeline</span>
            
            <div className="space-y-3 overflow-y-auto max-h-56 flex-1 pr-1 border-b border-[var(--border-glass)] pb-3">
              {selectedIncident.timeline.map((event, i) => (
                <div key={i} className="flex items-start space-x-3 text-xs relative">
                  {/* Vertical line connector */}
                  {i < selectedIncident.timeline.length - 1 && (
                    <div className="absolute left-[7px] top-[18px] bottom-[-18px] w-0.5 bg-purple-500/20"></div>
                  )}
                  <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-[var(--accent-violet)] to-[var(--accent-cyan)] border border-black flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center text-[10px] text-[var(--text-muted)]">
                      <strong className="text-gray-200">{event.analyst_name}</strong>
                      <span className="font-mono">{new Date(event.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-gray-300 mt-0.5 leading-relaxed font-mono text-[11px]">{event.message}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Timeline Notes Comment input */}
            <div className="flex items-center space-x-2 pt-2">
              <input
                type="text"
                value={timelineComment}
                onChange={(e) => setTimelineComment(e.target.value)}
                placeholder="Log observation notes to ticket timeline..."
                className="flex-1 bg-black/40 border border-[var(--border-glass)] rounded-lg py-2 px-3.5 text-xs text-white focus:outline-none focus:border-[var(--accent-cyan)] font-mono"
              />
              <button
                onClick={handleUpdateIncident}
                className="btn-cyber-purple p-2 rounded-lg text-white cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* manual Incident Creation Drawer */}
      {isCreating && (
        <div className="lg:col-span-6 glass-panel p-6 rounded-xl border border-[var(--accent-cyan)] flex flex-col justify-between space-y-6">
          <div className="flex justify-between items-center border-b border-[var(--border-glass)] pb-4">
            <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <FolderOpen className="w-5 h-5 text-[var(--accent-cyan)]" />
              <span>Create Manual Security Case</span>
            </h3>
            <button 
              onClick={() => setIsCreating(false)} 
              className="text-gray-400 hover:text-white font-bold text-xs bg-white/5 hover:bg-white/10 px-2 py-1 rounded"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleCreateIncident} className="space-y-4 text-xs">
            <div>
              <label className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)] block mb-1.5">Case Title</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Unauthorized Web Server Directory Traversal"
                className="w-full bg-black/40 border border-[var(--border-glass)] rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-[var(--accent-cyan)] font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)] block mb-1.5">Incident Severity</label>
              <select
                value={newSeverity}
                onChange={(e) => setNewSeverity(e.target.value as AlertSeverity)}
                className="w-full bg-black/40 border border-[var(--border-glass)] rounded-lg py-2 px-2.5 text-xs text-gray-300 focus:outline-none focus:border-[var(--accent-cyan)] font-mono"
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)] block mb-1.5">Target IP / IOC Value</label>
              <input
                type="text"
                value={newEvidenceVal}
                onChange={(e) => setNewEvidenceVal(e.target.value)}
                placeholder="e.g. 198.51.100.42"
                className="w-full bg-black/40 border border-[var(--border-glass)] rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-[var(--accent-cyan)] font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)] block mb-1.5">Detailed Case Investigation Scope</label>
              <textarea
                required
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Describe the anomalies detected, potential impact, and host details..."
                rows={5}
                className="w-full bg-black/40 border border-[var(--border-glass)] rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-[var(--accent-cyan)] font-mono resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full btn-cyber-cyan py-2.5 rounded-lg text-xs font-bold text-white tracking-widest uppercase cursor-pointer transition-all mt-4"
            >
              Initialize Incident Ticket
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
