import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/95 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-3 shadow-lg">
        <p className="text-slate-300 text-sm mb-2 font-semibold">Match {label}</p>
        {payload.map((entry: any, index: number) => {
          let formattedValue = entry.value;

          // Format numbers based on type
          if (typeof entry.value === 'number') {
            if (entry.value > 1000) {
              // Large numbers (damage) - use commas, no decimals
              formattedValue = Math.round(entry.value).toLocaleString();
            } else if (entry.dataKey === 'goldPerMinute') {
              // Gold per minute - 2 decimal places
              formattedValue = entry.value.toFixed(2);
            } else if (entry.dataKey === 'visionScore' || entry.dataKey === 'kda') {
              // Vision score and KDA - 1 decimal place
              formattedValue = entry.value.toFixed(1);
            } else {
              // Deaths and other integers - no decimals
              formattedValue = Math.round(entry.value);
            }
          }

          return (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {formattedValue}
            </p>
          );
        })}
        {data.win !== undefined && (
          <p className={`text-xs mt-1 ${data.win ? 'text-green-400' : 'text-red-400'}`}>
            {data.win ? '✓ Victory' : '✗ Defeat'}
          </p>
        )}
      </div>
    );
  }
  return null;
};

interface TrendChartsProps {
  comparisonMode: boolean;
  data?: any;
  loading?: boolean;
  filters?: any;
}

export function TrendCharts({ comparisonMode, data, loading, filters }: TrendChartsProps) {
  // Backend already filters data, so we just use what we get
  const matches = data?.matches || [];

  // Transform API data into chart format
  const chartData = matches.map((match: any, index: number) => ({
    match: matches.length - index, // Reverse order (oldest = 1, newest = N)
    goldPerMinute: match.goldPerMinute,
    damageToChampions: match.damageToChampions,
    deaths: match.deaths,
    visionScore: match.visionScore,
    kda: match.kda,
    win: match.win
  })).reverse();

  // Use dummy data if no real data
  const goldData = chartData.length > 0
    ? chartData
    : Array.from({ length: 20 }, (_, i) => ({
        match: i + 1,
        goldPerMinute: Math.floor(350 + Math.random() * 80),
      }));

  const damageData = chartData.length > 0
    ? chartData
    : Array.from({ length: 20 }, (_, i) => ({
        match: i + 1,
        damageToChampions: Math.floor(18000 + Math.random() * 10000),
      }));

  const deathsData = chartData.length > 0
    ? chartData
    : Array.from({ length: 20 }, (_, i) => ({
        match: i + 1,
        deaths: Math.floor(2 + Math.random() * 5),
      }));

  const visionData = chartData.length > 0
    ? chartData
    : Array.from({ length: 20 }, (_, i) => ({
        match: i + 1,
        visionScore: Math.floor(35 + Math.random() * 25),
      }));

  if (loading) {
    return (
      <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/20 shadow-lg shadow-purple-500/5">
        <h2 className="text-xl text-purple-400 mb-6">Performance Over Recent Matches</h2>
        <div className="text-center text-slate-400 py-8">Loading performance trends...</div>
      </div>
    );
  }
  return (
    <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/20 shadow-lg shadow-purple-500/5">
      <h2 className="text-xl text-purple-400 mb-6">Performance Over Recent Matches</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Gold per Minute */}
        <div className="bg-slate-800/30 rounded-xl p-4 border border-amber-500/20">
          <h3 className="text-amber-400 text-sm mb-3">Gold per Minute</h3>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={goldData}>
              <defs>
                <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis dataKey="match" stroke="#64748b" fontSize={10} />
              <YAxis stroke="#64748b" fontSize={10} domain={['dataMin - 20', 'dataMax + 20']} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="goldPerMinute" name="Gold/Min" stroke="#06b6d4" fill="url(#goldGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Damage to Champions */}
        <div className="bg-slate-800/30 rounded-xl p-4 border border-red-500/20">
          <h3 className="text-red-400 text-sm mb-3">Damage to Champions</h3>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={damageData}>
              <defs>
                <linearGradient id="damageGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis dataKey="match" stroke="#64748b" fontSize={10} />
              <YAxis stroke="#64748b" fontSize={10} domain={['dataMin - 1000', 'dataMax + 1000']} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="damageToChampions" name="Damage" stroke="#06b6d4" fill="url(#damageGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Deaths per Match */}
        <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-500/20">
          <h3 className="text-slate-400 text-sm mb-3">Deaths per Match</h3>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={deathsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis dataKey="match" stroke="#64748b" fontSize={10} />
              <YAxis stroke="#64748b" fontSize={10} domain={[0, 'dataMax + 2']} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="deaths" name="Deaths" stroke="#06b6d4" strokeWidth={2} dot={{ fill: '#06b6d4', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Vision Score */}
        <div className="bg-slate-800/30 rounded-xl p-4 border border-green-500/20">
          <h3 className="text-green-400 text-sm mb-3">Vision Score per Match</h3>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={visionData}>
              <defs>
                <linearGradient id="visionGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis dataKey="match" stroke="#64748b" fontSize={10} />
              <YAxis stroke="#64748b" fontSize={10} domain={['dataMin - 5', 'dataMax + 5']} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="visionScore" name="Vision Score" stroke="#06b6d4" fill="url(#visionGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
