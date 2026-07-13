import React from 'react';
import { 
  AlertTriangle, 
  Ticket, 
  Flame, 
  ShieldAlert, 
  MapPin,
  TrendingUp,
  Activity
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { DashboardStats, AlertEntry } from '../types';
import { MetricCard } from '../components/MetricCard';

interface DashboardProps {
  stats: DashboardStats | null;
  recentAlerts: AlertEntry[];
}

const COLORS = ['#8b5cf6', '#06b6d4', '#ec4899', '#f59e0b', '#3b82f6'];

export const Dashboard: React.FC<DashboardProps> = ({ stats, recentAlerts }) => {
  if (!stats) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)]">
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-cyan)]"></div>
          <span className="text-xs text-[var(--text-muted)] tracking-wider">AGGREGATING CYBER COMMAND METRICS...</span>
        </div>
      </div>
    );
  }

  // Determine security score color class
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400 border-green-500/30';
    if (score >= 50) return 'text-yellow-400 border-yellow-500/30';
    return 'text-red-400 border-red-500/30';
  };

  return (
    <div className="space-y-6 p-6 overflow-y-auto max-h-[calc(100vh-80px)]">
      {/* Overview Banner and Security Score */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Security Score Card */}
        <div className="glass-panel p-6 rounded-xl flex flex-col items-center justify-center border border-[var(--border-glass)] shadow-lg relative overflow-hidden bg-gradient-to-b from-purple-950/20 to-cyan-950/5 lg:col-span-1">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--accent-violet)] opacity-10 rounded-full blur-2xl"></div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)] mb-3">
            System Risk Rating
          </span>
          <div className="relative flex items-center justify-center">
            {/* Circular score gauge */}
            <div className={`w-32 h-32 rounded-full border-4 border-dashed flex flex-col items-center justify-center transition-all duration-1000 ${getScoreColor(stats.securityScore)} glow-active`}>
              <span className="text-4xl font-black font-mono tracking-tighter">{stats.securityScore}</span>
              <span className="text-[10px] uppercase font-extrabold tracking-widest opacity-80 mt-0.5">SCORE</span>
            </div>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-4 text-center">
            {stats.securityScore >= 80 ? '🔒 Threat Mitigation Optimal' : stats.securityScore >= 50 ? '⚠️ Warning: Unresolved Incidents' : '🚨 CRITICAL: Active Incidents Detected'}
          </p>
        </div>

        {/* Dashboard Metrics */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard 
            title="Active Security Alerts" 
            value={stats.metrics.totalAlerts} 
            icon={AlertTriangle} 
            color="cyan"
            description={`${stats.metrics.unresolvedAlerts} Alerts awaiting triage`}
          />
          <MetricCard 
            title="Total Incidents" 
            value={stats.metrics.totalIncidents} 
            icon={Ticket} 
            color="purple"
            description={`${stats.metrics.openIncidents} Open incident cases`}
          />
          <MetricCard 
            title="Critical Threats" 
            value={stats.metrics.criticalAlerts} 
            icon={Flame} 
            color="red"
            description="Automatic SOAR playbooks triggered"
          />
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Trend Area Chart */}
        <div className="glass-panel p-6 rounded-xl border border-[var(--border-glass)] xl:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold tracking-wider text-gray-200 uppercase flex items-center space-x-2">
              <TrendingUp className="w-4.5 h-4.5 text-[var(--accent-cyan)]" />
              <span>Incident Correlation Trend</span>
            </h3>
            <span className="text-[10px] bg-black/40 px-2 py-1 rounded text-gray-400">Last 7 Days</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAlerts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-cyan)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--accent-cyan)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorIncidents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-violet)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--accent-violet)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f2e" />
                <XAxis dataKey="day" stroke="#6b7280" style={{ fontSize: 10, fontFamily: 'monospace' }} />
                <YAxis stroke="#6b7280" style={{ fontSize: 10, fontFamily: 'monospace' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#11111c', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8 }}
                  labelStyle={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}
                  itemStyle={{ fontSize: 11 }}
                />
                <Area type="monotone" dataKey="alerts" name="Correlated Alerts" stroke="var(--accent-cyan)" fillOpacity={1} fill="url(#colorAlerts)" strokeWidth={2} />
                <Area type="monotone" dataKey="incidents" name="Open Incidents" stroke="var(--accent-violet)" fillOpacity={1} fill="url(#colorIncidents)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Threat Categories Pie Chart */}
        <div className="glass-panel p-6 rounded-xl border border-[var(--border-glass)]">
          <h3 className="text-sm font-bold tracking-wider text-gray-200 uppercase flex items-center space-x-2 mb-6">
            <Activity className="w-4.5 h-4.5 text-[var(--accent-violet)]" />
            <span>Threat Taxonomy</span>
          </h3>
          <div className="h-60 flex justify-center items-center">
            {stats.categories.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.categories}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="category"
                  >
                    {stats.categories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#11111c', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8 }}
                    itemStyle={{ fontSize: 11, color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-xs text-[var(--text-muted)] font-mono">No data logged.</span>
            )}
          </div>
          
          {/* Legend/Labels */}
          <div className="mt-2 space-y-1">
            {stats.categories.map((c, i) => (
              <div key={c.category} className="flex justify-between items-center text-xs font-mono">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                  <span className="text-gray-300">{c.category}</span>
                </div>
                <span className="text-white font-bold">{c.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ranks and Triage Feed */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Attacker IPs & Devices Ranks */}
        <div className="glass-panel p-6 rounded-xl border border-[var(--border-glass)]">
          <h3 className="text-sm font-bold tracking-wider text-gray-200 uppercase flex items-center space-x-2 mb-4">
            <Flame className="w-4.5 h-4.5 text-red-500" />
            <span>Top Threat Origin IPs</span>
          </h3>
          <div className="space-y-3">
            {stats.topAttackers.map((attacker, i) => (
              <div key={attacker.ip} className="flex items-center justify-between p-2.5 bg-black/30 rounded-lg border border-red-500/10 font-mono text-xs">
                <div className="flex items-center space-x-2.5">
                  <span className="bg-red-500/15 text-red-400 font-bold w-5 h-5 flex items-center justify-center rounded">
                    {i + 1}
                  </span>
                  <span className="text-gray-200 font-semibold">{attacker.ip}</span>
                </div>
                <span className="text-[var(--accent-cyan)] font-extrabold bg-[var(--accent-cyan)]/10 px-2 py-0.5 rounded border border-[var(--accent-cyan)]/25">
                  {attacker.count} Events
                </span>
              </div>
            ))}
          </div>

          <h3 className="text-sm font-bold tracking-wider text-gray-200 uppercase flex items-center space-x-2 mt-6 mb-4">
            <MapPin className="w-4.5 h-4.5 text-[var(--accent-cyan)]" />
            <span>Top Incident Sources</span>
          </h3>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.devices} layout="vertical" margin={{ left: -10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f2e" horizontal={false} />
                <XAxis type="number" stroke="#6b7280" style={{ fontSize: 9 }} />
                <YAxis dataKey="name" type="category" stroke="#6b7280" style={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ backgroundColor: '#11111c' }} />
                <Bar dataKey="value" fill="var(--accent-cyan)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Alerts Command Feed */}
        <div className="glass-panel p-6 rounded-xl border border-[var(--border-glass)] xl:col-span-2">
          <h3 className="text-sm font-bold tracking-wider text-gray-200 uppercase flex items-center space-x-2 mb-4">
            <ShieldAlert className="w-4.5 h-4.5 text-yellow-500 animate-pulse" />
            <span>Live Security Command Feed</span>
          </h3>
          
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {recentAlerts.length > 0 ? (
              recentAlerts.map((alert) => {
                const badge = alert.severity === 'Critical' 
                  ? 'bg-red-500/10 text-red-400 border border-red-500/30' 
                  : alert.severity === 'High' 
                  ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30' 
                  : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30';
                  
                return (
                  <div key={alert.id} className="p-3 bg-black/25 rounded-lg border border-[var(--border-glass)] flex flex-col md:flex-row justify-between items-start md:items-center space-y-2 md:space-y-0 hover:bg-black/45 transition-colors">
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-center space-x-2">
                        <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-widest ${badge}`}>
                          {alert.severity}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] font-mono">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="text-[10px] text-[var(--accent-cyan)] font-mono">
                          MITRE: {alert.mitre_technique || 'T1204'}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-gray-200 mt-1 truncate">{alert.title}</p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate">{alert.description}</p>
                    </div>
                    <div className="text-right text-[10px] font-mono text-[var(--text-muted)] self-end md:self-center">
                      <span>IP: {alert.ip_address || 'unknown'}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ShieldAlert className="w-8 h-8 text-[var(--text-muted)] opacity-50 mb-2" />
                <p className="text-xs text-[var(--text-muted)]">Listening for live network events on WebSocket...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
