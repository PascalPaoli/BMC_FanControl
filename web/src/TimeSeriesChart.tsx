import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

interface TimeSeriesChartProps {
  data: any[];
  dataKeys: string[];
  colors: string[];
  title: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bmcdark-900/90 border border-white/10 p-4 rounded-xl shadow-xl backdrop-blur-md">
        <p className="text-slate-400 text-xs mb-2 font-bold">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
            <span className="text-sm font-medium text-slate-200">{entry.name}:</span>
            <span className="text-sm font-bold text-white">{entry.value}°C</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({ data, dataKeys, colors, title }) => {
  if (!data || data.length === 0) return null;

  return (
    <div className="w-full h-80 bg-bmcdark-800 rounded-2xl p-6 shadow-lg border border-white/5 flex flex-col">
      <h3 className="text-lg font-bold text-slate-200 mb-6">{title}</h3>
      <div className="flex-1 w-full h-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
            <XAxis 
               dataKey="time" 
               stroke="#94a3b8" 
               fontSize={10} 
               tickLine={false} 
               axisLine={false} 
               minTickGap={30}
            />
            <YAxis 
               stroke="#94a3b8" 
               fontSize={10} 
               tickLine={false} 
               axisLine={false} 
               domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} iconType="circle" />
            
            {dataKeys.map((key, i) => (
              <Line 
                key={key}
                type="monotone" 
                dataKey={key} 
                stroke={colors[i % colors.length]} 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
                isAnimationActive={false} // Disable animation to prevent layout thrashing on live poll
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TimeSeriesChart;
