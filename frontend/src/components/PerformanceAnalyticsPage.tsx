import { useState, useRef, useEffect } from 'react';
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
  const pageContentRef = useRef<HTMLDivElement>(null);

  // Read URL hash on mount to restore shared view
  useEffect(() => {
    const hash = window.location.hash;
    
    // Handle new compact format: /#/a/[data]
    if (hash.startsWith('#/a/')) {
      try {
        const data = hash.replace('#/a/', '');
        const parts = data.split('-');
        
        if (parts.length >= 7) {
          // Format: r-c-ro-pt-t-cm-p (always 7 parts)
          let idx = 0;
          
          // Region (single char code)
          const regionMap: { [key: string]: string } = { n: 'NA', e: 'EUW', k: 'KR', c: 'CN' };
          const regionCode = parts[idx++];
          if (regionMap[regionCode]) {
            setFilters(prev => ({ ...prev, region: regionMap[regionCode] }));
          }
          
          // Champion (3 chars, 'x' means All)
          const championCode = parts[idx++];
          if (championCode && championCode !== 'x') {
            // Map common champions
            const champMap: { [key: string]: string } = {
              'yas': 'Yasuo', 'zed': 'Zed', 'ahr': 'Ahri', 'jin': 'Jinx', 'thr': 'Thresh'
            };
            setFilters(prev => ({ ...prev, champion: champMap[championCode] || championCode }));
          }
          
          // Role (single char, 'x' means All)
          const roleCode = parts[idx++];
          if (roleCode && roleCode !== 'x') {
            const roleMap: { [key: string]: string } = { t: 'Top', j: 'Jungle', m: 'Mid', b: 'Bot', s: 'Support' };
            if (roleMap[roleCode]) {
              setFilters(prev => ({ ...prev, role: roleMap[roleCode] }));
            }
          }
          
          // Patch (digits, convert 1421 -> 14.21)
          const patchDigits = parts[idx++];
          if (patchDigits && patchDigits.length === 4) {
            const patch = `${patchDigits.substring(0, 2)}.${patchDigits.substring(2)}`;
            setFilters(prev => ({ ...prev, patch }));
          }
          
          // Time range
          const timeRange = parts[idx++];
          if (timeRange) {
            setFilters(prev => ({ ...prev, timeRange }));
          }
          
          // Comparison mode
          const compMode = parts[idx++];
          if (compMode === '1') {
            setComparisonMode(true);
          }
          
          // Player name (last part, 3 chars)
          const playerHash = parts[idx];
          if (playerHash) {
            setPlayerA(playerHash.charAt(0).toUpperCase() + playerHash.slice(1) + ' Performance');
          }
        }
      } catch (err) {
        console.error('Failed to decode shared link:', err);
      }
    }
    // Handle old format for backward compatibility
    else if (hash.startsWith('#/analytics/')) {
      try {
        const encoded = hash.replace('#/analytics/', '');
        const decoded = encoded.replace(/[-_]/g, (m) => {
          return { '-': '+', '_': '/' }[m] || m;
        });
        const filterData = JSON.parse(atob(decoded));
        
        if (filterData.p) {
          setPlayerA(filterData.p);
        }
        
        if (filterData.r) {
          setFilters(prev => ({ ...prev, region: filterData.r }));
        }
        
        if (filterData.c) {
          setFilters(prev => ({ ...prev, champion: filterData.c }));
        }
        
        if (filterData.ro) {
          setFilters(prev => ({ ...prev, role: filterData.ro }));
        }
        
        if (filterData.pt) {
          setFilters(prev => ({ ...prev, patch: filterData.pt }));
        }
        
        if (filterData.t) {
          setFilters(prev => ({ ...prev, timeRange: filterData.t }));
        }
        
        if (filterData.cm) {
          setComparisonMode(filterData.cm === '1');
        }
      } catch (err) {
        console.error('Failed to decode shared link:', err);
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 overflow-auto">
      <div className="relative">
        {/* Background glow effects */}
        <div className="fixed top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

        {/* Main Content */}
        <div ref={pageContentRef} className="relative z-10 p-6 space-y-6">
          <Header
            filters={filters}
            setFilters={setFilters}
            comparisonMode={comparisonMode}
            setComparisonMode={setComparisonMode}
            playerA={playerA}
            setPlayerA={setPlayerA}
            playerB={playerB}
            setPlayerB={setPlayerB}
            pageContentRef={pageContentRef}
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
