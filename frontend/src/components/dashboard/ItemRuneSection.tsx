import { Zap, Shield, Swords, Heart } from 'lucide-react';
import { Progress } from './ui/progress';

const items = [
  { name: 'Infinity Edge', usage: 78, icon: '⚔️', color: 'red' },
  { name: 'Phantom Dancer', usage: 65, icon: '👻', color: 'purple' },
  { name: 'Bloodthirster', usage: 58, icon: '🩸', color: 'red' },
  { name: 'Guardian Angel', usage: 52, icon: '🛡️', color: 'amber' }
];

const runes = [
  { name: 'Conqueror', usage: 72, icon: Swords, color: 'red' },
  { name: 'Triumph', usage: 68, icon: Heart, color: 'green' },
  { name: 'Alacrity', usage: 64, icon: Zap, color: 'amber' },
  { name: 'Last Stand', usage: 60, icon: Shield, color: 'cyan' }
];

interface ItemRuneSectionProps {
  comparisonMode: boolean;
  data?: any;
  loading?: boolean;
}

export function ItemRuneSection({ comparisonMode, data, loading }: ItemRuneSectionProps) {
  // Use real data if available
  const items = data?.topItems ? data.topItems.slice(0, 4).map((item: any) => ({
    name: `Item ${item.itemId}`,
    usage: item.pickRate,
    icon: '⚔️',
    color: 'red'
  })) : [
    { name: 'Infinity Edge', usage: 78, icon: '⚔️', color: 'red' },
    { name: 'Phantom Dancer', usage: 65, icon: '👻', color: 'purple' },
    { name: 'Bloodthirster', usage: 58, icon: '🩸', color: 'red' },
    { name: 'Guardian Angel', usage: 52, icon: '🛡️', color: 'amber' }
  ];

  const runes = data?.topRunes ? data.topRunes.slice(0, 4).map((rune: any) => ({
    name: `Rune ${rune.runeId}`,
    usage: rune.pickRate,
    icon: Swords,
    color: 'red'
  })) : [
    { name: 'Conqueror', usage: 72, icon: Swords, color: 'red' },
    { name: 'Triumph', usage: 68, icon: Heart, color: 'green' },
    { name: 'Alacrity', usage: 64, icon: Zap, color: 'amber' },
    { name: 'Last Stand', usage: 60, icon: Shield, color: 'cyan' }
  ];

  if (loading) {
    return (
      <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-amber-500/20 shadow-lg shadow-amber-500/5">
        <h2 className="text-xl text-amber-400 mb-6">Most Used Items & Runes</h2>
        <div className="text-center text-slate-400 py-8">Loading items & runes...</div>
      </div>
    );
  }
  return (
    <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-amber-500/20 shadow-lg shadow-amber-500/5">
      <h2 className="text-xl text-amber-400 mb-6">
        Most Used Items & Runes {comparisonMode && <span className="text-sm text-slate-400">(Player A)</span>}
      </h2>
      
      {/* Items */}
      <div className="mb-6">
        <h3 className="text-sm text-slate-400 mb-4">Core Items</h3>
        <div className="grid grid-cols-2 gap-3">
          {items.map((item, index) => (
            <div 
              key={index}
              className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 rounded-lg p-3 border border-slate-700/50 hover:border-amber-500/50 transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 truncate group-hover:text-amber-400 transition-colors">{item.name}</p>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Pick Rate</span>
                  <span className="text-xs text-amber-400">{item.usage}%</span>
                </div>
                <Progress value={item.usage} className="h-1.5 bg-slate-800 [&>div]:bg-amber-500" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent mb-6" />

      {/* Runes */}
      <div>
        <h3 className="text-sm text-slate-400 mb-4">Primary Runes</h3>
        <div className="space-y-3">
          {runes.map((rune, index) => {
            const Icon = rune.icon;
            return (
              <div 
                key={index}
                className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-all group cursor-pointer"
              >
                <div className={`w-8 h-8 rounded-lg bg-${rune.color}-500/20 flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 text-${rune.color}-400`} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{rune.name}</span>
                    <span className="text-xs text-slate-500">{rune.usage}%</span>
                  </div>
                  <Progress value={rune.usage} className="h-1 bg-slate-700/50 [&>div]:bg-gradient-to-r [&>div]:from-purple-500 [&>div]:to-pink-500" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
