import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Flame, Crown, Axe, Droplet, Castle } from 'lucide-react';

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-sm border border-purple-500/30 rounded-lg p-3 shadow-lg">
        <p className="text-slate-300 text-sm mb-1">{payload[0].payload.name}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.fill }}>
            {entry.name === 'playerA' ? 'Player A' : 'Player B'}: {entry.value.toFixed(2)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

interface ObjectivePanelProps {
  comparisonMode: boolean;
  data?: any;
  loading?: boolean;
}

export function ObjectivePanel({ comparisonMode, data, loading }: ObjectivePanelProps) {
  // Use real data if available
  const objectiveData = data ? [
    { name: 'Dragons', playerA: data.averages?.dragons || 0, playerB: 2.8, icon: Flame, color: '#ef4444' },
    { name: 'Barons', playerA: data.averages?.barons || 0, playerB: 0.6, icon: Crown, color: '#8b5cf6' },
    { name: 'Heralds', playerA: data.averages?.heralds || 0, playerB: 0.7, icon: Axe, color: '#f59e0b' },
    { name: 'First Blood', playerA: (data.averages?.firstBloodRate || 0) / 100, playerB: 0.28, icon: Droplet, color: '#dc2626' },
    { name: 'First Tower', playerA: (data.averages?.firstTowerRate || 0) / 100, playerB: 0.38, icon: Castle, color: '#64748b' }
  ] : [
    { name: 'Dragons', playerA: 3.2, playerB: 2.8, icon: Flame, color: '#ef4444' },
    { name: 'Barons', playerA: 0.8, playerB: 0.6, icon: Crown, color: '#8b5cf6' },
    { name: 'Heralds', playerA: 0.6, playerB: 0.7, icon: Axe, color: '#f59e0b' },
    { name: 'First Blood', playerA: 0.35, playerB: 0.28, icon: Droplet, color: '#dc2626' },
    { name: 'First Tower', playerA: 0.42, playerB: 0.38, icon: Castle, color: '#64748b' }
  ];

  if (loading) {
    return (
      <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30 shadow-lg shadow-purple-500/5">
        <h2 className="text-xl text-purple-400 mb-6">Objective Control</h2>
        <div className="text-center text-slate-400 py-8">Loading objective data...</div>
      </div>
    );
  }
  return (
    <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30 shadow-lg shadow-purple-500/5">
      <h2 className="text-xl text-purple-400 mb-6">Objective Control</h2>
      
      {!comparisonMode && (
        <div className="space-y-4 mb-6">
          {objectiveData.map((obj, index) => {
            const Icon = obj.icon;
            return (
              <div key={index} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-slate-800/50 flex items-center justify-center">
                  <Icon className="w-5 h-5" style={{ color: obj.color }} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-slate-300">{obj.name}</span>
                    <span className="text-sm" style={{ color: obj.color }}>{obj.playerA.toFixed(2)}</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${(obj.playerA / 3.2) * 100}%`,
                        backgroundColor: obj.color
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ResponsiveContainer width="100%" height={comparisonMode ? 200 : 150}>
        <BarChart data={objectiveData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          <XAxis dataKey="name" stroke="#64748b" fontSize={10} angle={-45} textAnchor="end" height={60} />
          <YAxis stroke="#64748b" fontSize={10} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="playerA" fill="#06b6d4" radius={[4, 4, 0, 0]} />
          {comparisonMode && (
            <Bar dataKey="playerB" fill="#e879f9" radius={[4, 4, 0, 0]} />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
