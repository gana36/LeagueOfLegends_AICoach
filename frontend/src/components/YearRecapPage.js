import React, { useState, useRef, useEffect, useMemo } from 'react';

const YearRecapPage = ({ yearRecapData, loading, error }) => {
  const [mapDimensions, setMapDimensions] = useState({ width: 0, height: 0 });
  const [mapAspect, setMapAspect] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('deaths');
  const [heatmapIntensity, setHeatmapIntensity] = useState(0.7);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [timelineMode, setTimelineMode] = useState('total'); // 'total' or 'average'
  const [currentMinute, setCurrentMinute] = useState(null); // null = show all data, number = show up to that minute
  const [isPlaying, setIsPlaying] = useState(false);
  const mapContainerRef = useRef(null);
  const mapImageRef = useRef(null);

  const coordinateBounds = { minX: 0, maxX: 15000, minY: 0, maxY: 15000 };

  const handleImageLoad = () => {
    if (mapImageRef.current) {
      const { naturalWidth, naturalHeight } = mapImageRef.current;
      if (naturalWidth && naturalHeight) {
        setMapAspect(naturalWidth / naturalHeight);
      }
    }
  };

  useEffect(() => {
    const updateDimensions = () => {
      if (!mapContainerRef.current) return;

      const container = mapContainerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      if (!containerWidth || !containerHeight) return;

      let width = containerWidth;
      let height = width / mapAspect;

      if (height > containerHeight) {
        height = containerHeight;
        width = height * mapAspect;
      }

      setMapDimensions({ width, height });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [mapAspect]);

  useEffect(() => {
    if (mapImageRef.current && mapImageRef.current.complete) {
      handleImageLoad();
    }
  }, []);

  const categories = [
    { id: 'deaths', label: 'Deaths', icon: '💀', color: '#EF4444' },
    { id: 'kills', label: 'Kills', icon: '⚔️', color: '#10B981' },
    { id: 'assists', label: 'Assists', icon: '🤝', color: '#3B82F6' },
    { id: 'objectives', label: 'Objectives', icon: '🎯', color: '#F59E0B' }
  ];

  const currentCategory = categories.find(c => c.id === selectedCategory);
  const allCategoryData = yearRecapData?.heatmap_data?.[selectedCategory] || [];
  const currentTimelineData = yearRecapData?.timeline_data?.[selectedCategory] || [];

  // Playback effect
  const maxMinute = useMemo(() => {
    if (!currentTimelineData.length) return 45;
    return Math.max(...currentTimelineData.map(d => d.minute));
  }, [currentTimelineData]);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentMinute(prev => {
        const nextMinute = (prev === null ? 0 : prev) + 1;
        if (nextMinute > maxMinute) {
          setIsPlaying(false);
          return null; // Reset to show all data
        }
        return nextMinute;
      });
    }, 1000); // 1 second per minute

    return () => clearInterval(interval);
  }, [isPlaying, maxMinute]);

  const handlePlayPause = () => {
    if (!isPlaying && currentMinute === null) {
      setCurrentMinute(0); // Start from beginning
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimelineChange = (minute) => {
    setCurrentMinute(minute);
    setIsPlaying(false);
  };

  const handleReset = () => {
    setCurrentMinute(null);
    setIsPlaying(false);
  };

  const gameToPixelX = (gameCoord, dimension) => {
    if (!dimension) return 0;
    const normalized = (gameCoord - coordinateBounds.minX) / (coordinateBounds.maxX - coordinateBounds.minX);
    return normalized * dimension;
  };

  const gameToPixelY = (gameCoord, dimension) => {
    if (!dimension) return 0;
    const normalized = (gameCoord - coordinateBounds.minY) / (coordinateBounds.maxY - coordinateBounds.minY);
    return dimension - (normalized * dimension);
  };

  // Filter data based on current timeline position
  const currentData = useMemo(() => {
    if (currentMinute === null) {
      // Show all year data when not playing
      return allCategoryData;
    }
    // Filter to show only events up to current minute
    return allCategoryData.filter(point => {
      const pointMinute = Math.floor(point.timestamp / 60000);
      return pointMinute <= currentMinute;
    });
  }, [allCategoryData, currentMinute]);

  // Calculate density-based heatmap
  const heatmapPoints = useMemo(() => {
    if (!currentData.length) return [];

    // Create grid for density calculation (500 unit cells)
    const gridSize = 500;
    const densityMap = {};

    currentData.forEach(point => {
      const gridX = Math.floor(point.x / gridSize);
      const gridY = Math.floor(point.y / gridSize);
      const key = `${gridX},${gridY}`;
      densityMap[key] = (densityMap[key] || 0) + 1;
    });

    // Convert to array with density values
    const maxDensity = Math.max(...Object.values(densityMap));

    return currentData.map(point => {
      const gridX = Math.floor(point.x / gridSize);
      const gridY = Math.floor(point.y / gridSize);
      const key = `${gridX},${gridY}`;
      return {
        ...point,
        density: densityMap[key] / maxDensity
      };
    });
  }, [currentData]);

  const stats = yearRecapData?.stats || {};
  const highlights = yearRecapData?.highlights || {};
  const mostPlayedChampions = highlights?.most_played_champions || [];
  const highlightMatches = highlights?.highlight_matches || [];

  // Loading state
  if (loading) {
    return (
      <div className="flex-1 bg-bg-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-gold mx-auto mb-4"></div>
          <div className="text-white text-xl font-semibold">Generating Year Recap...</div>
          <div className="text-text-secondary text-sm mt-2">
            Analyzing timeline data from all matches
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 bg-bg-dark flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <div className="text-white text-xl font-semibold mb-2">Failed to Load Year Recap</div>
          <div className="text-text-secondary text-sm mb-4">{error}</div>
          <div className="text-text-secondary text-xs">
            Make sure the backend server is running at http://localhost:8000
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!yearRecapData || !yearRecapData.heatmap_data) {
    return (
      <div className="flex-1 bg-bg-dark flex items-center justify-center">
        <div className="text-center">
          <div className="text-text-secondary text-6xl mb-4">📊</div>
          <div className="text-white text-xl font-semibold">No Data Available</div>
          <div className="text-text-secondary text-sm mt-2">
            No timeline data found for this player
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-bg-dark flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Timeline Chart */}
        <div className="bg-gray-900 border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
              Timeline - {timelineMode === 'total' ? 'Total Count' : 'Average per Game'}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setTimelineMode('total')}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  timelineMode === 'total'
                    ? 'bg-primary-gold text-bg-dark'
                    : 'bg-gray-800 text-white hover:bg-gray-700'
                }`}
              >
                Total Count
              </button>
              <button
                onClick={() => setTimelineMode('average')}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  timelineMode === 'average'
                    ? 'bg-primary-gold text-bg-dark'
                    : 'bg-gray-800 text-white hover:bg-gray-700'
                }`}
              >
                Average per Game
              </button>
            </div>
          </div>
          <TimelineChart
            data={currentTimelineData}
            category={currentCategory}
            totalMatches={stats.total_matches || 1}
            mode={timelineMode}
          />
        </div>

        <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Heatmap Settings */}
        <div className="w-64 bg-gray-900 border-r border-gray-700 p-4 overflow-y-auto">
          {/* Heatmap Intensity Control */}
          <div>
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
              Heatmap Settings
            </h3>
            <div>
              <label className="block text-sm text-white mb-2">
                Intensity: {Math.round(heatmapIntensity * 100)}%
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={heatmapIntensity}
                onChange={(e) => setHeatmapIntensity(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          {/* Legend */}
          <div className="mt-6 pt-6 border-t border-gray-700">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
              Legend
            </h3>
            <div className="space-y-2 text-xs text-white">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{
                  backgroundColor: currentCategory?.color,
                  opacity: 0.3
                }} />
                <span>Low Activity</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{
                  backgroundColor: currentCategory?.color,
                  opacity: 0.7
                }} />
                <span>Medium Activity</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{
                  backgroundColor: currentCategory?.color,
                  opacity: 1
                }} />
                <span>High Activity</span>
              </div>
            </div>
          </div>
        </div>

        {/* Map Area */}
        <div className="flex-1 bg-bg-dark flex items-center justify-center p-4" ref={mapContainerRef}>
          <div
            className="relative bg-gray-800 rounded-lg overflow-hidden shadow-2xl flex items-center justify-center"
            style={{ width: mapDimensions.width, height: mapDimensions.height }}
          >
            <img
              ref={mapImageRef}
              src="/assets/map.png"
              alt="Summoner's Rift map"
              className="w-full h-full object-contain"
              onLoad={handleImageLoad}
              onError={handleImageLoad}
            />

            <div className="absolute inset-0" onClick={() => setSelectedPoint(null)}>
              {/* Heatmap Points */}
              {heatmapPoints.map((point, idx) => {
                const x = gameToPixelX(point.x, mapDimensions.width);
                const y = gameToPixelY(point.y, mapDimensions.height);

                // Size and opacity based on density
                const baseSize = 20;
                const size = baseSize + (point.density * 30);
                const opacity = 0.2 + (point.density * heatmapIntensity * 0.6);

                return (
                  <div
                    key={`heatmap-${idx}`}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all hover:scale-110"
                    style={{
                      left: `${x}px`,
                      top: `${y}px`,
                      width: `${size}px`,
                      height: `${size}px`,
                      backgroundColor: currentCategory?.color,
                      opacity: opacity,
                      borderRadius: '50%',
                      boxShadow: `0 0 ${size / 2}px ${currentCategory?.color}`,
                      pointerEvents: 'auto'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPoint(point);
                    }}
                  />
                );
              })}

            </div>

            {/* Selected Point Info */}
            {selectedPoint && (
              <div
                className="absolute bottom-4 left-4 w-80 bg-bg-dark border border-primary-gold rounded-xl shadow-2xl p-4 pointer-events-auto z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                      style={{
                        backgroundColor: currentCategory?.color,
                        color: '#ffffff'
                      }}
                    >
                      {currentCategory?.icon}
                    </div>
                    <div>
                      <div className="text-white font-semibold text-lg leading-tight">
                        {currentCategory?.label}
                      </div>
                      <div className="text-text-secondary text-xs">
                        Position: ({Math.round(selectedPoint.x)}, {Math.round(selectedPoint.y)})
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedPoint(null)}
                    className="text-text-secondary hover:text-primary-gold text-xl leading-none"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                <div className="mt-4 space-y-2">
                  {selectedPoint.match_id && (
                    <div className="bg-gray-800 rounded-md px-3 py-2">
                      <div className="text-xs uppercase tracking-wide text-text-secondary">Match ID</div>
                      <div className="text-white font-medium text-sm">{selectedPoint.match_id}</div>
                    </div>
                  )}
                  {selectedPoint.timestamp !== undefined && (
                    <div className="bg-gray-800 rounded-md px-3 py-2">
                      <div className="text-xs uppercase tracking-wide text-text-secondary">Game Time</div>
                      <div className="text-white font-medium text-sm">
                        {Math.floor(selectedPoint.timestamp / 60000)}:{String(Math.floor((selectedPoint.timestamp % 60000) / 1000)).padStart(2, '0')}
                      </div>
                    </div>
                  )}
                  {selectedPoint.monster_type && (
                    <div className="bg-gray-800 rounded-md px-3 py-2">
                      <div className="text-xs uppercase tracking-wide text-text-secondary">Monster Type</div>
                      <div className="text-white font-medium text-sm">{selectedPoint.monster_type}</div>
                    </div>
                  )}
                  {selectedPoint.building_type && (
                    <div className="bg-gray-800 rounded-md px-3 py-2">
                      <div className="text-xs uppercase tracking-wide text-text-secondary">Building Type</div>
                      <div className="text-white font-medium text-sm">{selectedPoint.building_type}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Header and Stats */}
        <div className="w-80 bg-gray-900 border-l border-gray-700 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Title Card */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <h1 className="text-2xl font-bold text-primary-gold">Year Recap</h1>
              <p className="text-base text-white mt-2">{yearRecapData?.player_name || 'Player'}</p>
              <p className="text-sm text-text-secondary mt-1">
                Aggregated heatmap data from {stats.total_matches || 0} matches
              </p>
            </div>

            {/* Event Categories */}
            <div>
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
                Event Categories
              </h3>
              <div className="space-y-2">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-primary-gold text-bg-dark font-semibold'
                        : 'bg-gray-800 text-white hover:bg-gray-700 border border-gray-700'
                    }`}
                  >
                    <span className="text-2xl">{cat.icon}</span>
                    <div className="flex-1 text-left">
                      <div className="font-medium">{cat.label}</div>
                      <div className={`text-xs ${
                        selectedCategory === cat.id ? 'text-bg-dark/70' : 'text-text-secondary'
                      }`}>
                        {stats[`${cat.id}_count`] || 0} events
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Most Played Champions */}
            {mostPlayedChampions.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-700">
                <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
                  Most Played Champions
                </h3>
                <div className="space-y-2">
                  {mostPlayedChampions.slice(0, 5).map((champ, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-800 rounded-lg p-3 border border-gray-700"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white font-medium">{champ.champion}</span>
                        <span className="text-text-secondary text-xs">{champ.games} games</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-green-400">{champ.win_rate.toFixed(1)}% WR</span>
                        <span className="text-text-secondary">•</span>
                        <span className="text-primary-gold">{champ.avg_kda.toFixed(2)} KDA</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Highlight Matches */}
            {highlightMatches.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-700">
                <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
                  Highlight Matches
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {highlightMatches.slice(0, 5).map((match, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-800 rounded-lg p-3 border border-gray-700"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white font-medium">{match.champion}</span>
                        <span className={`text-xs font-semibold ${match.win ? 'text-green-400' : 'text-red-400'}`}>
                          {match.win ? 'WIN' : 'LOSS'}
                        </span>
                      </div>
                      <div className="text-xs text-text-secondary">
                        {match.kills}/{match.deaths}/{match.assists} • {match.kda.toFixed(2)} KDA
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Playback Timeline Bar */}
      <YearRecapTimelineBar
        currentCategory={currentCategory}
        timelineData={currentTimelineData}
        totalEvents={stats[`${selectedCategory}_count`] || 0}
        currentMinute={currentMinute}
        maxMinute={maxMinute}
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        onTimelineChange={handleTimelineChange}
        onReset={handleReset}
        visibleEventsCount={currentData.length}
      />
    </div>
  );
};

// Year Recap Timeline Bar Component
const YearRecapTimelineBar = ({
  currentCategory,
  timelineData,
  totalEvents,
  currentMinute,
  maxMinute,
  isPlaying,
  onPlayPause,
  onTimelineChange,
  onReset,
  visibleEventsCount
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const timelineRef = useRef(null);

  const handleTimelineClick = (e) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const minute = Math.round(percent * maxMinute);
    onTimelineChange(Math.max(0, Math.min(maxMinute, minute)));
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    handleTimelineClick(e);
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      handleTimelineClick(e);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  if (!timelineData || timelineData.length === 0) {
    return null;
  }

  const maxCount = Math.max(...timelineData.map(d => d.count), 1);

  const formatTime = (minute) => {
    if (minute === null) return 'All Data';
    return `${minute}:00`;
  };

  const displayMinute = currentMinute === null ? maxMinute : currentMinute;

  return (
    <div className="bg-gray-900 border-t border-gray-700 px-6 py-3">
      <div className="flex items-center gap-4">
        {/* Play Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onPlayPause}
            className="w-10 h-10 rounded-full bg-primary-gold hover:bg-yellow-500 flex items-center justify-center transition-colors"
          >
            {isPlaying ? (
              <svg className="w-5 h-5 text-bg-dark" fill="currentColor" viewBox="0 0 20 20">
                <rect x="6" y="4" width="3" height="12" />
                <rect x="11" y="4" width="3" height="12" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-bg-dark ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                <polygon points="5,3 5,17 15,10" />
              </svg>
            )}
          </button>

          <button
            onClick={onReset}
            className="px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 text-white text-sm transition-colors"
          >
            Reset
          </button>

          <div className="text-white font-mono text-sm min-w-[80px]">
            {formatTime(currentMinute)}
          </div>
        </div>

        {/* Timeline Scrubber */}
        <div className="flex-1">
          <div
            ref={timelineRef}
            className="relative h-16 bg-gray-800 rounded-lg overflow-hidden cursor-pointer"
            onMouseDown={handleMouseDown}
          >
            {/* Minute markers */}
            <div className="absolute inset-0 flex pointer-events-none">
              {Array.from({ length: Math.ceil(maxMinute / 5) + 1 }, (_, i) => i * 5).map(minute => (
                <div
                  key={minute}
                  className="flex-1 border-l border-gray-700 relative"
                  style={{ minWidth: '0' }}
                >
                  <span className="absolute -bottom-5 left-0 text-xs text-text-secondary">
                    {minute}m
                  </span>
                </div>
              ))}
            </div>

            {/* Event bars */}
            <div className="absolute inset-0 pointer-events-none">
              {timelineData.map((point, i) => {
                if (point.count === 0) return null;
                const heightPercent = (point.count / maxCount) * 100;
                const leftPercent = (point.minute / maxMinute) * 100;
                const widthPercent = 100 / maxMinute;
                const isPast = currentMinute !== null && point.minute <= currentMinute;

                return (
                  <div
                    key={i}
                    className="absolute bottom-0 transition-all"
                    style={{
                      left: `${leftPercent}%`,
                      width: `${widthPercent}%`,
                      height: `${heightPercent}%`,
                      backgroundColor: currentCategory?.color,
                      opacity: currentMinute === null ? 0.5 : (isPast ? 0.8 : 0.2)
                    }}
                  />
                );
              })}
            </div>

            {/* Current position indicator */}
            {currentMinute !== null && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-primary-gold pointer-events-none"
                style={{ left: `${(currentMinute / maxMinute) * 100}%` }}
              >
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full">
                  <div className="w-3 h-3 bg-primary-gold rounded-full border-2 border-bg-dark" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Event info */}
        <div className="flex items-center gap-2 min-w-[200px]">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
            style={{ backgroundColor: currentCategory?.color }}
          >
            {currentCategory?.icon}
          </div>
          <div>
            <div className="text-sm font-semibold text-white">
              {currentMinute === null ? 'All Matches' : `Up to ${currentMinute}:00`}
            </div>
            <div className="text-xs text-text-secondary">
              {visibleEventsCount} events visible
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Timeline Chart Component
const TimelineChart = ({ data, category, totalMatches, mode = 'total' }) => {
  const chartRef = useRef(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-text-secondary text-sm">
        No timeline data available
      </div>
    );
  }

  // Chart dimensions
  const width = 1200;
  const height = 120;
  const padding = { top: 10, right: 40, bottom: 30, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Get the value to display based on mode
  const getValue = (point) => mode === 'total' ? point.count : point.average_per_game;

  // Calculate scales
  const maxMinute = Math.max(...data.map(d => d.minute));
  const maxValue = Math.max(...data.map(d => getValue(d)), 1);

  const xScale = (minute) => padding.left + (minute / maxMinute) * chartWidth;
  const yScale = (value) => padding.top + chartHeight - (value / maxValue) * chartHeight;

  // Generate path for line chart
  const linePath = data.map((point, i) => {
    const x = xScale(point.minute);
    const y = yScale(getValue(point));
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  // Generate area path
  const areaPath = `${linePath} L ${xScale(maxMinute)} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`;

  // X-axis ticks (every 5 minutes)
  const xTicks = [];
  for (let i = 0; i <= maxMinute; i += 5) {
    xTicks.push(i);
  }

  // Y-axis ticks
  const yTicks = [];
  const yStep = Math.max(1, Math.ceil(maxValue / 4));
  for (let i = 0; i <= Math.ceil(maxValue); i += yStep) {
    yTicks.push(i);
  }

  return (
    <div className="relative">
      <svg
        ref={chartRef}
        width={width}
        height={height}
        className="mx-auto"
        style={{ maxWidth: '100%', height: 'auto' }}
      >
        {/* Grid lines */}
        {yTicks.map(tick => (
          <line
            key={`grid-${tick}`}
            x1={padding.left}
            y1={yScale(tick)}
            x2={padding.left + chartWidth}
            y2={yScale(tick)}
            stroke="#374151"
            strokeWidth="1"
            strokeDasharray="4,4"
          />
        ))}

        {/* Area fill */}
        <path
          d={areaPath}
          fill={category?.color || '#EF4444'}
          opacity="0.2"
        />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={category?.color || '#EF4444'}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {data.map((point, i) => {
          const value = getValue(point);
          if (value === 0) return null;
          return (
            <circle
              key={i}
              cx={xScale(point.minute)}
              cy={yScale(value)}
              r="4"
              fill={category?.color || '#EF4444'}
              stroke="#1F2937"
              strokeWidth="2"
              className="cursor-pointer hover:r-6 transition-all"
              onMouseEnter={() => setHoveredPoint(point)}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          );
        })}

        {/* X-axis */}
        <line
          x1={padding.left}
          y1={padding.top + chartHeight}
          x2={padding.left + chartWidth}
          y2={padding.top + chartHeight}
          stroke="#6B7280"
          strokeWidth="2"
        />

        {/* X-axis ticks */}
        {xTicks.map(tick => (
          <g key={`x-tick-${tick}`}>
            <line
              x1={xScale(tick)}
              y1={padding.top + chartHeight}
              x2={xScale(tick)}
              y2={padding.top + chartHeight + 5}
              stroke="#6B7280"
              strokeWidth="2"
            />
            <text
              x={xScale(tick)}
              y={padding.top + chartHeight + 20}
              textAnchor="middle"
              fill="#9CA3AF"
              fontSize="12"
            >
              {tick}m
            </text>
          </g>
        ))}

        {/* Y-axis */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={padding.top + chartHeight}
          stroke="#6B7280"
          strokeWidth="2"
        />

        {/* Y-axis ticks */}
        {yTicks.map(tick => (
          <g key={`y-tick-${tick}`}>
            <line
              x1={padding.left - 5}
              y1={yScale(tick)}
              x2={padding.left}
              y2={yScale(tick)}
              stroke="#6B7280"
              strokeWidth="2"
            />
            <text
              x={padding.left - 10}
              y={yScale(tick)}
              textAnchor="end"
              alignmentBaseline="middle"
              fill="#9CA3AF"
              fontSize="12"
            >
              {mode === 'total' ? tick : tick.toFixed(1)}
            </text>
          </g>
        ))}

        {/* Y-axis label */}
        <text
          x={padding.left - 35}
          y={padding.top + chartHeight / 2}
          textAnchor="middle"
          fill="#9CA3AF"
          fontSize="11"
          transform={`rotate(-90, ${padding.left - 35}, ${padding.top + chartHeight / 2})`}
        >
          {mode === 'total' ? 'Total Count' : 'Avg per game'}
        </text>
      </svg>

      {/* Tooltip */}
      {hoveredPoint && (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 bg-gray-900 border border-primary-gold rounded-lg px-3 py-2 text-xs pointer-events-none z-50">
          <div className="text-white font-semibold">
            Minute {hoveredPoint.minute}
          </div>
          {mode === 'total' ? (
            <>
              <div className="text-text-secondary">
                Total: {hoveredPoint.count} across {totalMatches} matches
              </div>
              <div className="text-text-secondary text-[10px]">
                (Avg: {hoveredPoint.average_per_game.toFixed(2)} per game)
              </div>
            </>
          ) : (
            <>
              <div className="text-text-secondary">
                Avg: {hoveredPoint.average_per_game.toFixed(2)} per game
              </div>
              <div className="text-text-secondary text-[10px]">
                (Total: {hoveredPoint.count} across {totalMatches} matches)
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default YearRecapPage;
