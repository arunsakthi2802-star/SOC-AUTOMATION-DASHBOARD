import React, { useState } from 'react';
import { Shield, Lock, Mail, Server } from 'lucide-react';
import { apiService } from '../services/api';
import { User } from '../types';

interface LoginProps {
  onLoginSuccess: (user: User, token: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [seedStatus, setSeedStatus] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await apiService.login(email, password);
      onLoginSuccess(data.user, data.access_token);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    setSeedStatus('Initializing...');
    try {
      const res = await apiService.seedUsers();
      setSeedStatus('Database initialized!');
      setEmail('admin@soc.local');
      setPassword('AdminPass123!');
      setTimeout(() => setSeedStatus(''), 4000);
    } catch (err) {
      setSeedStatus('Initialization failed.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative p-4">
      {/* Decorative cyber grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,35,0)_95%,rgba(6,182,212,0.05)_95%),linear-gradient(90deg,rgba(18,16,35,0)_95%,rgba(6,182,212,0.05)_95%)] bg-[size:40px_40px] pointer-events-none"></div>
      
      <div className="max-w-md w-full glass-panel p-8 rounded-2xl border border-[var(--border-glass)] relative z-10 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex bg-gradient-to-tr from-[var(--accent-violet)] to-[var(--accent-cyan)] p-3.5 rounded-2xl glow-active mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-wide text-glow-cyan text-white">
            SOC CYBER COMMAND
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-1.5 uppercase tracking-widest">
            Restricted Operator Authentication
          </p>
        </div>

        {error && (
          <div className="mb-5 bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-xs leading-relaxed">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)] block mb-1.5">
              Operator Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4.5 h-4.5 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@soc.local"
                className="w-full bg-black/40 border border-[var(--border-glass)] rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[var(--accent-cyan)] focus:ring-1 focus:ring-[var(--accent-cyan)] transition-all font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-muted)] block mb-1.5">
              Security Passphrase
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4.5 h-4.5 text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-black/40 border border-[var(--border-glass)] rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[var(--accent-cyan)] focus:ring-1 focus:ring-[var(--accent-cyan)] transition-all font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-cyber-cyan py-3 rounded-lg text-sm font-bold text-white tracking-widest uppercase cursor-pointer disabled:opacity-50 transition-all mt-6"
          >
            {loading ? 'Decrypting Session...' : 'Authenticate Token'}
          </button>
        </form>

        {/* Database seed tool if fresh install */}
        <div className="mt-8 pt-6 border-t border-[var(--border-glass)] text-center">
          <p className="text-[11px] text-[var(--text-muted)] mb-3.5">
            Testing on a fresh deployment environment?
          </p>
          <button
            onClick={handleSeed}
            className="inline-flex items-center space-x-2 bg-purple-500/10 hover:bg-purple-500/20 text-[var(--accent-violet)] border border-purple-500/20 px-4 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer"
          >
            <Server className="w-3.5 h-3.5" />
            <span>{seedStatus || 'Seed Database Users'}</span>
          </button>
          
          <div className="mt-4 bg-black/30 p-2.5 rounded-lg border border-[var(--border-glass)] text-[10px] text-left text-gray-400 font-mono space-y-1">
            <p className="text-[var(--accent-cyan)] font-bold">Default seeded accounts:</p>
            <p>Admin: admin@soc.local / AdminPass123!</p>
            <p>Analyst: analyst@soc.local / AnalystPass123!</p>
          </div>
        </div>
      </div>
    </div>
  );
};
