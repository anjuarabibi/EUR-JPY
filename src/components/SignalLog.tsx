import React from 'react';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { cn } from '../utils/cn';

export interface Signal {
  id: string;
  time: number;
  type: 'BUY' | 'SELL';
  price: number;
  status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED';
  tp: number;
  sl: number;
}

interface SignalLogProps {
  signals: Signal[];
}

export const SignalLog: React.FC<SignalLogProps> = ({ signals }) => {
  return (
    <div className="flex flex-col h-full bg-[#151619] border border-[#2a2b2e] rounded-xl overflow-hidden shadow-2xl">
      <div className="p-4 border-b border-[#2a2b2e] flex items-center justify-between bg-[#1a1b1e]">
        <h3 className="text-sm font-bold uppercase tracking-widest text-[#8E9299] flex items-center gap-2">
          <AlertCircle size={16} />
          Sniper Alerts
        </h3>
        <span className="text-[10px] font-mono text-[#10b981] animate-pulse">LIVE FEED</span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
        {signals.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[#4a4b4e] text-xs italic">
            Waiting for sniper signals...
          </div>
        ) : (
          signals.map((signal) => (
            <div
              key={signal.id}
              className={cn(
                "p-3 rounded-lg border transition-all duration-300 animate-in fade-in slide-in-from-right-4",
                signal.type === 'BUY' 
                  ? "bg-emerald-500/5 border-emerald-500/20" 
                  : "bg-rose-500/5 border-rose-500/20"
              )}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  {signal.type === 'BUY' ? (
                    <div className="p-1 bg-emerald-500 rounded">
                      <TrendingUp size={14} className="text-white" />
                    </div>
                  ) : (
                    <div className="p-1 bg-rose-500 rounded">
                      <TrendingDown size={14} className="text-white" />
                    </div>
                  )}
                  <div>
                    <p className={cn(
                      "text-xs font-bold",
                      signal.type === 'BUY' ? "text-emerald-400" : "text-rose-400"
                    )}>
                      NEXT CANDLE {signal.type} 🔥
                    </p>
                    <p className="text-[10px] text-[#8E9299] font-mono">
                      {format(signal.time, 'HH:mm:ss')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono text-white">@{signal.price.toFixed(3)}</p>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#2a2b2e] text-[#8E9299]">
                    {signal.status}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[#2a2b2e]">
                <div className="text-[10px]">
                  <span className="text-[#8E9299]">TP:</span>
                  <span className="ml-1 text-emerald-400 font-mono">{signal.tp.toFixed(3)}</span>
                </div>
                <div className="text-[10px]">
                  <span className="text-[#8E9299]">SL:</span>
                  <span className="ml-1 text-rose-400 font-mono">{signal.sl.toFixed(3)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
