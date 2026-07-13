import React, { useEffect, useState } from 'react';
import { AlertTriangle, X, ShieldAlert } from 'lucide-react';
import { AlertEntry } from '../types';

interface AlertTickerProps {
  latestAlert: AlertEntry | null;
  onClear: () => void;
}

export const AlertTicker: React.FC<AlertTickerProps> = ({ latestAlert, onClear }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (latestAlert) {
      setVisible(true);
      
      // Play Audio notification via browser Speech Synthesis for High / Critical
      if (latestAlert.severity === 'Critical' || latestAlert.severity === 'High') {
        try {
          if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel(); // Stop current speech
            const utterance = new SpeechSynthesisUtterance(
              `${latestAlert.severity} Alert. ${latestAlert.title}.`
            );
            utterance.rate = 1.05;
            utterance.pitch = 0.95;
            window.speechSynthesis.speak(utterance);
          }
        } catch (e) {
          console.error("Speech Synthesis failed: ", e);
        }
      }
      
      // Auto dismiss after 10 seconds
      const timer = setTimeout(() => {
        setVisible(false);
        onClear();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [latestAlert, onClear]);

  if (!visible || !latestAlert) return null;

  const severityColor = latestAlert.severity === 'Critical' 
    ? 'border-red-500 bg-red-950/70 text-red-300' 
    : latestAlert.severity === 'High' 
    ? 'border-orange-500 bg-orange-950/70 text-orange-300' 
    : 'border-yellow-500 bg-yellow-950/70 text-yellow-300';

  return (
    <div className={`fixed bottom-6 right-6 max-w-md w-full border-2 rounded-xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-50 animate-bounce glass-panel ${severityColor}`}>
      <div className="flex items-start space-x-3">
        <div className="bg-white/10 p-2 rounded-lg mt-0.5">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <span className="text-[10px] uppercase font-extrabold tracking-widest bg-white/15 px-2 py-0.5 rounded">
              {latestAlert.severity} Alert
            </span>
            <button onClick={() => { setVisible(false); onClear(); }} className="text-white/60 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <h4 className="font-bold text-sm text-white mt-1.5 truncate">{latestAlert.title}</h4>
          <p className="text-xs mt-1 text-gray-300 leading-relaxed">{latestAlert.description}</p>
          <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-white/50 pt-2 border-t border-white/10">
            <span>IP: {latestAlert.ip_address || 'unknown'}</span>
            <span>MITRE: {latestAlert.mitre_technique || 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
