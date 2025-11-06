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
}

export function ChampionGrid({ filters, comparisonMode }: ChampionGridProps) {
  return (
    <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
      <h2 className="text-xl text-indigo-400 mb-6">
        Champion Breakdown {comparisonMode && <span className="text-sm text-slate-400">(Player A)</span>}
      </h2>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-700 hover:bg-slate-800/50">
              <TableHead className="text-slate-400">Champion</TableHead>
              <TableHead className="text-slate-400">Matches</TableHead>
              <TableHead className="text-slate-400">Avg KDA</TableHead>
              <TableHead className="text-slate-400">Win Rate</TableHead>
              <TableHead className="text-slate-400">Damage%</TableHead>
              <TableHead className="text-slate-400">Vision</TableHead>
              <TableHead className="text-slate-400">GPM</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {championData.map((champ, index) => (
              <TableRow 
                key={index} 
                className="border-slate-700/50 hover:bg-slate-800/50 transition-colors cursor-pointer group"
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${
                      champ.winRate >= 60 ? 'from-green-500/20 to-green-600/20 ring-2 ring-green-500/50' : 
                      champ.winRate >= 55 ? 'from-blue-500/20 to-blue-600/20 ring-2 ring-blue-500/50' : 
                      'from-red-500/20 to-red-600/20 ring-2 ring-red-500/50'
                    } flex items-center justify-center text-xl`}>
                      {champ.icon}
                    </div>
                    <span className="text-white group-hover:text-cyan-400 transition-colors">{champ.champion}</span>
                  </div>
                </TableCell>
                <TableCell className="text-slate-300">{champ.matches}</TableCell>
                <TableCell className="text-cyan-400">{champ.avgKDA}</TableCell>
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
