import { useState } from 'react';
import { Header } from './dashboard/Header';
import { KPICards } from './dashboard/KPICards';
import { TrendCharts } from './dashboard/TrendCharts';
import { RadarChartPanel } from './dashboard/RadarChartPanel';
import { ChampionGrid } from './dashboard/ChampionGrid';
import { ObjectivePanel } from './dashboard/ObjectivePanel';
import { VisionPanel } from './dashboard/VisionPanel';
import { ItemRuneSection } from './dashboard/ItemRuneSection';

function PerformanceAnalyticsPage() {
  const [filters, setFilters] = useState({
    region: 'NA',
    champion: 'All',
    role: 'All',
    patch: '14.21',
    timeRange: '20'
  });

  const [comparisonMode, setComparisonMode] = useState(false);
  const [playerA, setPlayerA] = useState('Summoner Performance');
  const [playerB, setPlayerB] = useState('Rival Player');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 overflow-auto">
      <div className="relative">
        {/* Background glow effects */}
        <div className="fixed top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

        {/* Main Content */}
        <div className="relative z-10 p-6 space-y-6">
          <Header
            filters={filters}
            setFilters={setFilters}
            comparisonMode={comparisonMode}
            setComparisonMode={setComparisonMode}
            playerA={playerA}
            setPlayerA={setPlayerA}
            playerB={playerB}
            setPlayerB={setPlayerB}
          />

          <KPICards comparisonMode={comparisonMode} />

          <TrendCharts comparisonMode={comparisonMode} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ChampionGrid filters={filters} comparisonMode={comparisonMode} />
            </div>
            <div>
              <RadarChartPanel comparisonMode={comparisonMode} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ObjectivePanel comparisonMode={comparisonMode} />
            <VisionPanel comparisonMode={comparisonMode} />
            <ItemRuneSection comparisonMode={comparisonMode} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default PerformanceAnalyticsPage;
