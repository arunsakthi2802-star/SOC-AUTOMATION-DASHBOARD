import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: 'cyan' | 'purple' | 'red' | 'yellow' | 'green';
  description?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon: Icon, color, description }) => {
  const colorMap = {
    cyan: {
      text: 'text-[var(--accent-cyan)]',
      border: 'border-cyan-500/20',
      glow: 'shadow-cyan-500/5',
      iconBg: 'bg-cyan-500/10 text-cyan-400',
      line: 'bg-cyan-500'
    },
    purple: {
      text: 'text-[var(--accent-violet)]',
      border: 'border-purple-500/20',
      glow: 'shadow-purple-500/5',
      iconBg: 'bg-purple-500/10 text-purple-400',
      line: 'bg-purple-500'
    },
    red: {
      text: 'text-red-400',
      border: 'border-red-500/20',
      glow: 'shadow-red-500/5',
      iconBg: 'bg-red-500/10 text-red-400',
      line: 'bg-red-500'
    },
    yellow: {
      text: 'text-yellow-400',
      border: 'border-yellow-500/20',
      glow: 'shadow-yellow-500/5',
      iconBg: 'bg-yellow-500/10 text-yellow-400',
      line: 'bg-yellow-500'
    },
    green: {
      text: 'text-green-400',
      border: 'border-green-500/20',
      glow: 'shadow-green-500/5',
      iconBg: 'bg-green-500/10 text-green-400',
      line: 'bg-green-500'
    }
  };

  const scheme = colorMap[color];

  return (
    <div className={`glass-panel p-6 rounded-xl flex flex-col justify-between relative overflow-hidden shadow-lg border ${scheme.border} ${scheme.glow}`}>
      {/* Decorative vertical colored stripe */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${scheme.line}`}></div>
      
      <div className="flex justify-between items-start">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-[var(--text-muted)] block mb-1">
            {title}
          </span>
          <span className="text-3xl font-extrabold tracking-tight text-white font-mono">
            {value}
          </span>
        </div>
        <div className={`p-2.5 rounded-lg ${scheme.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      
      {description && (
        <div className="mt-4 pt-3 border-t border-[var(--border-glass)]">
          <span className="text-[11px] text-[var(--text-muted)]">{description}</span>
        </div>
      )}
    </div>
  );
};
