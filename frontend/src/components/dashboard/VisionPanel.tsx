import { Eye, EyeOff, Radio } from 'lucide-react';

interface VisionPanelProps {
  comparisonMode: boolean;
  data?: any;
  loading?: boolean;
}

export function VisionPanel({ comparisonMode, data, loading }: VisionPanelProps) {
  // Use real data if available, otherwise fallback to demo data
  const visionData = data ? [
    { name: 'Wards Placed', playerA: data.averages?.wardsPlaced || 0, playerB: 16.2, max: 30, icon: Eye, color: '#10b981' },
    { name: 'Wards Killed', playerA: data.averages?.wardsKilled || 0, playerB: 5.8, max: 15, icon: EyeOff, color: '#ef4444' },
    { name: 'Control Wards', playerA: data.averages?.controlWards || 0, playerB: 4.2, max: 10, icon: Radio, color: '#f59e0b' },
    { name: 'Stealth Wards', playerA: data.averages?.stealthWardsPlaced || 0, playerB: 12.0, max: 25, icon: Eye, color: '#8b5cf6' },
    { name: 'Detector Wards', playerA: data.averages?.detectorWardsPlaced || 0, playerB: 4.0, max: 10, icon: Radio, color: '#ec4899' }
  ] : [
    { name: 'Wards Placed', playerA: 18.5, playerB: 16.2, max: 30, icon: Eye, color: '#10b981' },
    { name: 'Wards Killed', playerA: 7.2, playerB: 5.8, max: 15, icon: EyeOff, color: '#ef4444' },
    { name: 'Control Wards', playerA: 4.8, playerB: 4.2, max: 10, icon: Radio, color: '#f59e0b' },
    { name: 'Stealth Wards', playerA: 12.5, playerB: 11.0, max: 25, icon: Eye, color: '#8b5cf6' },
    { name: 'Detector Wards', playerA: 4.2, playerB: 3.8, max: 10, icon: Radio, color: '#ec4899' }
  ];

  if (loading) {
    return (
      <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-green-500/30 shadow-lg shadow-green-500/5">
        <h2 className="text-xl text-green-400 mb-6">Vision Control</h2>
        <div className="text-center text-slate-400 py-8">Loading vision data...</div>
      </div>
    );
  }
  return (
    <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-green-500/30 shadow-lg shadow-green-500/5">
      <h2 className="text-xl text-green-400 mb-6">Vision Control</h2>
      
      <div className="space-y-4">
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
    </div>
  );
}
