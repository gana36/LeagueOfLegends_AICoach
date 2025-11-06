import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const goldDataPlayerA = Array.from({ length: 20 }, (_, i) => ({
  match: i + 1,
  playerA: Math.floor(350 + Math.random() * 80),
  playerB: Math.floor(330 + Math.random() * 70)
}));

const damageDataPlayerA = Array.from({ length: 20 }, (_, i) => ({
  match: i + 1,
  playerA: Math.floor(18000 + Math.random() * 10000),
  playerB: Math.floor(16000 + Math.random() * 8000)
}));

const deathsDataPlayerA = Array.from({ length: 20 }, (_, i) => ({
  match: i + 1,
  playerA: Math.floor(2 + Math.random() * 5),
  playerB: Math.floor(3 + Math.random() * 5)
}));

const visionDataPlayerA = Array.from({ length: 20 }, (_, i) => ({
  match: i + 1,
  playerA: Math.floor(35 + Math.random() * 25),
  playerB: Math.floor(30 + Math.random() * 20)
}));

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-3 shadow-lg">
        <p className="text-slate-300 text-sm mb-2">Match {label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name === 'playerA' ? 'Player A' : entry.name === 'playerB' ? 'Player B' : entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

interface TrendChartsProps {
  comparisonMode: boolean;
}

export function TrendCharts({ comparisonMode }: TrendChartsProps) {
  return (
    <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/20 shadow-lg shadow-purple-500/5">
      <h2 className="text-xl text-purple-400 mb-6">Performance Over Recent Matches</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Gold per Minute */}
        <div className="bg-slate-800/30 rounded-xl p-4 border border-amber-500/20">
          <h3 className="text-amber-400 text-sm mb-3">Gold per Minute</h3>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={goldDataPlayerA}>
              <defs>
                <linearGradient id="goldGradientA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="goldGradientB" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e879f9" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#e879f9" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis dataKey="match" stroke="#64748b" fontSize={10} />
              <YAxis stroke="#64748b" fontSize={10} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="playerA" name="playerA" stroke="#06b6d4" fill="url(#goldGradientA)" strokeWidth={2} />
              {comparisonMode && (
                <Area type="monotone" dataKey="playerB" name="playerB" stroke="#e879f9" fill="url(#goldGradientB)" strokeWidth={2} />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Damage to Champions */}
        <div className="bg-slate-800/30 rounded-xl p-4 border border-red-500/20">
          <h3 className="text-red-400 text-sm mb-3">Damage to Champions</h3>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={damageDataPlayerA}>
              <defs>
                <linearGradient id="damageGradientA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="damageGradientB" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e879f9" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#e879f9" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis dataKey="match" stroke="#64748b" fontSize={10} />
              <YAxis stroke="#64748b" fontSize={10} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="playerA" name="playerA" stroke="#06b6d4" fill="url(#damageGradientA)" strokeWidth={2} />
              {comparisonMode && (
                <Area type="monotone" dataKey="playerB" name="playerB" stroke="#e879f9" fill="url(#damageGradientB)" strokeWidth={2} />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Deaths per Match */}
        <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-500/20">
          <h3 className="text-slate-400 text-sm mb-3">Deaths per Match</h3>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={deathsDataPlayerA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis dataKey="match" stroke="#64748b" fontSize={10} />
              <YAxis stroke="#64748b" fontSize={10} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="playerA" name="playerA" stroke="#06b6d4" strokeWidth={2} dot={{ fill: '#06b6d4', r: 3 }} />
              {comparisonMode && (
                <Line type="monotone" dataKey="playerB" name="playerB" stroke="#e879f9" strokeWidth={2} dot={{ fill: '#e879f9', r: 3 }} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Vision Score */}
        <div className="bg-slate-800/30 rounded-xl p-4 border border-green-500/20">
          <h3 className="text-green-400 text-sm mb-3">Vision Score per Match</h3>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={visionDataPlayerA}>
              <defs>
                <linearGradient id="visionGradientA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="visionGradientB" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e879f9" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#e879f9" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis dataKey="match" stroke="#64748b" fontSize={10} />
              <YAxis stroke="#64748b" fontSize={10} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="playerA" name="playerA" stroke="#06b6d4" fill="url(#visionGradientA)" strokeWidth={2} />
              {comparisonMode && (
                <Area type="monotone" dataKey="playerB" name="playerB" stroke="#e879f9" fill="url(#visionGradientB)" strokeWidth={2} />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
