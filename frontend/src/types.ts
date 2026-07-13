export type AlertSeverity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';
export type AlertStatus = 'New' | 'Acknowledged' | 'Suppressed' | 'Resolved';
export type IncidentStatus = 'Open' | 'Investigating' | 'Resolved' | 'Closed';

export interface User {
  email: string;
  name: string;
  role: 'Admin' | 'Analyst';
  created_at?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  source: string;
  event_id: number;
  message: string;
  severity: string;
  ip_address?: string;
  username?: string;
}

export interface AlertEntry {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  source_log_ids: string[];
  status: AlertStatus;
  mitre_technique?: string;
  category: string;
  ip_address?: string;
  username?: string;
}

export interface TimelineEvent {
  timestamp: string;
  analyst_name: string;
  message: string;
}

export interface IncidentEvidence {
  type: string;
  value: string;
  description?: string;
}

export interface IncidentEntry {
  id: string;
  title: string;
  description: string;
  status: IncidentStatus;
  severity: AlertSeverity;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  timeline: TimelineEvent[];
  evidence: IncidentEvidence[];
  mitre_technique?: string;
  root_cause?: string;
  lessons_learned?: string;
}

export interface ThreatIntelLookup {
  query: string;
  vt_positives: number;
  vt_total: number;
  abuse_score: number;
  reputation: 'Clean' | 'Suspicious' | 'Malicious';
  details: Record<string, any>;
  timestamp: string;
}

export interface SettingsSchema {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  slack_webhook: string;
  telegram_bot_token: string;
  telegram_chat_id: string;
  auto_isolate_critical: boolean;
  auto_escalate_severity: string;
}

export interface PlaybookSchema {
  id: string;
  name: string;
  description: string;
  trigger_category: string;
  action_type: string;
  is_active: boolean;
}

export interface DashboardStats {
  securityScore: number;
  metrics: {
    totalAlerts: number;
    unresolvedAlerts: number;
    criticalAlerts: number;
    highAlerts: number;
    mediumAlerts: number;
    lowAlerts: number;
    totalIncidents: number;
    openIncidents: number;
    investigatingIncidents: number;
    resolvedIncidents: number;
  };
  trends: Array<{
    day: string;
    incidents: number;
    alerts: number;
  }>;
  devices: Array<{ name: string; value: number }>;
  topAttackers: Array<{ ip: string; count: number }>;
  topCountries: Array<{ country: string; count: number }>;
  categories: Array<{ category: string; count: number }>;
}
