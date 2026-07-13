import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Play, 
  Check, 
  Sliders, 
  Download, 
  History,
  Info
} from 'lucide-react';
import { PlaybookSchema, SettingsSchema } from '../types';
import { apiService } from '../services/api';

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SettingsSchema | null>(null);
  const [playbooks, setPlaybooks] = useState<PlaybookSchema[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Form states
  const [slackWebhook, setSlackWebhook] = useState('');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(2525);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [autoIsolate, setAutoIsolate] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const settingsData = await apiService.getSettings();
      setSettings(settingsData);
      setSlackWebhook(settingsData.slack_webhook);
      setSmtpHost(settingsData.smtp_host);
      setSmtpPort(settingsData.smtp_port);
      setSmtpUser(settingsData.smtp_user);
      setSmtpPass(settingsData.smtp_pass);
      setTelegramToken(settingsData.telegram_bot_token);
      setTelegramChatId(settingsData.telegram_chat_id);
      setAutoIsolate(settingsData.auto_isolate_critical);

      const pbData = await apiService.getPlaybooks();
      setPlaybooks(pbData);

      const auditData = await apiService.getAuditLogs(15);
      setAuditLogs(auditData);
    } catch (err) {
      console.error('Failed to load settings data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSaveMessage('');
    try {
      await apiService.updateSettings({
        slack_webhook: slackWebhook,
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_user: smtpUser,
        smtp_pass: smtpPass,
        telegram_bot_token: telegramToken,
        telegram_chat_id: telegramChatId,
        auto_isolate_critical: autoIsolate,
        auto_escalate_severity: "Critical"
      });
      setSaveMessage('Settings updated successfully!');
      setTimeout(() => setSaveMessage(''), 4000);
    } catch (err) {
      setSaveMessage('Failed to update settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTogglePlaybook = async (pbId: string, currentStatus: boolean) => {
    try {
      await apiService.togglePlaybook(pbId, !currentStatus);
      // Refresh playbooks list
      const pbData = await apiService.getPlaybooks();
      setPlaybooks(pbData);
    } catch (err) {
      console.error('Failed to toggle playbook', err);
    }
  };

  const handleDownloadReport = (format: 'csv' | 'excel' | 'json') => {
    const url = apiService.getReportDownloadUrl(format);
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)]">
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-cyan)]"></div>
          <span className="text-xs text-[var(--text-muted)] tracking-wider">TRIAGING PLATFORM CONFIGURATIONS...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-80px)]">
      
      {/* Upper Grid: Playbooks and Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Playbooks Board */}
        <div className="lg:col-span-6 glass-panel p-6 rounded-xl border border-[var(--border-glass)] flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-bold tracking-wider text-gray-200 uppercase flex items-center space-x-2 border-b border-[var(--border-glass)] pb-3">
              <Sliders className="w-4.5 h-4.5 text-[var(--accent-violet)]" />
              <span>SOAR Playbook Dashboard</span>
            </h3>
            <p className="text-xs text-[var(--text-muted)] my-3">
              Triage and automate system threat responses. Enable or disable playbook scripts that execute during intrusion detections.
            </p>
            
            <div className="space-y-3">
              {playbooks.map((pb) => (
                <div key={pb.id} className="p-4 bg-black/35 rounded-xl border border-[var(--border-glass)] flex items-center justify-between">
                  <div className="flex-1 min-w-0 pr-4">
                    <span className="text-xs font-bold text-gray-200 block">{pb.name}</span>
                    <span className="text-[11px] text-[var(--text-muted)] block mt-0.5 leading-relaxed">{pb.description}</span>
                    <div className="flex items-center space-x-4 mt-2 text-[10px] font-mono text-[var(--accent-cyan)]">
                      <span>Trigger: {pb.trigger_category}</span>
                      <span>Action: {pb.action_type.replace('_', ' ')}</span>
                    </div>
                  </div>
                  
                  {/* Slider Switch */}
                  <button
                    onClick={() => handleTogglePlaybook(pb.id, pb.is_active)}
                    className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors cursor-pointer ${
                      pb.is_active ? 'bg-[var(--accent-cyan)]' : 'bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        pb.is_active ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Configurations Forms */}
        <form onSubmit={handleSaveSettings} className="lg:col-span-6 glass-panel p-6 rounded-xl border border-[var(--border-glass)] flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-bold tracking-wider text-gray-200 uppercase flex items-center space-x-2 border-b border-[var(--border-glass)] pb-3">
              <SettingsIcon className="w-4.5 h-4.5 text-[var(--accent-cyan)]" />
              <span>SOC Integration Settings</span>
            </h3>
            <p className="text-xs text-[var(--text-muted)] my-3">
              Configure endpoints and keys for external alerts systems, ticketing notification feeds, and mitigation networks.
            </p>

            {saveMessage && (
              <div className="bg-green-500/10 border border-green-500/25 text-green-400 p-3 rounded-lg text-xs font-semibold mb-3">
                {saveMessage}
              </div>
            )}

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 block mb-1">Slack Webhook URL</label>
                <input
                  type="text"
                  value={slackWebhook}
                  onChange={(e) => setSlackWebhook(e.target.value)}
                  placeholder="https://hooks.slack.com/services/YOUR_WORKSPACE/YOUR_CHANNEL/YOUR_TOKEN"
                  className="w-full bg-black/40 border border-[var(--border-glass)] rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-[var(--accent-cyan)] font-mono"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 block mb-1">SMTP Outbound Host</label>
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    className="w-full bg-black/40 border border-[var(--border-glass)] rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-[var(--accent-cyan)] font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 block mb-1">SMTP Port</label>
                  <input
                    type="number"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(Number(e.target.value))}
                    className="w-full bg-black/40 border border-[var(--border-glass)] rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-[var(--accent-cyan)] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 block mb-1">SMTP Username</label>
                  <input
                    type="text"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    className="w-full bg-black/40 border border-[var(--border-glass)] rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-[var(--accent-cyan)] font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 block mb-1">SMTP Password</label>
                  <input
                    type="password"
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-black/40 border border-[var(--border-glass)] rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-[var(--accent-cyan)] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400 block mb-1">Telegram Bot API Token</label>
                <input
                  type="text"
                  value={telegramToken}
                  onChange={(e) => setTelegramToken(e.target.value)}
                  placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                  className="w-full bg-black/40 border border-[var(--border-glass)] rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-[var(--accent-cyan)] font-mono"
                />
              </div>

              <div className="flex items-center space-x-3 bg-black/20 p-3 rounded-lg border border-[var(--border-glass)] mt-3">
                <input
                  id="auto_iso"
                  type="checkbox"
                  checked={autoIsolate}
                  onChange={(e) => setAutoIsolate(e.target.checked)}
                  className="w-4 h-4 rounded text-[var(--accent-cyan)] focus:ring-0 bg-transparent border-gray-700 cursor-pointer"
                />
                <label htmlFor="auto_iso" className="text-xs text-gray-300 select-none cursor-pointer">
                  Auto-isolate assets on Critical security alarms (simulated EDR sandbox triggers)
                </label>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={savingSettings}
            className="w-full btn-cyber-cyan py-2 rounded-lg text-xs font-bold text-white tracking-widest uppercase cursor-pointer"
          >
            {savingSettings ? 'Saving...' : 'Write Configuration'}
          </button>
        </form>
      </div>

      {/* Reports and Audits Station */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Reports Download Station */}
        <div className="lg:col-span-4 glass-panel p-6 rounded-xl border border-[var(--border-glass)] flex flex-col justify-start space-y-4">
          <h3 className="text-sm font-bold tracking-wider text-gray-200 uppercase flex items-center space-x-2 border-b border-[var(--border-glass)] pb-3">
            <Download className="w-4.5 h-4.5 text-[var(--accent-cyan)]" />
            <span>Compliance Exports</span>
          </h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Download incident files, mitigation timelines, and alert correlations for ISO 27001 or GDPR security compliance audits.
          </p>

          <div className="space-y-2.5 pt-2">
            <button
              onClick={() => handleDownloadReport('csv')}
              className="w-full bg-cyan-500/10 hover:bg-cyan-500/15 border border-cyan-500/20 text-[var(--accent-cyan)] py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 cursor-pointer transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV Report</span>
            </button>
            
            <button
              onClick={() => handleDownloadReport('excel')}
              className="w-full bg-green-500/10 hover:bg-green-500/15 border border-green-500/20 text-green-400 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 cursor-pointer transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel Document</span>
            </button>

            <button
              onClick={() => handleDownloadReport('json')}
              className="w-full bg-purple-500/10 hover:bg-purple-500/15 border border-purple-500/20 text-[var(--accent-violet)] py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 cursor-pointer transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Raw JSON Metadata</span>
            </button>
          </div>
        </div>

        {/* System Audit Logs */}
        <div className="lg:col-span-8 glass-panel p-6 rounded-xl border border-[var(--border-glass)] flex flex-col justify-start space-y-4">
          <h3 className="text-sm font-bold tracking-wider text-gray-200 uppercase flex items-center space-x-2 border-b border-[var(--border-glass)] pb-3">
            <History className="w-4.5 h-4.5 text-[var(--accent-violet)]" />
            <span>Administrator Security Audit Logs</span>
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="text-gray-500 border-b border-[var(--border-glass)] pb-2 select-none">
                  <th className="py-2.5">Timestamp</th>
                  <th className="py-2.5">User Context</th>
                  <th className="py-2.5">Security Event</th>
                  <th className="py-2.5">Operation Scope</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length > 0 ? (
                  auditLogs.map((log, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-2.5 text-gray-500 select-none">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 text-gray-300 font-bold">{log.user}</td>
                      <td className="py-2.5 text-[var(--accent-cyan)] font-semibold">{log.action}</td>
                      <td className="py-2.5 text-gray-400 break-all">{log.details}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-500">No operational audit records logged in this session.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
