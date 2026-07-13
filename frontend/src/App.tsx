import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { AlertTicker } from './components/AlertTicker';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Alerts } from './pages/Alerts';
import { Incidents } from './pages/Incidents';
import { Logs } from './pages/Logs';
import { ThreatIntel } from './pages/ThreatIntel';
import { Settings } from './pages/Settings';
import { User, LogEntry, AlertEntry, DashboardStats } from './types';
import { apiService } from './services/api';

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  
  // Real-time data streams
  const [liveLogs, setLiveLogs] = useState<LogEntry[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<AlertEntry[]>([]);
  const [latestAlert, setLatestAlert] = useState<AlertEntry | null>(null);
  
  // Dashboard overall aggregates
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Restore authenticated session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('soc_token');
    const savedUserStr = localStorage.getItem('soc_user');
    
    if (savedToken && savedUserStr) {
      setToken(savedToken);
      try {
        setUser(JSON.parse(savedUserStr));
      } catch (e) {
        handleLogout();
      }
    }
  }, []);

  const handleLoginSuccess = (loggedInUser: User, sessionToken: string) => {
    localStorage.setItem('soc_token', sessionToken);
    localStorage.setItem('soc_user', JSON.stringify(loggedInUser));
    setToken(sessionToken);
    setUser(loggedInUser);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('soc_token');
    localStorage.removeItem('soc_user');
    setUser(null);
    setToken(null);
    
    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
    }
  };

  const fetchStats = async () => {
    try {
      const data = await apiService.getDashboardStats();
      setStats(data);
    } catch (e) {
      console.error("Failed to load dashboard metrics", e);
    }
  };

  const fetchInitialAlerts = async () => {
    try {
      const data = await apiService.getAlerts(undefined, undefined, 10);
      setRecentAlerts(data);
    } catch (e) {
      console.error("Failed to load initial alerts feed", e);
    }
  };

  // Fetch initial aggregates once authenticated
  useEffect(() => {
    if (user && token) {
      fetchStats();
      fetchInitialAlerts();
    }
  }, [user, token]);

  // WebSocket Live Sync Logic
  useEffect(() => {
    if (!user || !token) return;

    let reconnectTimer: any;
    
    const connectWS = () => {
      console.log("Connecting log routing WebSocket...");
      const wsUrl = `ws://localhost:8000/api/logs/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket linked to backend parser.");
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          if (payload.type === 'log') {
            const newLog: LogEntry = payload.data;
            setLiveLogs(prev => {
              const updated = [...prev, newLog];
              if (updated.length > 250) {
                return updated.slice(updated.length - 250); // Cap buffer
              }
              return updated;
            });
          } 
          else if (payload.type === 'alert') {
            const newAlert: AlertEntry = payload.data;
            // Append to command feed
            setRecentAlerts(prev => [newAlert, ...prev].slice(0, 10));
            // Trigger speech and slide notification banner
            setLatestAlert(newAlert);
            // Refresh stats counters instantly
            fetchStats();
          }
        } catch (e) {
          console.error("WS message parse failed", e);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected from event receiver.");
        setWsConnected(false);
        // Attempt reconnection after 4 seconds
        reconnectTimer = setTimeout(connectWS, 4000);
      };

      ws.onerror = (err) => {
        console.error("WS error recorded: ", err);
        ws.close();
      };
    };

    connectWS();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      clearTimeout(reconnectTimer);
    };
  }, [user, token]);

  // Compute unacknowledged alerts for badge
  const unresolvedAlertsCount = stats?.metrics.unresolvedAlerts || 0;

  // Render proper child component based on navigation state
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard stats={stats} recentAlerts={recentAlerts} />;
      case 'alerts':
        return <Alerts />;
      case 'incidents':
        return <Incidents />;
      case 'logs':
        return (
          <Logs 
            liveLogs={liveLogs} 
            clearLiveLogs={() => setLiveLogs([])} 
          />
        );
      case 'intel':
        return <ThreatIntel />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard stats={stats} recentAlerts={recentAlerts} />;
    }
  };

  if (!user || !token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg-dark)] text-[var(--text-primary)]">
      {/* Sidebar Navigation */}
      <Sidebar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
        user={user} 
        onLogout={handleLogout} 
        unresolvedCount={unresolvedAlertsCount}
      />
      
      {/* Core Layout Pane */}
      <div className="flex-1 flex flex-col justify-start relative min-w-0">
        <Header title={currentPage} wsConnected={wsConnected} />
        <main className="flex-1 overflow-hidden">
          {renderPage()}
        </main>
      </div>

      {/* Floating Audio & Banner Ticker Alert Notification */}
      <AlertTicker latestAlert={latestAlert} onClear={() => setLatestAlert(null)} />
    </div>
  );
};

export default App;
