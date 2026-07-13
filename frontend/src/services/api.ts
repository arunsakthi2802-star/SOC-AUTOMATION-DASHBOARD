import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept requests to inject JWT auth header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('soc_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Intercept responses to handle auth errors (401 / token expiration)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('soc_token');
      localStorage.removeItem('soc_user');
      // Redirect to login page if we aren't already there
      if (!window.location.pathname.endsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const apiService = {
  // Authentication
  async login(username: string, password: string) {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    
    const response = await api.post('/auth/login', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    return response.data;
  },
  
  async getMe() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  async seedUsers() {
    const response = await api.post('/auth/seed');
    return response.data;
  },
  
  // Dashboard
  async getDashboardStats() {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },
  
  // Logs
  async getLogs(source?: string, severity?: string, limit = 100, skip = 0) {
    const params: any = { limit, skip };
    if (source) params.source = source;
    if (severity) params.severity = severity;
    const response = await api.get('/logs', { params });
    return response.data;
  },
  
  // Alerts
  async getAlerts(severity?: string, status?: string, limit = 50, skip = 0) {
    const params: any = { limit, skip };
    if (severity) params.severity = severity;
    if (status) params.status = status;
    const response = await api.get('/alerts', { params });
    return response.data;
  },
  
  async updateAlert(alertId: string, status: string) {
    const response = await api.patch(`/alerts/${alertId}`, { status });
    return response.data;
  },
  
  // Incidents
  async getIncidents(status?: string, severity?: string, limit = 50, skip = 0) {
    const params: any = { limit, skip };
    if (status) params.status_filter = status;
    if (severity) params.severity = severity;
    const response = await api.get('/incidents', { params });
    return response.data;
  },
  
  async createIncident(title: string, description: string, severity: string, assignedTo?: string, evidence: any[] = []) {
    const response = await api.post('/incidents', {
      title,
      description,
      severity,
      assigned_to: assignedTo,
      evidence
    });
    return response.data;
  },
  
  async updateIncident(incidentId: string, updates: {
    status?: string;
    severity?: string;
    assigned_to?: string;
    timeline_event?: string;
    root_cause?: string;
    lessons_learned?: string;
  }) {
    const response = await api.patch(`/incidents/${incidentId}`, updates);
    return response.data;
  },
  
  // Threat Intel
  async lookupThreat(query: string) {
    const response = await api.get('/threats/lookup', { params: { query } });
    return response.data;
  },
  
  // Settings
  async getSettings() {
    const response = await api.get('/settings');
    return response.data;
  },
  
  async updateSettings(settings: any) {
    const response = await api.patch('/settings', settings);
    return response.data;
  },
  
  // Playbooks
  async getPlaybooks() {
    const response = await api.get('/playbooks');
    return response.data;
  },
  
  async togglePlaybook(playbookId: string, isActive: boolean) {
    const response = await api.patch(`/playbooks/${playbookId}`, null, {
      params: { is_active: isActive }
    });
    return response.data;
  },
  
  // Admin & Users
  async getUsers() {
    const response = await api.get('/users');
    return response.data;
  },
  
  async getAuditLogs(limit = 50) {
    const response = await api.get('/audit-logs', { params: { limit } });
    return response.data;
  },
  
  // Reports
  getReportDownloadUrl(format: 'csv' | 'excel' | 'json') {
    const token = localStorage.getItem('soc_token');
    return `${API_BASE}/reports/export?format=${format}&token=${token}`;
  }
};
