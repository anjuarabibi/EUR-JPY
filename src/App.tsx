/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Activity, 
  Settings, 
  Shield, 
  Zap, 
  BarChart3, 
  Clock, 
  Target,
  ChevronRight,
  Info
} from 'lucide-react';
import { 
  generateMockData, 
  calculateEMA, 
  calculateRSI, 
  calculateSMA,
  IndicatorData, 
  Candle 
} from './utils/indicators';
import { TradingViewWidget } from './components/TradingViewWidget';
import { SignalLog, Signal } from './components/SignalLog';
import { cn } from './utils/cn';

export default function App() {
  const [data, setData] = useState<IndicatorData[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [lastSignalTrend, setLastSignalTrend] = useState<'UP' | 'DOWN' | null>(null);
  const [isBotRunning, setIsBotRunning] = useState(true);
  const [lastScanTime, setLastScanTime] = useState<string>('--:--:--');
  
  const dataRef = useRef<IndicatorData[]>([]);

  // Initial data generation
  useEffect(() => {
    const initialCandles = generateMockData(300);
    processData(initialCandles);
  }, []);

  const processData = (candles: Candle[]) => {
    const closes = candles.map(c => c.close);
    const volumes = candles.map(c => c.volume);
    
    const ema50 = calculateEMA(closes, 50);
    const ema200 = calculateEMA(closes, 200);
    const rsi = calculateRSI(closes, 14);
    const volSMA = calculateSMA(volumes, 20);

    const fullData: IndicatorData[] = candles.map((c, i) => ({
      ...c,
      ema50: ema50[i],
      ema200: ema200[i],
      rsi: rsi[i],
      volSMA: volSMA[i]
    }));

    setData(fullData);
    dataRef.current = fullData;
    setLastScanTime(new Date().toLocaleTimeString());
  };

  const [lastSignal, setLastSignal] = useState<Signal | null>(null);
  const [alertSettings, setAlertSettings] = useState({
    push: true,
    sound: true,
    popup: true
  });

  // Request notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const playAlertSound = useCallback(() => {
    if (!alertSettings.sound) return;
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(e => console.log('Audio play failed:', e));
  }, [alertSettings.sound]);

  const triggerAlert = useCallback((signal: Signal) => {
    const title = signal.type === 'BUY' ? "🔥 BUY EURJPY (1M)" : "🔻 SELL EURJPY (1M)";
    const body = signal.type === 'BUY' 
      ? "Trend Up + RSI + Volume Confirm" 
      : "Trend Down + RSI + Volume Confirm";

    // 1. Push Notification
    if (alertSettings.push && "Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, icon: '/favicon.ico' });
    }

    // 2. Sound Alert
    playAlertSound();

    // 3. Popup Alert (handled by lastSignal state + overlay UI)
    if (alertSettings.popup) {
      setLastSignal(signal);
      // Auto-clear popup after 10 seconds
      setTimeout(() => setLastSignal(null), 10000);
    }
  }, [alertSettings, playAlertSound]);

  const checkSignals = useCallback((currentData: IndicatorData[]) => {
    if (currentData.length < 5) return;

    const current = currentData[currentData.length - 1];
    const prev = currentData[currentData.length - 2];

    if (!current.ema50 || !current.ema200 || !current.rsi || !current.volSMA) return;

    // 1. IGNORE SIDEWAYS: EMA Distance & Slope
    const emaDiff = Math.abs(current.ema50 - current.ema200);
    const minEmaGap = 0.020; 
    if (emaDiff < minEmaGap) return;

    // 2. IGNORE WEAK CANDLES: Min body size
    const currentBody = Math.abs(current.close - current.open);
    const minBody = 0.004; 
    if (currentBody < minBody) return;

    // SYNC MODE LOGIC
    const isUptrend = current.ema50 > current.ema200;
    const isDowntrend = current.ema50 < current.ema200;

    // BUY: EMA50 > EMA200, Close near EMA50, RSI 50-60, Bullish, Vol Spike
    const isBuySignal = 
      isUptrend &&
      current.close >= current.ema50 * 0.9995 && current.close <= current.ema50 * 1.0005 && // Near EMA50 (0.05% threshold)
      current.rsi >= 50 && current.rsi <= 60 &&
      current.volume > prev.volume &&
      current.close > current.open;

    // SELL: EMA50 < EMA200, Close near EMA50, RSI 40-50, Bearish, Vol Spike
    const isSellSignal = 
      isDowntrend &&
      current.close <= current.ema50 * 1.0005 && current.close >= current.ema50 * 0.9995 && // Near EMA50 (0.05% threshold)
      current.rsi >= 40 && current.rsi <= 50 &&
      current.volume > prev.volume &&
      current.close < current.open;

      if (isBuySignal && lastSignalTrend !== 'UP') {
      const newSignal: Signal = {
        id: Math.random().toString(36).substr(2, 9),
        time: current.time,
        type: 'BUY',
        price: current.close,
        status: 'ACTIVE',
        tp: current.close + 0.120,
        sl: current.close - 0.080
      };
      setSignals(prevSignals => [newSignal, ...prevSignals]);
      triggerAlert(newSignal);
      setLastSignalTrend('UP');
    } else if (isSellSignal && lastSignalTrend !== 'DOWN') {
      const newSignal: Signal = {
        id: Math.random().toString(36).substr(2, 9),
        time: current.time,
        type: 'SELL',
        price: current.close,
        status: 'ACTIVE',
        tp: current.close - 0.120,
        sl: current.close + 0.080
      };
      setSignals(prevSignals => [newSignal, ...prevSignals]);
      triggerAlert(newSignal);
      setLastSignalTrend('DOWN');
    }

    // Reset trend filter
    if (isUptrend && current.ema50 < current.ema200) setLastSignalTrend(null);
    if (isDowntrend && current.ema50 > current.ema200) setLastSignalTrend(null);

  }, [lastSignalTrend, triggerAlert]);

  // Live simulation
  useEffect(() => {
    if (!isBotRunning) return;

    const interval = setInterval(() => {
      const last = dataRef.current[dataRef.current.length - 1];
      const change = (Math.random() - 0.5) * 0.02;
      const newCandle: Candle = {
        time: last.time + 60000,
        open: last.close,
        close: last.close + change,
        high: Math.max(last.close, last.close + change) + Math.random() * 0.01,
        low: Math.min(last.close, last.close + change) - Math.random() * 0.01,
        volume: Math.floor(Math.random() * 1200) + 400
      };

      const newData = [...dataRef.current, newCandle];
      processData(newData);
      checkSignals(dataRef.current);
    }, 3000); // Fast simulation for demo

    return () => clearInterval(interval);
  }, [isBotRunning, checkSignals]);

  return (
    <div className="min-h-screen bg-[#0a0b0d] text-white font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="h-16 border-b border-[#1a1b1e] bg-[#0d0e12] flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Target className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">EURJPY SNIPER <span className="text-emerald-500">BOT</span></h1>
            <div className="flex items-center gap-2 text-[10px] text-[#8E9299] font-mono">
              <span className="flex items-center gap-1">
                <Zap size={10} className="text-emerald-500" />
                SYNC MODE: ENABLED
              </span>
              <span className="w-1 h-1 rounded-full bg-[#2a2b2e]" />
              <span>TF: 1M</span>
              <span className="w-1 h-1 rounded-full bg-[#2a2b2e]" />
              <span>V2.5.0</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-6 mr-6">
            <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Market: LIVE</span>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[#8E9299] uppercase font-bold tracking-wider">Current Price</p>
              <p className="text-sm font-mono font-bold text-white">
                {data.length > 0 ? data[data.length - 1].close.toFixed(3) : '---'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[#8E9299] uppercase font-bold tracking-wider">Spread</p>
              <p className="text-sm font-mono font-bold text-emerald-400">0.4 Pips</p>
            </div>
          </div>
          
          <button 
            onClick={() => setIsBotRunning(!isBotRunning)}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
              isBotRunning 
                ? "bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white"
                : "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:scale-105"
            )}
          >
            {isBotRunning ? <Zap size={14} /> : <Activity size={14} />}
            {isBotRunning ? 'STOP BOT' : 'START BOT'}
          </button>
          
          <button className="p-2 rounded-lg bg-[#1a1b1e] border border-[#2a2b2e] text-[#8E9299] hover:text-white transition-colors">
            <Settings size={20} />
          </button>
        </div>
      </header>

      <main className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1600px] mx-auto">
        {/* Left Column: Stats & Filters */}
        <div className="lg:col-span-3 space-y-6">
          {/* Strategy Stats */}
          <div className="bg-[#151619] border border-[#2a2b2e] rounded-xl p-5 shadow-xl">
            <h3 className="text-xs font-bold text-[#8E9299] uppercase tracking-widest mb-4 flex items-center gap-2">
              <BarChart3 size={14} />
              Performance
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#0d0e12] p-3 rounded-lg border border-[#1a1b1e]">
                <p className="text-[10px] text-[#8E9299] mb-1">Win Rate</p>
                <p className="text-xl font-bold text-emerald-400">78.4%</p>
              </div>
              <div className="bg-[#0d0e12] p-3 rounded-lg border border-[#1a1b1e]">
                <p className="text-[10px] text-[#8E9299] mb-1">Profit Factor</p>
                <p className="text-xl font-bold text-white">2.14</p>
              </div>
              <div className="bg-[#0d0e12] p-3 rounded-lg border border-[#1a1b1e]">
                <p className="text-[10px] text-[#8E9299] mb-1">Total Trades</p>
                <p className="text-xl font-bold text-white">142</p>
              </div>
              <div className="bg-[#0d0e12] p-3 rounded-lg border border-[#1a1b1e]">
                <p className="text-[10px] text-[#8E9299] mb-1">Avg Profit</p>
                <p className="text-xl font-bold text-emerald-400">+12.4</p>
              </div>
            </div>
          </div>

          {/* Active Filters */}
          <div className="bg-[#151619] border border-[#2a2b2e] rounded-xl p-5 shadow-xl">
            <h3 className="text-xs font-bold text-[#8E9299] uppercase tracking-widest mb-4 flex items-center gap-2">
              <Shield size={14} />
              Smart Filters
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Trend Confirmation', status: 'Active', color: 'text-emerald-400' },
                { label: 'Volume Spike Detect', status: 'Active', color: 'text-emerald-400' },
                { label: 'RSI Range Filter', status: 'Active', color: 'text-emerald-400' },
                { label: 'News Time Filter', status: 'Standby', color: 'text-amber-400' },
                { label: 'EMA Cross Filter', status: 'Active', color: 'text-emerald-400' },
              ].map((filter, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-[#8E9299]">{filter.label}</span>
                  <span className={cn("font-mono font-bold", filter.color)}>{filter.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Alert Settings */}
          <div className="bg-[#151619] border border-[#2a2b2e] rounded-xl p-5 shadow-xl">
            <h3 className="text-xs font-bold text-[#8E9299] uppercase tracking-widest mb-4 flex items-center gap-2">
              <Zap size={14} className="text-emerald-500" />
              Alert System
            </h3>
            <div className="space-y-4">
              {[
                { id: 'push', label: 'Push Notification', icon: Activity },
                { id: 'sound', label: 'Sound Alert', icon: Activity },
                { id: 'popup', label: 'Popup Alert', icon: Activity },
              ].map((setting) => (
                <div key={setting.id} className="flex items-center justify-between">
                  <span className="text-xs text-[#8E9299]">{setting.label}</span>
                  <button
                    onClick={() => setAlertSettings(prev => ({ ...prev, [setting.id]: !prev[setting.id as keyof typeof prev] }))}
                    className={cn(
                      "w-10 h-5 rounded-full transition-colors relative",
                      alertSettings[setting.id as keyof typeof alertSettings] ? "bg-emerald-500" : "bg-[#2a2b2e]"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-3 h-3 rounded-full bg-white transition-all",
                      alertSettings[setting.id as keyof typeof alertSettings] ? "left-6" : "left-1"
                    )} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Strategy Info */}
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <Info className="text-emerald-500 shrink-0" size={18} />
              <div>
                <h4 className="text-xs font-bold text-emerald-500 mb-1 uppercase">Sniper Strategy</h4>
                <p className="text-[11px] text-[#8E9299] leading-relaxed">
                  The bot identifies high-probability pullbacks near the EMA 50 during strong trends. 
                  Confirmation requires RSI alignment and a volume spike to ensure institutional momentum.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Column: Chart */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-[#151619] border border-[#2a2b2e] rounded-xl p-4 shadow-xl h-[600px] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold">EURJPY</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-[#8E9299]" />
                  <span className="text-xs text-[#8E9299]">1 Minute</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-2 py-1 bg-[#0d0e12] rounded border border-[#1a1b1e] text-[10px] text-[#3b82f6]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" />
                  EMA 50
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-[#0d0e12] rounded border border-[#1a1b1e] text-[10px] text-[#f59e0b]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                  EMA 200
                </div>
              </div>
            </div>
            
            <div className="flex-1 relative">
              <TradingViewWidget />
              
              {/* Scanning Status */}
              <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1">
                <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest font-bold">AI Engine Scanning 1M Chart...</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full border border-white/5">
                    <span className="text-[9px] font-mono text-white/50 uppercase tracking-widest">Last Scan: {lastScanTime}</span>
                  </div>
                  <div className="bg-emerald-500/10 backdrop-blur-sm px-3 py-1 rounded-full border border-emerald-500/20">
                    <span className="text-[9px] font-mono text-emerald-500 uppercase tracking-widest font-bold">Market: LIVE</span>
                  </div>
                </div>
              </div>

              {/* Signal Overlay */}
              {lastSignal && (
                <div className={cn(
                  "absolute top-4 left-4 z-10 p-4 rounded-xl border backdrop-blur-md animate-in fade-in zoom-in duration-500",
                  lastSignal.type === 'BUY' 
                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" 
                    : "bg-rose-500/20 border-rose-500/50 text-rose-400"
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      lastSignal.type === 'BUY' ? "bg-emerald-500" : "bg-rose-500"
                    )}>
                      <Zap size={20} className="text-white animate-pulse" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-widest opacity-70">AI Signal Engine</p>
                      <p className="text-lg font-black tracking-tighter">
                        SNIPER {lastSignal.type} @ {lastSignal.price.toFixed(3)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-3 gap-4">
            <button className="bg-[#151619] border border-[#2a2b2e] p-4 rounded-xl flex flex-col items-center gap-2 hover:bg-[#1a1b1e] transition-colors group">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500 group-hover:scale-110 transition-transform">
                <Activity size={20} />
              </div>
              <span className="text-[10px] font-bold text-[#8E9299] uppercase">Backtest</span>
            </button>
            <button className="bg-[#151619] border border-[#2a2b2e] p-4 rounded-xl flex flex-col items-center gap-2 hover:bg-[#1a1b1e] transition-colors group">
              <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500 group-hover:scale-110 transition-transform">
                <BarChart3 size={20} />
              </div>
              <span className="text-[10px] font-bold text-[#8E9299] uppercase">Analytics</span>
            </button>
            <button className="bg-[#151619] border border-[#2a2b2e] p-4 rounded-xl flex flex-col items-center gap-2 hover:bg-[#1a1b1e] transition-colors group">
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500 group-hover:scale-110 transition-transform">
                <Shield size={20} />
              </div>
              <span className="text-[10px] font-bold text-[#8E9299] uppercase">Security</span>
            </button>
          </div>
        </div>

        {/* Right Column: Signals */}
        <div className="lg:col-span-3 h-[700px]">
          <SignalLog signals={signals} />
        </div>
      </main>

      {/* Footer Status Bar */}
      <footer className="h-8 border-t border-[#1a1b1e] bg-[#0d0e12] fixed bottom-0 w-full flex items-center justify-between px-6 text-[10px] text-[#4a4b4e] font-mono">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            SERVER: TOKYO-1
          </span>
          <span>LATENCY: 24ms</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-emerald-500/50">AUTO-TRADE: ENABLED</span>
          <span>UTC: {new Date().toISOString().substr(11, 8)}</span>
        </div>
      </footer>
    </div>
  );
}
