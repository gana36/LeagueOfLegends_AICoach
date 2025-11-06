import { Eye, EyeOff, Radio } from 'lucide-react';

const visionData = [
  { name: 'Wards Placed', playerA: 18.5, playerB: 16.2, max: 25, icon: Eye, color: '#10b981' },
  { name: 'Wards Killed', playerA: 7.2, playerB: 5.8, max: 15, icon: EyeOff, color: '#ef4444' },
  { name: 'Control Wards', playerA: 4.8, playerB: 4.2, max: 10, icon: Radio, color: '#f59e0b' }
];

interface VisionPanelProps {
  comparisonMode: boolean;
}

export function VisionPanel({ comparisonMode }: VisionPanelProps) {
  return (
    <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-green-500/20 shadow-lg shadow-green-500/5">
      <h2 className="text-xl text-green-400 mb-6">Vision Control</h2>
      
      <div className="space-y-6">
        {visionData.map((item, index) => {
          const Icon = item.icon;
          const percentageA = (item.playerA / item.max) * 100;
          const percentageB = (item.playerB / item.max) * 100;
          
          return (
            <div key={index} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${item.color}20` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: item.color }} />
                  </div>
                  <span className="text-slate-300">{item.name}</span>
                </div>
                {comparisonMode ? (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-cyan-400">{item.playerA.toFixed(1)}</span>
                    <span className="text-xs text-slate-500">vs</span>
                    <span className="text-sm text-fuchsia-400">{item.playerB.toFixed(1)}</span>
                  </div>
                ) : (
                  <span className="text-xl" style={{ color: item.color }}>
                    {item.playerA.toFixed(1)}
                  </span>
                )}
              </div>
              
              <div className="relative">
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                  {comparisonMode ? (
                    <>
                      <div className="flex h-full gap-0.5">
                        <div 
                          className="h-full rounded-l-full transition-all duration-500"
                          style={{ 
                            width: `${percentageA}%`,
                            backgroundColor: '#06b6d4'
                          }}
                        />
                        <div 
                          className="h-full rounded-r-full transition-all duration-500"
                          style={{ 
                            width: `${percentageB}%`,
                            backgroundColor: '#e879f9'
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <div 
                      className="h-full rounded-full transition-all duration-500 relative"
                      style={{ 
                        width: `${percentageA}%`,
                        backgroundColor: item.color
                      }}
                    >
                      <div 
                        className="absolute inset-0 animate-pulse opacity-50"
                        style={{ backgroundColor: item.color }}
                      />
                    </div>
                  )}
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-slate-500">0</span>
                  <span className="text-xs text-slate-500">{item.max}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-gradient-to-r from-green-500/10 to-cyan-500/10 rounded-lg border border-green-500/20">
        {comparisonMode ? (
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-cyan-400">Player A: 42.8</p>
              <p className="text-xs text-slate-400 mt-1">Top 10%</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-fuchsia-400">Player B: 38.5</p>
              <p className="text-xs text-slate-400 mt-1">Top 20%</p>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-green-400">Vision Score: 42.8</p>
            <p className="text-xs text-slate-400 mt-1">Top 10% in your rank</p>
          </>
        )}
      </div>

      {/* Additional Vision Metrics */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
          <p className="text-xs text-slate-400 mb-1">Ward Uptime</p>
          {comparisonMode ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-cyan-400">82%</span>
              <span className="text-xs text-slate-600">/</span>
              <span className="text-sm text-fuchsia-400">76%</span>
            </div>
          ) : (
            <p className="text-lg text-white">82%</p>
          )}
        </div>

        <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
          <p className="text-xs text-slate-400 mb-1">Vision Denial</p>
          {comparisonMode ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-cyan-400">38%</span>
              <span className="text-xs text-slate-600">/</span>
              <span className="text-sm text-fuchsia-400">32%</span>
            </div>
          ) : (
            <p className="text-lg text-white">38%</p>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-600/5 rounded-lg p-2 text-center border border-green-500/20">
          <p className="text-xs text-slate-400">Early</p>
          {comparisonMode ? (
            <div className="flex items-center justify-center gap-1 mt-1">
              <span className="text-xs text-cyan-400">5.2</span>
              <span className="text-xs text-slate-600">/</span>
              <span className="text-xs text-fuchsia-400">4.8</span>
            </div>
          ) : (
            <p className="text-sm text-green-400 mt-1">5.2</p>
          )}
        </div>

        <div className="bg-gradient-to-br from-amber-500/10 to-orange-600/5 rounded-lg p-2 text-center border border-amber-500/20">
          <p className="text-xs text-slate-400">Mid</p>
          {comparisonMode ? (
            <div className="flex items-center justify-center gap-1 mt-1">
              <span className="text-xs text-cyan-400">6.8</span>
              <span className="text-xs text-slate-600">/</span>
              <span className="text-xs text-fuchsia-400">6.2</span>
            </div>
          ) : (
            <p className="text-sm text-amber-400 mt-1">6.8</p>
          )}
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 to-violet-600/5 rounded-lg p-2 text-center border border-purple-500/20">
          <p className="text-xs text-slate-400">Late</p>
          {comparisonMode ? (
            <div className="flex items-center justify-center gap-1 mt-1">
              <span className="text-xs text-cyan-400">6.5</span>
              <span className="text-xs text-slate-600">/</span>
              <span className="text-xs text-fuchsia-400">5.2</span>
            </div>
          ) : (
            <p className="text-sm text-purple-400 mt-1">6.5</p>
          )}
        </div>
      </div>
    </div>
  );
}
