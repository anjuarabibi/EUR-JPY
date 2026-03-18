import React, { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { format } from 'date-fns';
import { IndicatorData } from '../utils/indicators';

interface TradingChartProps {
  data: IndicatorData[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#151619] border border-[#2a2b2e] p-3 rounded shadow-xl text-xs font-mono text-white">
        <p className="text-[#8E9299] mb-1">{format(data.time, 'HH:mm:ss')}</p>
        <p>O: <span className="text-gray-300">{data.open.toFixed(3)}</span></p>
        <p>H: <span className="text-gray-300">{data.high.toFixed(3)}</span></p>
        <p>L: <span className="text-gray-300">{data.low.toFixed(3)}</span></p>
        <p>C: <span className="text-gray-300">{data.close.toFixed(3)}</span></p>
        <p className="mt-1">V: <span className="text-blue-400">{data.volume}</span></p>
        {data.rsi && <p>RSI: <span className="text-purple-400">{data.rsi.toFixed(2)}</span></p>}
      </div>
    );
  }
  return null;
};

export const TradingChart: React.FC<TradingChartProps> = ({ data }) => {
  const chartData = useMemo(() => data.slice(-50), [data]);

  const minPrice = Math.min(...chartData.map(d => d.low)) * 0.9999;
  const maxPrice = Math.max(...chartData.map(d => d.high)) * 1.0001;

  return (
    <div className="w-full h-full flex flex-col gap-4">
      <div className="flex-1 min-h-[300px] bg-[#0a0a0a] rounded-lg border border-[#1a1a1a] p-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
            <XAxis
              dataKey="time"
              tickFormatter={(time) => format(time, 'HH:mm')}
              stroke="#444"
              fontSize={10}
              tickMargin={10}
            />
            <YAxis
              domain={[minPrice, maxPrice]}
              orientation="right"
              stroke="#444"
              fontSize={10}
              tickFormatter={(val) => val.toFixed(3)}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Candlestick Simulation using Bar */}
            <Bar dataKey="close" fill="#8884d8">
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.close > entry.open ? '#10b981' : '#ef4444'}
                  stroke={entry.close > entry.open ? '#10b981' : '#ef4444'}
                />
              ))}
            </Bar>

            <Line
              type="monotone"
              dataKey="ema50"
              stroke="#3b82f6"
              dot={false}
              strokeWidth={1.5}
              name="EMA 50"
            />
            <Line
              type="monotone"
              dataKey="ema200"
              stroke="#f59e0b"
              dot={false}
              strokeWidth={1.5}
              name="EMA 200"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="h-[100px] bg-[#0a0a0a] rounded-lg border border-[#1a1a1a] p-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
            <XAxis dataKey="time" hide />
            <YAxis domain={[0, 100]} hide />
            <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" />
            <ReferenceLine y={30} stroke="#10b981" strokeDasharray="3 3" />
            <ReferenceLine y={50} stroke="#444" strokeDasharray="3 3" />
            <Line
              type="monotone"
              dataKey="rsi"
              stroke="#a855f7"
              dot={false}
              strokeWidth={1.5}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
