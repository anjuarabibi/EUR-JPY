export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorData extends Candle {
  ema50?: number;
  ema200?: number;
  rsi?: number;
  volSMA?: number;
}

export function calculateEMA(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const ema: number[] = [];
  let prevEma = data[0];
  ema[0] = prevEma;

  for (let i = 1; i < data.length; i++) {
    const currentEma = (data[i] - prevEma) * k + prevEma;
    ema[i] = currentEma;
    prevEma = currentEma;
  }
  return ema;
}

export function calculateRSI(data: number[], period: number = 14): number[] {
  const rsi: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    gains.push(Math.max(0, diff));
    losses.push(Math.max(0, -diff));
  }

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = 0; i < period; i++) rsi.push(NaN);

  rsi.push(100 - 100 / (1 + avgGain / (avgLoss || 1)));

  for (let i = period + 1; i < data.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i - 1]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i - 1]) / period;
    rsi.push(100 - 100 / (1 + avgGain / (avgLoss || 1)));
  }

  return rsi;
}

export function calculateSMA(data: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(NaN);
      continue;
    }
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  return sma;
}

export function generateMockData(count: number): Candle[] {
  const data: Candle[] = [];
  let price = 162.50; // Starting EURJPY price
  let time = Date.now() - count * 60000;

  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.5) * 0.05;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * 0.02;
    const low = Math.min(open, close) - Math.random() * 0.02;
    const volume = Math.floor(Math.random() * 1000) + 500;

    data.push({ time, open, high, low, close, volume });
    price = close;
    time += 60000;
  }
  return data;
}
