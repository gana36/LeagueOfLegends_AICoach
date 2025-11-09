import React, { useState, useRef, useEffect, useMemo } from 'react';
import HabitsSection from './HabitsSection';
import YearRecapCarousel from './YearRecapCarousel';
import { API_URL } from '../config';

const YearRecapPage = ({ yearRecapData, puuid, playerName, loading, error, narrativeData, narrativeLoading, narrativeError, onFetchNarrative }) => {
  const [mapDimensions, setMapDimensions] = useState({ width: 0, height: 0 });
  const [mapAspect, setMapAspect] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('deaths');
  const [heatmapIntensity, setHeatmapIntensity] = useState(0.7);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [timelineMode, setTimelineMode] = useState('total'); // 'total' or 'average'
  const [showNarrativeCarousel, setShowNarrativeCarousel] = useState(false);
  const [carouselKey, setCarouselKey] = useState(0); // Key to force carousel re-render
  const [currentMinute, setCurrentMinute] = useState(null); // null = show all data, number = show up to that minute
  const [isPlaying, setIsPlaying] = useState(false);

  // Filtering state for agent UI actions
  const [filteredHeatmapData, setFilteredHeatmapData] = useState(null); // Holds filtered data from agent
  const [activeFilters, setActiveFilters] = useState(null); // Display active filters

  const mapContainerRef = useRef(null);
  const mapImageRef = useRef(null);

  // Year Recap Chatbot state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      author: 'Year Recap Assistant',
      timestamp: 'Just now',
      content: 'Ask me anything about your year-long journey! I can tell you about achievements, patterns, and your evolution as a player.'
    }
  ]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [toolsInUse, setToolsInUse] = useState([]);
  const chatScrollRef = useRef(null);
  const lastMessageRef = useRef(null);
  const chatInputRef = useRef(null);

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
    { id: 'deaths', label: 'Deaths', icon: '✖', color: '#EF4444' },
    { id: 'kills', label: 'Kills', icon: '⚔', color: '#10B981' },
    { id: 'assists', label: 'Assists', icon: '＋', color: '#3B82F6' },
    { id: 'objectives', label: 'Objectives', icon: '◎', color: '#F59E0B' }
  ];

  const currentCategory = categories.find(c => c.id === selectedCategory);

  // Use filtered heatmap data if available, otherwise use full data
  const allCategoryData = useMemo(() => {
    // If agent has provided filtered data, use that
    if (filteredHeatmapData && filteredHeatmapData.event_type === selectedCategory) {
      console.log(`Using filtered heatmap data: ${filteredHeatmapData.events.length} events`);
      return filteredHeatmapData.events;
    }

    // Otherwise use full year recap data
    return yearRecapData?.heatmap_data?.[selectedCategory] || [];
  }, [yearRecapData, selectedCategory, filteredHeatmapData]);

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

  // Year Recap Chat Effects
  useEffect(() => {
    if (!isChatOpen) return;
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [chatMessages, isChatOpen]);

  useEffect(() => {
    if (isChatOpen && chatInputRef.current) {
      chatInputRef.current.focus();
    }
  }, [isChatOpen]);

  const hasUserMessages = useMemo(
    () => chatMessages.some(message => message.role === 'user'),
    [chatMessages]
  );

  const suggestedYearQuestions = useMemo(
    () => ([
      { id: 'champion-performance', label: 'How did I perform on Yasuo?', eta: '(uses tool)' },
      { id: 'role-analysis', label: 'Show me my Mid lane performance', eta: '(uses tool)' },
      { id: 'compare-champions', label: 'Compare my top 3 champions', eta: '(uses tools)' },
      { id: 'vision-control', label: 'How is my vision control?', eta: '(fetches data)' }
    ]),
    []
  );

  const handleSendChatMessage = async (event) => {
    event.preventDefault();
    const message = chatInput.trim();
    if (!message || !yearRecapData || !puuid) return;

    // Add user message
    const userMessage = {
      id: Date.now(),
      role: 'user',
      author: 'You',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: message
    };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsLoadingChat(true);

    // Add thinking indicator
    const thinkingMessage = {
      id: 'thinking',
      role: 'assistant',
      author: 'Year Recap Assistant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: '',
      isThinking: true
    };
    setChatMessages(prev => [...prev, thinkingMessage]);

    try {
      // Call year recap chat endpoint with puuid
      const response = await fetch(`${API_URL}/api/year-recap/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          year_recap_data: yearRecapData,
          puuid: puuid,
          conversation_history: conversationHistory
        })
      });

      const data = await response.json();

      // Update conversation history
      if (data.conversation_history) {
        setConversationHistory(data.conversation_history);
      }

      // Handle tools used
      if (data.tools_used && data.tools_used.length > 0) {
        setToolsInUse(data.tools_used);
        console.log('Tools used:', data.tools_used);
      }

      // Handle UI actions
      if (data.ui_actions && data.ui_actions.length > 0) {
        console.log('UI actions to execute:', data.ui_actions);
        // Find matching tool results for each UI action
        data.ui_actions.forEach(uiAction => {
          // Find the tool result for this action
          const toolResult = data.tools_used?.find(tool => tool.name === uiAction.action);
          executeUIAction({
            ...uiAction,
            result: toolResult?.result
          });
        });
      }

      // Remove thinking indicator and add AI response
      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        author: 'Year Recap Assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: data.response,
        tools_used: data.tools_used || []
      };
      setChatMessages(prev => prev.filter(m => m.id !== 'thinking').concat(aiMessage));
    } catch (error) {
      console.error('Year recap chat error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        author: 'Year Recap Assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: 'Sorry, I encountered an error. Please try again.'
      };
      setChatMessages(prev => prev.filter(m => m.id !== 'thinking').concat(errorMessage));
    } finally {
      setIsLoadingChat(false);
    }
  };

  const executeUIAction = (uiAction) => {
    const { action, params, result } = uiAction;

    console.log(`Executing UI action: ${action}`, params, result);

    switch (action) {
      case 'get_filtered_heatmap_visualization':
        // Extract filtered data from tool result
        if (result && result.data && result.data.filtered_events) {
          const eventType = params.event_type;

          setFilteredHeatmapData({
            event_type: eventType,
            events: result.data.filtered_events
          });

          setActiveFilters(result.data.filters_applied);

          // Switch to the correct category
          setSelectedCategory(eventType);

          console.log(`✅ Applied filtered heatmap: ${result.data.total_events} ${eventType} events`);
          console.log(`Filters:`, result.data.filters_applied);
        }
        break;
      default:
        console.log(`Unknown UI action: ${action}`);
    }
  };

  // Handle narrative button click
  const handleNarrativeClick = async () => {
    if (narrativeData) {
      // Already cached, just show carousel
      setShowNarrativeCarousel(true);
      setCarouselKey(prev => prev + 1);
    } else {
      // Fetch narrative data and show carousel when ready
      await onFetchNarrative();
      setShowNarrativeCarousel(true);
      setCarouselKey(prev => prev + 1);
    }
  };

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
          <div className="text-red-500 text-6xl font-black mb-4">!</div>
          <div className="text-white text-xl font-semibold mb-2">Failed to Load Year Recap</div>
          <div className="text-text-secondary text-sm mb-4">{error}</div>
          <div className="text-text-secondary text-xs">
            Make sure the backend server is running at {API_URL}
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
          <div className="text-text-secondary text-4xl font-semibold tracking-widest mb-4">DATA</div>
          <div className="text-white text-xl font-semibold">No Data Available</div>
          <div className="text-text-secondary text-sm mt-2">
            No timeline data found for this player
          </div>
        </div>
      </div>
    );
  }

  // Show narrative carousel if enabled
  if (showNarrativeCarousel && narrativeData) {
    return (
      <div className="relative">
        <YearRecapCarousel key={carouselKey} cachedNarrativeData={narrativeData} />
        {/* Exit button */}
        <button
          onClick={() => setShowNarrativeCarousel(false)}
          className="fixed top-4 right-4 z-50 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-sm border border-white/20 transition-all"
          title="Exit Narrative"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
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
        {/* Left Sidebar - Year Stats & Achievements */}
        <div className="w-80 bg-gray-900 border-r border-gray-700 p-4 overflow-y-auto">
          {/* Title Card */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-4">
            <h1 className="text-2xl font-bold text-primary-gold">Year Recap</h1>
            <p className="text-base text-white mt-2">{yearRecapData?.player_name || 'Player'}</p>
            <p className="text-sm text-text-secondary mt-1">
              Aggregated data from {stats.total_matches || 0} matches
            </p>
          </div>

          {/* Narrative Launch Button */}
          <button
            onClick={handleNarrativeClick}
            disabled={narrativeLoading}
            className="w-full bg-gradient-to-r from-[#C89B3C] to-[#9d7c30] hover:from-[#d4a64a] hover:to-[#C89B3C] text-[#0a1428] font-black py-4 px-6 rounded-lg mb-4 transition-all transform hover:scale-105 shadow-lg border-2 border-[#C89B3C] flex items-center justify-center gap-3 uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {narrativeLoading ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0a1428]"></div>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>View Your Year in Review</span>
              </>
            )}
          </button>
          {narrativeError && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-200 text-sm">
              {narrativeError}
            </div>
          )}

          {/* Year at a Glance */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
              Year at a Glance
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                <div className="text-2xl font-bold text-green-400">
                  {stats.kills_count || 0}
                </div>
                <div className="text-xs text-text-secondary">Total Kills</div>
                <div className="text-xs text-gray-500 mt-1">
                  {stats.total_matches > 0 ? (stats.kills_count / stats.total_matches).toFixed(1) : 0}/game
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                <div className="text-2xl font-bold text-blue-400">
                  {stats.assists_count || 0}
                </div>
                <div className="text-xs text-text-secondary">Total Assists</div>
                <div className="text-xs text-gray-500 mt-1">
                  {stats.total_matches > 0 ? (stats.assists_count / stats.total_matches).toFixed(1) : 0}/game
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                <div className="text-2xl font-bold text-red-400">
                  {stats.deaths_count || 0}
                </div>
                <div className="text-xs text-text-secondary">Total Deaths</div>
                <div className="text-xs text-gray-500 mt-1">
                  {stats.total_matches > 0 ? (stats.deaths_count / stats.total_matches).toFixed(1) : 0}/game
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                <div className="text-2xl font-bold text-amber-400">
                  {stats.total_matches > 0 && stats.deaths_count > 0
                    ? ((stats.kills_count + stats.assists_count) / stats.deaths_count).toFixed(2)
                    : '0.00'}
                </div>
                <div className="text-xs text-text-secondary">Yearly KDA</div>
                <div className="text-xs text-gray-500 mt-1">Lifetime ratio</div>
              </div>
            </div>
          </div>

          {/* Achievements */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
              Notable Achievements
            </h3>
            <div className="space-y-2">
              <div className="bg-gradient-to-r from-amber-900/30 to-transparent border border-amber-500/30 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">★</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-white">Games Played</div>
                    <div className="text-xs text-text-secondary">{stats.total_matches || 0} matches this year</div>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-r from-purple-900/30 to-transparent border border-purple-500/30 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">◎</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-white">Objective Focus</div>
                    <div className="text-xs text-text-secondary">{stats.objectives_count || 0} objectives secured</div>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-r from-cyan-900/30 to-transparent border border-cyan-500/30 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⚔</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-white">Combat Veteran</div>
                    <div className="text-xs text-text-secondary">
                      {(stats.kills_count || 0) + (stats.assists_count || 0)} takedowns
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Gameplay Habits */}
          <div className="mb-4">
            <HabitsSection puuid={puuid} timeRange={50} />
          </div>

          {/* Heatmap Settings */}
          <div className="mb-4">
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
          <div>
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
            {/* Active Filters Indicator */}
            {activeFilters && (activeFilters.champion || activeFilters.role || activeFilters.match_count || activeFilters.game_time_start != null || activeFilters.game_time_end != null) && (
              <div className="absolute top-4 left-4 z-50 bg-primary-gold/90 backdrop-blur-sm text-bg-dark px-4 py-2 rounded-lg shadow-lg">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide">Filtered View</span>
                  <button
                    onClick={() => {
                      setFilteredHeatmapData(null);
                      setActiveFilters(null);
                    }}
                    className="ml-2 text-xs hover:underline font-medium"
                  >
                    Clear
                  </button>
                </div>
                <div className="text-xs mt-1 flex flex-wrap gap-2">
                  {activeFilters.champion && (
                    <span className="bg-bg-dark/20 px-2 py-0.5 rounded">
                      Champion: {activeFilters.champion}
                    </span>
                  )}
                  {activeFilters.role && (
                    <span className="bg-bg-dark/20 px-2 py-0.5 rounded">
                      Role: {activeFilters.role}
                    </span>
                  )}
                  {activeFilters.match_count && (
                    <span className="bg-bg-dark/20 px-2 py-0.5 rounded">
                      Last {activeFilters.match_count} games
                    </span>
                  )}
                  {(activeFilters.game_time_start != null || activeFilters.game_time_end != null) && (
                    <span className="bg-bg-dark/20 px-2 py-0.5 rounded">
                      Game time: {activeFilters.game_time_start || 0}m - {activeFilters.game_time_end || '45'}m
                    </span>
                  )}
                </div>
              </div>
            )}

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

        {/* Right Sidebar - Event Categories with Chat Overlay */}
        <div className="w-80 bg-gray-900 border-l border-gray-700 overflow-y-auto relative">
          <div className="p-4 space-y-4">
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
          </div>

          {/* Floating Chat Button */}
          <button
            type="button"
            onClick={() => setIsChatOpen(true)}
            className={`fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-20 flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-primary-gold text-bg-dark shadow-lg transition-transform hover:scale-105 ${isChatOpen ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
            aria-label="Open Year Recap Assistant"
          >
            💬
          </button>

          {/* Chat Overlay - Match Analysis Style */}
          {isChatOpen && (
            <div className="absolute inset-0 z-30 bg-[#0d0d0d]/98 backdrop-blur-2xl flex flex-col">
              {/* Top bar */}
              <div className="px-4 py-3.5 border-b border-white/[0.08] flex items-center justify-between sticky top-0 bg-[#0d0d0d]/98 backdrop-blur-2xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-gold/20 to-primary-gold/5 border border-primary-gold/25 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary-gold">YR</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Year Recap Assistant</p>
                    <p className="text-[11px] text-white/40">Year-long insights</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsChatOpen(false)}
                  className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/50 hover:text-white/80 transition-all flex items-center justify-center"
                  aria-label="Close chat"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="stroke-current">
                    <path d="M1 1L11 11M11 1L1 11" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 min-h-0 flex flex-col">
                {!hasUserMessages ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center gap-5 px-5 py-6">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-gold/15 to-primary-gold/5 border border-primary-gold/25 flex items-center justify-center">
                        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                          <path d="M14 3L17 10L24 14L17 18L14 25L11 18L4 14L11 10L14 3Z" fill="currentColor" className="text-primary-gold/60"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-base font-semibold text-white mb-1">Year Recap Assistant</p>
                        <p className="text-xs text-white/40 max-w-[240px]">Ask about your year-long journey. Discover achievements and patterns.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div ref={chatScrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3 space-y-3">
                    {chatMessages.map((message, index) => {
                      const isLastMessage = index === chatMessages.length - 1;
                      return (
                      <div
                        key={message.id}
                        ref={isLastMessage ? lastMessageRef : null}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[90%] ${
                          message.role === 'user'
                            ? 'bg-primary-gold/10 border border-primary-gold/20 text-white rounded-xl px-3.5 py-2.5'
                            : 'space-y-2'
                        }`}>
                          {message.role === 'user' ? (
                            <>
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-[11px] font-medium text-white">{message.author}</span>
                                <span className="text-[10px] text-white/30">{message.timestamp}</span>
                              </div>
                              <p className="text-[13px] leading-relaxed">{message.content}</p>
                            </>
                          ) : (
                            <>
                              <div className="bg-white/[0.04] border border-white/[0.08] text-white/90 rounded-xl px-3.5 py-2.5">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="text-[11px] font-medium text-primary-gold">{message.author}</span>
                                  <span className="text-[10px] text-white/30">{message.timestamp}</span>
                                </div>
                                {message.isThinking ? (
                                  <div className="flex items-center gap-2">
                                    <div className="flex gap-1">
                                      <div className="w-2 h-2 bg-primary-gold/60 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                                      <div className="w-2 h-2 bg-primary-gold/60 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                                      <div className="w-2 h-2 bg-primary-gold/60 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                    <span className="text-[13px] text-white/40">Analyzing your year...</span>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {/* Show tool usage badges */}
                                    {message.tools_used && message.tools_used.length > 0 && (
                                      <div className="flex flex-wrap gap-1 pb-1 border-b border-white/[0.08]">
                                        {message.tools_used.map((tool, idx) => (
                                          <span
                                            key={idx}
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary-gold/10 border border-primary-gold/25 text-[10px] font-medium text-primary-gold"
                                          >
                                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="opacity-60">
                                              <path d="M5 1L8 5L5 9L2 5L5 1Z" fill="currentColor"/>
                                            </svg>
                                            {tool.name.replace(/_/g, ' ')}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                    {/* Message content */}
                                    <div className="space-y-1.5">
                                      {String(message.content)
                                        .split('\n')
                                        .map((line, lineIndex) => (
                                          line.trim().length > 0 ? (
                                            <p key={lineIndex} className="text-[13px] leading-relaxed">
                                              {line}
                                            </p>
                                          ) : (
                                            <div key={lineIndex} className="h-2" />
                                          )
                                        ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}

                {/* Suggested Questions */}
                {!hasUserMessages && (
                  <div className="px-4 pb-3">
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-wider text-white/30 mb-2 font-medium">Try asking</p>
                      <div className="space-y-1">
                        {suggestedYearQuestions.map(q => (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => {
                              setChatInput(q.label);
                              if (chatInputRef.current) chatInputRef.current.focus();
                            }}
                            className="w-full text-left rounded-md bg-white/[0.02] hover:bg-white/[0.06] px-2.5 py-2 text-xs text-white/70 hover:text-white/90 transition-all"
                          >
                            <span className="truncate">{q.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <form onSubmit={handleSendChatMessage} className="px-4 pb-4">
                <div className="flex items-center gap-2.5 rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-2.5 focus-within:border-white/[0.2] transition-colors">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={event => setChatInput(event.target.value)}
                    placeholder="Ask about your year..."
                    ref={chatInputRef}
                    className="flex-1 bg-transparent text-[13px] text-white placeholder:text-white/30 focus:outline-none caret-primary-gold"
                    disabled={isLoadingChat}
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || isLoadingChat}
                    className="flex-shrink-0 w-7 h-7 bg-primary-gold hover:bg-primary-gold/90 disabled:bg-white/[0.08] disabled:cursor-not-allowed text-bg-dark disabled:text-white/20 rounded-md flex items-center justify-center transition-all"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="stroke-current -rotate-45">
                      <path d="M13 1L1 13M13 1L13 7M13 1L7 1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </form>
            </div>
          )}
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
