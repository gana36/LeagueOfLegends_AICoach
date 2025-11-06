import { TrendingUp, TrendingDown, Swords, Coins, Eye, Trophy } from 'lucide-react';
import { Progress } from './ui/progress';

const kpiDataPlayerA = [
  {
    title: 'KDA Ratio',
    value: '3.42',
    trend: '+12%',
    trendUp: true,
    subtitle: 'Top 15% globally',
    progress: 75,
    icon: Trophy,
    color: 'cyan'
  },
  {
    title: 'Damage Share',
    value: '28.4%',
    trend: '+5%',
    trendUp: true,
    subtitle: 'Above average',
    progress: 68,
    icon: Swords,
    color: 'red'
  },
  {
    title: 'Gold per Min',
    value: '385',
    trend: '-3%',
    trendUp: false,
    subtitle: 'Top 25% globally',
    progress: 70,
    icon: Coins,
    color: 'amber'
  },
  {
    title: 'Vision Score',
    value: '42.8',
    trend: '+18%',
    trendUp: true,
    subtitle: 'Excellent',
    progress: 85,
    icon: Eye,
    color: 'green'
  },
  {
    title: 'Win Rate',
    value: '56.8%',
    trend: '+8%',
    trendUp: true,
    subtitle: 'Last 20 games',
    progress: 57,
    icon: Trophy,
    color: 'purple'
  }
];

const kpiDataPlayerB = [
  {
    title: 'KDA Ratio',
    value: '2.85',
    trend: '+8%',
    trendUp: true,
    subtitle: 'Top 35% globally',
    progress: 60,
    icon: Trophy,
    color: 'cyan'
  },
  {
    title: 'Damage Share',
    value: '25.2%',
    trend: '-2%',
    trendUp: false,
    subtitle: 'Average',
    progress: 55,
    icon: Swords,
    color: 'red'
  },
  {
    title: 'Gold per Min',
    value: '368',
    trend: '+5%',
    trendUp: true,
    subtitle: 'Top 40% globally',
    progress: 62,
    icon: Coins,
    color: 'amber'
  },
  {
    title: 'Vision Score',
    value: '38.5',
    trend: '+12%',
    trendUp: true,
    subtitle: 'Good',
    progress: 72,
    icon: Eye,
    color: 'green'
  },
  {
    title: 'Win Rate',
    value: '51.2%',
    trend: '+3%',
    trendUp: true,
    subtitle: 'Last 20 games',
    progress: 51,
    icon: Trophy,
    color: 'purple'
  }
];

const colorClasses = {
  cyan: 'from-cyan-500/20 to-cyan-600/20 border-cyan-500/30 shadow-cyan-500/10',
  red: 'from-red-500/20 to-red-600/20 border-red-500/30 shadow-red-500/10',
  amber: 'from-amber-500/20 to-amber-600/20 border-amber-500/30 shadow-amber-500/10',
  green: 'from-green-500/20 to-green-600/20 border-green-500/30 shadow-green-500/10',
  purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30 shadow-purple-500/10'
};

const iconColorClasses = {
  cyan: 'text-cyan-400',
  red: 'text-red-400',
  amber: 'text-amber-400',
  green: 'text-green-400',
  purple: 'text-purple-400'
};

const progressColorClasses = {
  cyan: '[&>div]:bg-cyan-500',
  red: '[&>div]:bg-red-500',
  amber: '[&>div]:bg-amber-500',
  green: '[&>div]:bg-green-500',
  purple: '[&>div]:bg-purple-500'
};

interface KPICardsProps {
  comparisonMode: boolean;
}

export function KPICards({ comparisonMode }: KPICardsProps) {
  if (comparisonMode) {
    return (
      <div className="space-y-4">
        {/* Player A Row */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-cyan-400" />
            <span className="text-sm text-cyan-400">Player A Stats</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {kpiDataPlayerA.map((kpi, index) => {
              const Icon = kpi.icon;
              return (
                <div
                  key={index}
                  className={`bg-gradient-to-br ${colorClasses[kpi.color as keyof typeof colorClasses]} backdrop-blur-sm rounded-xl p-6 border shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer ring-2 ring-cyan-400/20`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-2 rounded-lg bg-slate-900/50 ${iconColorClasses[kpi.color as keyof typeof iconColorClasses]}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className={`flex items-center gap-1 text-sm ${kpi.trendUp ? 'text-green-400' : 'text-red-400'}`}>
                      {kpi.trendUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {kpi.trend}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-slate-400 text-sm">{kpi.title}</p>
                    <p className="text-3xl text-white">{kpi.value}</p>
                    <p className="text-slate-500 text-xs">{kpi.subtitle}</p>
                  </div>

                  <div className="mt-4">
                    <Progress 
                      value={kpi.progress} 
                      className={`h-1.5 bg-slate-800/50 ${progressColorClasses[kpi.color as keyof typeof progressColorClasses]}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Player B Row */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-fuchsia-400" />
            <span className="text-sm text-fuchsia-400">Player B Stats</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {kpiDataPlayerB.map((kpi, index) => {
              const Icon = kpi.icon;
              return (
                <div
                  key={index}
                  className={`bg-gradient-to-br ${colorClasses[kpi.color as keyof typeof colorClasses]} backdrop-blur-sm rounded-xl p-6 border shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer ring-2 ring-fuchsia-400/20`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-2 rounded-lg bg-slate-900/50 ${iconColorClasses[kpi.color as keyof typeof iconColorClasses]}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className={`flex items-center gap-1 text-sm ${kpi.trendUp ? 'text-green-400' : 'text-red-400'}`}>
                      {kpi.trendUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {kpi.trend}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-slate-400 text-sm">{kpi.title}</p>
                    <p className="text-3xl text-white">{kpi.value}</p>
                    <p className="text-slate-500 text-xs">{kpi.subtitle}</p>
                  </div>

                  <div className="mt-4">
                    <Progress 
                      value={kpi.progress} 
                      className={`h-1.5 bg-slate-800/50 ${progressColorClasses[kpi.color as keyof typeof progressColorClasses]}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {kpiDataPlayerA.map((kpi, index) => {
        const Icon = kpi.icon;
        return (
          <div
            key={index}
            className={`bg-gradient-to-br ${colorClasses[kpi.color as keyof typeof colorClasses]} backdrop-blur-sm rounded-xl p-6 border shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-2 rounded-lg bg-slate-900/50 ${iconColorClasses[kpi.color as keyof typeof iconColorClasses]}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className={`flex items-center gap-1 text-sm ${kpi.trendUp ? 'text-green-400' : 'text-red-400'}`}>
                {kpi.trendUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {kpi.trend}
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-slate-400 text-sm">{kpi.title}</p>
              <p className="text-3xl text-white">{kpi.value}</p>
              <p className="text-slate-500 text-xs">{kpi.subtitle}</p>
            </div>

            <div className="mt-4">
              <Progress 
                value={kpi.progress} 
                className={`h-1.5 bg-slate-800/50 ${progressColorClasses[kpi.color as keyof typeof progressColorClasses]}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
