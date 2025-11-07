import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';

const championData = [
  { champion: 'Yasuo', icon: '⚔️', avgKDA: '3.8', winRate: 62, damage: 28.5, vision: 38, gpm: 395, matches: 12 },
  { champion: 'Zed', icon: '🗡️', avgKDA: '4.2', winRate: 58, damage: 31.2, vision: 35, gpm: 405, matches: 8 },
  { champion: 'Ahri', icon: '🦊', avgKDA: '3.1', winRate: 55, damage: 26.8, vision: 45, gpm: 378, matches: 15 },
  { champion: 'Jinx', icon: '💣', avgKDA: '3.5', winRate: 60, damage: 32.1, vision: 42, gpm: 410, matches: 10 },
  { champion: 'Thresh', icon: '⛓️', avgKDA: '2.9', winRate: 52, damage: 12.4, vision: 58, gpm: 285, matches: 7 }
];

interface ChampionGridProps {
  filters: any;
  comparisonMode: boolean;
  data?: any;
  loading?: boolean;
}

export function ChampionGrid({ filters, comparisonMode, data, loading }: ChampionGridProps) {
  const championDataToDisplay = data?.champions || championData;

  if (loading) {
    return (
      <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
        <h2 className="text-xl text-indigo-400 mb-6">Champion Breakdown</h2>
        <div className="text-center text-slate-400 py-8">Loading champion data...</div>
      </div>
    );
  }
  return (
    <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-indigo-500/20 shadow-lg shadow-indigo-500/5 h-full flex flex-col">
      <h2 className="text-xl text-indigo-400 mb-6">
        Champion Breakdown {comparisonMode && <span className="text-sm text-slate-400">(Player A)</span>}
      </h2>

      <div className="overflow-x-auto overflow-y-auto flex-1 scrollbar-hide" style={{ maxHeight: '420px' }}>
        <Table>
          <TableHeader className="sticky top-0 bg-slate-900 z-10">
            <TableRow className="border-slate-700 hover:bg-slate-800/50">
              <TableHead className="text-slate-400 bg-slate-900">Champion</TableHead>
              <TableHead className="text-slate-400 bg-slate-900">Matches</TableHead>
              <TableHead className="text-slate-400 bg-slate-900">Avg KDA</TableHead>
              <TableHead className="text-slate-400 bg-slate-900">Win Rate</TableHead>
              <TableHead className="text-slate-400 bg-slate-900">Damage%</TableHead>
              <TableHead className="text-slate-400 bg-slate-900">Vision</TableHead>
              <TableHead className="text-slate-400 bg-slate-900">GPM</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {championDataToDisplay.map((champ: any, index: number) => (
              <TableRow 
                key={index} 
                className="border-slate-700/50 hover:bg-slate-800/50 transition-colors cursor-pointer group"
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg overflow-hidden ${
                      champ.winRate >= 60 ? 'ring-2 ring-green-500/50' :
                      champ.winRate >= 55 ? 'ring-2 ring-blue-500/50' :
                      'ring-2 ring-red-500/50'
                    }`}>
                      <img
                        src={`https://ddragon.leagueoflegends.com/cdn/12.4.1/img/champion/${champ.champion}.png`}
                        alt={champ.champion}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="20">🎮</text></svg>';
                        }}
                      />
                    </div>
                    <span className="text-white group-hover:text-cyan-400 transition-colors">{champ.champion}</span>
                  </div>
                </TableCell>
                <TableCell className="text-slate-300">{champ.matches}</TableCell>
                <TableCell className="text-cyan-400">{typeof champ.avgKDA === 'number' ? champ.avgKDA.toFixed(2) : champ.avgKDA}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant={champ.winRate >= 55 ? "default" : "secondary"} 
                           className={champ.winRate >= 55 ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}>
                      {champ.winRate}%
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-red-400">{champ.damage}%</TableCell>
                <TableCell className="text-green-400">{champ.vision}</TableCell>
                <TableCell className="text-amber-400">{champ.gpm}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
