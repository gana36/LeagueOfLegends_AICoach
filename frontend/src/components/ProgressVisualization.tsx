import React, { useState, useEffect } from 'react';
import { Card } from './dashboard/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

const API_BASE_URL = 'http://localhost:8000';
const SNEAKY_PUUID = 'BQD2G_OKDrt_YjF9A5qJvfzClUx0Fe2fPzQm8cqLQWnATfQmzBta-JAW3ZOGABb07RmYrpJ_AXr-cg';

interface ProgressVisualizationProps {
  puuid?: string;
}

export const ProgressVisualization: React.FC<ProgressVisualizationProps> = ({ puuid = SNEAKY_PUUID }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'kda' | 'kills' | 'damage' | 'cs'>('kda');

  useEffect(() => {
    fetchProgressData();
  }, [puuid]);

  const fetchProgressData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/analysis/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ puuid, match_count: 50 })
      });
      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-gold mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading progress data...</p>
        </div>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-6">
        <div className="text-center py-8 text-red-500">
          <p>Error loading data: {error || 'No data available'}</p>
        </div>
      </Card>
    );
  }

  const timeSeries = data.time_series || [];
  const rollingAverages = data.rolling_averages || [];

  // Format data for charts
  const chartData = timeSeries.map((point: any, idx: number) => ({
    game: idx + 1,
    date: new Date(point.timestamp).toLocaleDateString(),
    kda: point.kda,
    kills: point.kills,
    deaths: point.deaths,
    assists: point.assists,
    damage: point.damage,
    cs: point.cs,
    vision_score: point.vision_score,
    rolling_avg: rollingAverages[idx] || 0,
    win: point.win ? 1 : 0
  }));

  const getMetricData = () => {
    switch (selectedMetric) {
      case 'kda':
        return { dataKey: 'kda', name: 'KDA', color: '#10B981', avgKey: 'rolling_avg' };
      case 'kills':
        return { dataKey: 'kills', name: 'Kills', color: '#EF4444', avgKey: null };
      case 'damage':
        return { dataKey: 'damage', name: 'Damage', color: '#F59E0B', avgKey: null };
      case 'cs':
        return { dataKey: 'cs', name: 'CS', color: '#3B82F6', avgKey: null };
      default:
        return { dataKey: 'kda', name: 'KDA', color: '#10B981', avgKey: 'rolling_avg' };
    }
  };

  const metric = getMetricData();

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Player Progress Over Time</h2>
          <div className="flex gap-2">
            {(['kda', 'kills', 'damage', 'cs'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMetric(m)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedMetric === m
                    ? 'bg-primary-gold text-bg-dark'
                    : 'bg-gray-800 text-white hover:bg-gray-700'
                }`}
              >
                {m.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`color${selectedMetric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={metric.color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={metric.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="game"
              stroke="#9CA3AF"
              label={{ value: 'Game Number', position: 'insideBottom', offset: -5 }}
            />
            <YAxis stroke="#9CA3AF" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#fff'
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey={metric.dataKey}
              stroke={metric.color}
              fillOpacity={1}
              fill={`url(#color${selectedMetric})`}
              name={metric.name}
            />
            {metric.avgKey && (
              <Line
                type="monotone"
                dataKey={metric.avgKey}
                stroke="#F59E0B"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Rolling Average (10 games)"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Win/Loss Indicator */}
      <Card className="p-6">
        <h3 className="text-xl font-bold text-white mb-4">Win/Loss Pattern</h3>
        <ResponsiveContainer width="100%" height={100}>
          <AreaChart data={chartData}>
            <Area
              type="monotone"
              dataKey="win"
              stroke="#10B981"
              fill="#10B981"
              fillOpacity={0.6}
            />
            <XAxis dataKey="game" stroke="#9CA3AF" />
            <YAxis domain={[0, 1]} stroke="#9CA3AF" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px'
              }}
              formatter={(value: number) => (value === 1 ? 'Win' : 'Loss')}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Stats Summary */}
      {data.trends && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-gray-800">
            <div className="text-sm text-text-secondary mb-1">Average KDA</div>
            <div className="text-2xl font-bold text-white">{data.trends.average_kda?.toFixed(2) || 0}</div>
          </Card>
          <Card className="p-4 bg-gray-800">
            <div className="text-sm text-text-secondary mb-1">Recent KDA</div>
            <div className="text-2xl font-bold text-green-400">{data.trends.recent_kda?.toFixed(2) || 0}</div>
          </Card>
          <Card className="p-4 bg-gray-800">
            <div className="text-sm text-text-secondary mb-1">Trend</div>
            <div className="text-2xl font-bold text-primary-gold">
              {data.trends.trending_up ? '📈 Up' : '📉 Down'}
            </div>
          </Card>
          <Card className="p-4 bg-gray-800">
            <div className="text-sm text-text-secondary mb-1">Consistency</div>
            <div className="text-2xl font-bold text-white">
              {data.trends.kda_variance?.toFixed(2) || 0}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

