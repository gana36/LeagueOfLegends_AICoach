import { useState, useEffect } from 'react';
import { Zap, Shield, Swords, Heart } from 'lucide-react';
import { Progress } from './ui/progress';
import { useDataCache } from '../../contexts/DataCacheContext';
import { API_URL } from '../../config';

interface ItemRuneSectionProps {
  comparisonMode: boolean;
  data?: any;
  loading?: boolean;
}

export function ItemRuneSection({ comparisonMode, data, loading }: ItemRuneSectionProps) {
  const [itemsWithNames, setItemsWithNames] = useState<any[]>([]);
  const [runesWithInfo, setRunesWithInfo] = useState<any[]>([]);
  const { getItemsInfo, getRunesInfo } = useDataCache();

  // Fetch item and rune metadata using cached data
  useEffect(() => {
    const fetchItemsAndRunes = async () => {
      if (data?.topItems) {
        // Extract item IDs and batch fetch
        const itemIds = data.topItems.slice(0, 4).map((item: any) => item.itemId);
        const itemsInfo = await getItemsInfo(itemIds);

        // Map to include usage data
        const itemsData = data.topItems.slice(0, 4).map((item: any, index: number) => {
          const itemInfo = itemsInfo[index];
          return {
            name: itemInfo?.name || `Item ${item.itemId}`,
            usage: item.pickRate,
            itemId: item.itemId,
            color: 'red'
          };
        });
        setItemsWithNames(itemsData);
      } else {
        setItemsWithNames([
          { name: 'Infinity Edge', usage: 78, itemId: 3031, color: 'red' },
          { name: 'Phantom Dancer', usage: 65, itemId: 3046, color: 'purple' },
          { name: 'Bloodthirster', usage: 58, itemId: 3072, color: 'red' },
          { name: 'Guardian Angel', usage: 52, itemId: 3026, color: 'amber' }
        ]);
      }

      if (data?.topRunes) {
        // Extract rune IDs and batch fetch
        const runeIds = data.topRunes.slice(0, 4).map((rune: any) => rune.runeId);
        const runesInfo = await getRunesInfo(runeIds);

        // Map to include usage data
        const runesData = data.topRunes.slice(0, 4).map((rune: any, index: number) => {
          const runeInfo = runesInfo[index];
          return {
            name: runeInfo?.name || `Rune ${rune.runeId}`,
            usage: rune.pickRate,
            runeId: rune.runeId,
            icon: runeInfo?.icon || '',
            color: 'red'
          };
        });
        setRunesWithInfo(runesData);
      } else {
        setRunesWithInfo([
          { name: 'Conqueror', usage: 72, runeId: 8010, icon: 'perk-images/Styles/Precision/Conqueror/Conqueror.png', color: 'red' },
          { name: 'Triumph', usage: 68, runeId: 9111, icon: 'perk-images/Styles/Precision/Triumph.png', color: 'green' },
          { name: 'Alacrity', usage: 64, runeId: 9104, icon: 'perk-images/Styles/Precision/LegendAlacrity/LegendAlacrity.png', color: 'amber' },
          { name: 'Last Stand', usage: 60, runeId: 8299, icon: 'perk-images/Styles/Sorcery/LastStand/LastStand.png', color: 'cyan' }
        ]);
      }
    };

    fetchItemsAndRunes();
  }, [data, getItemsInfo, getRunesInfo]);

  const items = itemsWithNames;
  const runes = runesWithInfo;

  if (loading) {
    return (
      <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-amber-500/30 shadow-lg shadow-amber-500/5">
        <h2 className="text-xl text-amber-400 mb-6">Most Used Items & Runes</h2>
        <div className="text-center text-slate-400 py-8">Loading items & runes...</div>
      </div>
    );
  }
  return (
    <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-amber-500/30 shadow-lg shadow-amber-500/5">
      <h2 className="text-xl text-amber-400 mb-6">
        Most Used Items & Runes {comparisonMode && <span className="text-sm text-slate-400">(Player A)</span>}
      </h2>
      
      {/* Items */}
      <div className="mb-4">
        <h3 className="text-sm text-slate-400 mb-4">Core Items</h3>
        <div className="grid grid-cols-2 gap-3">
          {items.map((item, index) => (
            <div 
              key={index}
              className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 rounded-lg p-3 border border-slate-700/50 hover:border-amber-500/50 transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded overflow-hidden bg-slate-900/50">
                  <img
                    src={`https://ddragon.leagueoflegends.com/cdn/15.21.1/img/item/${item.itemId}.png`}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="16">⚔️</text></svg>';
                    }}
                  />
                </div>
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
      <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent mb-4" />

      {/* Runes */}
      <div>
        <h3 className="text-sm text-slate-400 mb-4">Primary Runes</h3>
        <div className="space-y-3 overflow-y-auto scrollbar-hide" style={{ maxHeight: '180px' }}>
          {runes.map((rune, index) => {
            return (
              <div
                key={index}
                className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-all group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-900/50 flex items-center justify-center overflow-hidden">
                  {rune.icon ? (
                    <img
                      src={`https://ddragon.leagueoflegends.com/cdn/img/${rune.icon}`}
                      alt={rune.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="16">⚡</text></svg>';
                      }}
                    />
                  ) : (
                    <Swords className="w-4 h-4 text-purple-400" />
                  )}
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
