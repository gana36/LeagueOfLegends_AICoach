import { Search, Settings, Users } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';

interface HeaderProps {
  filters: {
    region: string;
    champion: string;
    role: string;
    patch: string;
    timeRange: string;
  };
  setFilters: (filters: any) => void;
  comparisonMode: boolean;
  setComparisonMode: (mode: boolean) => void;
  playerA: string;
  setPlayerA: (name: string) => void;
  playerB: string;
  setPlayerB: (name: string) => void;
}

export function Header({ filters, setFilters, comparisonMode, setComparisonMode, playerA, setPlayerA, playerB, setPlayerB }: HeaderProps) {
  return (
    <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-cyan-500/20 shadow-lg shadow-cyan-500/5">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Player Profiles */}
          <div className="flex items-center gap-6">
            {/* Player A */}
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16 ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-900">
                <AvatarImage src="https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&h=200&fit=crop" />
                <AvatarFallback>PA</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-cyan-400 text-2xl">{playerA}</h1>
                <p className="text-slate-400">Diamond II • 237 LP</p>
              </div>
            </div>

            {/* VS Indicator when in comparison mode */}
            {comparisonMode && (
              <>
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 border border-purple-500/30">
                  <span className="text-purple-400">VS</span>
                </div>

                {/* Player B */}
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16 ring-2 ring-fuchsia-400 ring-offset-2 ring-offset-slate-900">
                    <AvatarImage src="https://images.unsplash.com/photo-1534308143481-c55f00be8bd7?w=200&h=200&fit=crop" />
                    <AvatarFallback>PB</AvatarFallback>
                  </Avatar>
                  <div>
                    <h1 className="text-fuchsia-400 text-2xl">{playerB}</h1>
                    <p className="text-slate-400">Platinum I • 184 LP</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Comparison Toggle & Controls */}
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setComparisonMode(!comparisonMode)}
              className={`${
                comparisonMode 
                  ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white' 
                  : 'bg-slate-800/50 text-slate-300 border-slate-700'
              } hover:opacity-90 transition-all`}
            >
              <Users className="w-4 h-4 mr-2" />
              {comparisonMode ? 'Exit Compare' : 'Compare Players'}
            </Button>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search..." 
                className="pl-9 w-40 bg-slate-800/50 border-slate-700 text-slate-200"
              />
            </div>

            <button className="p-2 rounded-lg bg-slate-800/50 border border-slate-700 hover:bg-slate-700/50 transition-colors">
              <Settings className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-3 pb-2 border-t border-slate-700/50 pt-4">
          <span className="text-slate-400 text-sm mr-2">Filters:</span>
          
          <Select value={filters.region} onValueChange={(value) => setFilters({ ...filters, region: value })}>
            <SelectTrigger className="w-24 bg-slate-800/50 border-slate-700 text-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NA">NA</SelectItem>
              <SelectItem value="EUW">EUW</SelectItem>
              <SelectItem value="KR">KR</SelectItem>
              <SelectItem value="CN">CN</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.champion} onValueChange={(value) => setFilters({ ...filters, champion: value })}>
            <SelectTrigger className="w-32 bg-slate-800/50 border-slate-700 text-slate-200">
              <SelectValue placeholder="Champion" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Champions</SelectItem>
              <SelectItem value="Yasuo">Yasuo</SelectItem>
              <SelectItem value="Zed">Zed</SelectItem>
              <SelectItem value="Ahri">Ahri</SelectItem>
              <SelectItem value="Jinx">Jinx</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.role} onValueChange={(value) => setFilters({ ...filters, role: value })}>
            <SelectTrigger className="w-32 bg-slate-800/50 border-slate-700 text-slate-200">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Roles</SelectItem>
              <SelectItem value="Top">Top</SelectItem>
              <SelectItem value="Jungle">Jungle</SelectItem>
              <SelectItem value="Mid">Mid</SelectItem>
              <SelectItem value="Bot">Bot</SelectItem>
              <SelectItem value="Support">Support</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.patch} onValueChange={(value) => setFilters({ ...filters, patch: value })}>
            <SelectTrigger className="w-28 bg-slate-800/50 border-slate-700 text-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="14.21">14.21</SelectItem>
              <SelectItem value="14.20">14.20</SelectItem>
              <SelectItem value="14.19">14.19</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.timeRange} onValueChange={(value) => setFilters({ ...filters, timeRange: value })}>
            <SelectTrigger className="w-32 bg-slate-800/50 border-slate-700 text-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="20">Last 20</SelectItem>
              <SelectItem value="50">Last 50</SelectItem>
              <SelectItem value="100">Last 100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
