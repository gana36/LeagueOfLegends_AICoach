import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer } from 'recharts';

const radarData = [
  { subject: 'KDA', playerA: 85, playerB: 68, average: 60 },
  { subject: 'Damage', playerA: 78, playerB: 62, average: 65 },
  { subject: 'Vision', playerA: 92, playerB: 75, average: 55 },
  { subject: 'Objectives', playerA: 70, playerB: 72, average: 68 },
  { subject: 'Farming', playerA: 82, playerB: 70, average: 70 },
  { subject: 'Survivability', playerA: 65, playerB: 58, average: 62 }
];

interface RadarChartPanelProps {
  comparisonMode: boolean;
  data?: any;
  loading?: boolean;
  playerA?: string;
  playerB?: string;
}

export function RadarChartPanel({ comparisonMode, data, loading, playerA = 'Player A', playerB = 'Player B' }: RadarChartPanelProps) {
  // Build radar data from API response
  const radarDataToDisplay = data ? [
    { subject: 'KDA', playerA: data.kda, playerB: 68, average: 60 },
    { subject: 'Damage', playerA: data.damage, playerB: 62, average: 65 },
    { subject: 'Vision', playerA: data.vision, playerB: 75, average: 55 },
    { subject: 'Objectives', playerA: data.objectives, playerB: 72, average: 68 },
    { subject: 'Farming', playerA: data.farming, playerB: 70, average: 70 },
    { subject: 'Survivability', playerA: data.survivability, playerB: 58, average: 62 }
  ] : radarData;

  if (loading) {
    return (
      <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-cyan-500/20 shadow-lg shadow-cyan-500/5 h-full">
        <h2 className="text-xl text-cyan-400 mb-4">Overall Balance</h2>
        <div className="text-center text-slate-400 py-8">Loading balance data...</div>
      </div>
    );
  }
  return (
    <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-cyan-500/20 shadow-lg shadow-cyan-500/5 h-full">
      <h2 className="text-xl text-cyan-400 mb-4">Overall Balance</h2>
      
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={radarDataToDisplay}>
          <PolarGrid stroke="#334155" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
          <Radar name={playerA} dataKey="playerA" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.5} strokeWidth={2} />
          {comparisonMode && (
            <Radar name={playerB} dataKey="playerB" stroke="#e879f9" fill="#e879f9" fillOpacity={0.4} strokeWidth={2} />
          )}
          {!comparisonMode && (
            <Radar name="Average Player" dataKey="average" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} strokeWidth={2} strokeDasharray="5 5" />
          )}
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
            formatter={(value) => <span className="text-slate-300 text-sm">{value}</span>}
          />
        </RadarChart>
      </ResponsiveContainer>
      
      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-cyan-500" />
          <span className="text-sm text-slate-400">{playerA}</span>
        </div>
        {comparisonMode ? (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-fuchsia-400" />
            <span className="text-sm text-slate-400">{playerB}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500 opacity-50" />
            <span className="text-sm text-slate-400">Average Player</span>
          </div>
        )}
      </div>
    </div>
  );
}
