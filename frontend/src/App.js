import React, { useState, useEffect, useMemo } from 'react';
import LeftSidebar from './components/LeftSidebar';
import MapArea from './components/MapArea';
import RightSidebar from './components/RightSidebar';
import TimelineBar from './components/TimelineBar';
import ParticipantDetailsModal from './components/ParticipantDetailsModal';
import FrameEventsModal from './components/FrameEventsModal';
import YearRecapPage from './components/YearRecapPage';
import PerformanceAnalyticsPage from './components/PerformanceAnalyticsPage';
import PlayerSearch from './components/PlayerSearch';
import MatchSelector from './components/MatchSelector';
import { DataCacheProvider } from './contexts/DataCacheContext';
import { API_URL } from './config';
const EMPTY_MATCH_DATA = { info: { frames: [] } };
const EMPTY_MATCH_SUMMARY = { info: { participants: [] } };

// Configuration
const API_BASE_URL = API_URL;
const SNEAKY_PUUID = 'BQD2G_OKDrt_YjF9A5qJvfzClUx0Fe2fPzQm8cqLQWnATfQmzBta-JAW3ZOGABb07RmYrpJ_AXr-cg';

function App() {
  // Restore last visited page from localStorage, default to performance-analytics
  const [currentPage, setCurrentPage] = useState(() => {
    const savedPage = localStorage.getItem('lastVisitedPage');
    return savedPage || 'performance-analytics';
  });
  
  // Handle hash routing for shared links
  const [showPlayerSearch, setShowPlayerSearch] = useState(false);
  const [currentPlayerData, setCurrentPlayerData] = useState(null);
  const [currentPuuid, setCurrentPuuid] = useState(SNEAKY_PUUID);
  const [currentPlayerName, setCurrentPlayerName] = useState('Sneaky#NA1');

  // Match data state
  const [matchData, setMatchData] = useState(EMPTY_MATCH_DATA);
  const [matchSummary, setMatchSummary] = useState(EMPTY_MATCH_SUMMARY);
  const [currentMatchId, setCurrentMatchId] = useState(null);
  const [mainParticipantId, setMainParticipantId] = useState(1);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [matchError, setMatchError] = useState(null);
  const [yearRecapData, setYearRecapData] = useState(null);
  const [yearRecapLoading, setYearRecapLoading] = useState(false);
  const [yearRecapError, setYearRecapError] = useState(null);
  const [narrativeData, setNarrativeData] = useState(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [narrativeError, setNarrativeError] = useState(null);
  const [performanceAnalyticsData, setPerformanceAnalyticsData] = useState(null);
  const [performanceAnalyticsLoading, setPerformanceAnalyticsLoading] = useState(false);
  const [performanceAnalyticsError, setPerformanceAnalyticsError] = useState(null);
  const [performanceAnalyticsFilters, setPerformanceAnalyticsFilters] = useState({
    region: 'NA',
    champion: 'All',
    role: 'All',
    timeRange: '20'
  });
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [playerFilter, setPlayerFilter] = useState('solo');
  const [eventToggles, setEventToggles] = useState({
    kills: true,
    objectives: true,
    wards: false,
    items: false
  });
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [pinnedPlayers, setPinnedPlayers] = useState([]);
  const [detailsModalPlayer, setDetailsModalPlayer] = useState(null);
  const [showFrameEvents, setShowFrameEvents] = useState(false);
  const [isMatchDropdownOpen, setIsMatchDropdownOpen] = useState(false);

  // Cache for timeline data to prevent duplicate fetches
  const [timelineCache, setTimelineCache] = useState({});
  const [pendingTimelineRequests, setPendingTimelineRequests] = useState({});

  const frames = matchData?.info?.frames ?? [];
  
  // Save current page to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('lastVisitedPage', currentPage);
  }, [currentPage]);
  
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/a/') || hash.startsWith('#/analytics/')) {
        setCurrentPage('performance-analytics');
      }
    };
    
    // Check on mount
    handleHashChange();
    
    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const participantSummaryById = useMemo(() => {
    const participants = matchSummary?.info?.participants || [];
    return participants.reduce((acc, participant) => {
      if (participant?.participantId != null) {
        acc[participant.participantId] = participant;
      }
      return acc;
    }, {});
  }, [matchSummary]);

  const eventFiltersWithPositions = useMemo(() => {
    const result = {
      kills: false,
      objectives: false,
      wards: false,
      items: false
    };

    frames.forEach(frame => {
      if (!frame?.events) return;

      frame.events.forEach(event => {
        if (!event.position) return;

        if (event.type === 'CHAMPION_KILL') {
          result.kills = true;
        } else if (event.type === 'ELITE_MONSTER_KILL' || event.type === 'BUILDING_KILL') {
          result.objectives = true;
        } else if (event.type?.includes('WARD')) {
          result.wards = true;
        } else if (event.type?.includes('ITEM')) {
          result.items = true;
        }
      });
    });

    return result;
  }, [frames]);

  useEffect(() => {
    setEventToggles(prev => {
      let changed = false;
      const next = { ...prev };

      Object.entries(next).forEach(([key, value]) => {
        if (!eventFiltersWithPositions[key] && value) {
          next[key] = false;
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [eventFiltersWithPositions]);
  const currentFrame = frames[currentFrameIndex];
  const maxFrames = frames.length;

  // Playback effect
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentFrameIndex(prev => {
        if (prev >= maxFrames - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 2000 / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, maxFrames]);

  const handleTimelineChange = (frameIndex) => {
    setCurrentFrameIndex(frameIndex);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleNextFrame = () => {
    if (currentFrameIndex < maxFrames - 1) {
      setCurrentFrameIndex(currentFrameIndex + 1);
    }
  };

  const handlePreviousFrame = () => {
    if (currentFrameIndex > 0) {
      setCurrentFrameIndex(currentFrameIndex - 1);
    }
  };

  const handlePlayerClick = (participantId) => {
    setDetailsModalPlayer(participantId);
    setIsMatchDropdownOpen(false); // Close dropdown when modal opens
  };

  const handlePinPlayer = (participantId) => {
    if (pinnedPlayers.includes(participantId)) {
      setPinnedPlayers(pinnedPlayers.filter(id => id !== participantId));
    } else {
      setPinnedPlayers([...pinnedPlayers, participantId]);
    }
  };

  // Handle player found callback from PlayerSearch
  const handlePlayerFound = (playerData) => {
    console.log('Player found:', playerData);
    setCurrentPlayerData(playerData);
    setCurrentPuuid(playerData.puuid);
    setCurrentPlayerName(`${playerData.gameName}#${playerData.tagLine}`);

    // Reset year recap data so it fetches for the new player
    setYearRecapData(null);

    // Reset narrative data
    setNarrativeData(null);
    setNarrativeError(null);

    // Reset performance analytics data so it fetches for the new player
    setPerformanceAnalyticsData(null);

    // Reset match data and clear timeline cache
    setCurrentMatchId(null);
    setMatchData(EMPTY_MATCH_DATA);
    setMatchSummary(EMPTY_MATCH_SUMMARY);
    setCurrentFrameIndex(0);
    setIsPlaying(false);
    setTimelineCache({});
    setPendingTimelineRequests({});

    // Close the search modal
    setShowPlayerSearch(false);

    // Optionally navigate to a page to show the new player's data
    // For now, we'll stay on the current page
  };

  // Handle match selection with timeline caching
  const handleMatchSelect = async (matchInfo) => {
    console.log('Match selected:', matchInfo);

    try {
      setLoadingMatch(true);
      setMatchError(null);
      setCurrentMatchId(matchInfo.matchId);

      // Fetch full match data if not already included
      let fullMatchData = matchInfo.fullData;
      if (!fullMatchData) {
        console.log('Fetching full match data for:', matchInfo.matchId);
        const matchResponse = await fetch(
          `${API_BASE_URL}/api/player/match/${currentPuuid}/${matchInfo.matchId}`
        );
        
        if (matchResponse.ok) {
          const matchData = await matchResponse.json();
          fullMatchData = matchData.data;
        } else {
          throw new Error('Failed to fetch full match data');
        }
      }

      // Set match summary immediately
      setMatchSummary(fullMatchData || EMPTY_MATCH_SUMMARY);

      // Find the participant ID for the current player
      const participantIdForPlayer = fullMatchData?.info?.participants?.find(
        participant => participant.puuid === currentPuuid
      )?.participantId;
      if (participantIdForPlayer) {
        setMainParticipantId(participantIdForPlayer);
      }

      // Check cache first
      if (timelineCache[matchInfo.matchId]) {
        console.log('Using cached timeline data for:', matchInfo.matchId);
        setMatchData(timelineCache[matchInfo.matchId]);
        setCurrentFrameIndex(0);
        setIsPlaying(false);
        setLoadingMatch(false);
        return;
      }

      // Check if request is already pending
      if (pendingTimelineRequests[matchInfo.matchId]) {
        console.log('Timeline request already pending for:', matchInfo.matchId);
        const timelinePayload = await pendingTimelineRequests[matchInfo.matchId];
        setMatchData(timelinePayload);
        setCurrentFrameIndex(0);
        setIsPlaying(false);
        setLoadingMatch(false);
        return;
      }

      // Create new request
      const requestPromise = (async () => {
        const timelineResponse = await fetch(
          `${API_BASE_URL}/api/player/match/timeline/${matchInfo.matchId}`
        );

        if (!timelineResponse.ok) {
          throw new Error('Failed to fetch match timeline');
        }

        const timelineData = await timelineResponse.json();

        if (timelineData.success) {
          const timelinePayload = timelineData.timeline?.data || timelineData.timeline || EMPTY_MATCH_DATA;
          if (!timelinePayload?.info?.frames) {
            throw new Error('Timeline data missing frames');
          }

          // Cache the timeline data
          setTimelineCache(prev => ({ ...prev, [matchInfo.matchId]: timelinePayload }));

          // Remove from pending requests
          setPendingTimelineRequests(prev => {
            const updated = { ...prev };
            delete updated[matchInfo.matchId];
            return updated;
          });

          return timelinePayload;
        } else {
          throw new Error('Timeline data not available');
        }
      })();

      // Store pending request
      setPendingTimelineRequests(prev => ({ ...prev, [matchInfo.matchId]: requestPromise }));

      // Wait for result
      const timelinePayload = await requestPromise;

      // Set the timeline data
      setMatchData(timelinePayload);

      // Reset playback
      setCurrentFrameIndex(0);
      setIsPlaying(false);
    } catch (error) {
      console.error('Error loading match:', error);
      setMatchError(error.message);

      // Remove from pending requests on error
      setPendingTimelineRequests(prev => {
        const updated = { ...prev };
        delete updated[matchInfo.matchId];
        return updated;
      });
    } finally {
      setLoadingMatch(false);
    }
  };

  // Fetch year recap data
  const fetchYearRecapData = async () => {
    setYearRecapLoading(true);
    setYearRecapError(null);

    try {
      // Check cache first
      const cacheKey = `yearRecap_${currentPuuid}`;
      const cachedData = localStorage.getItem(cacheKey);
      const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
      
      // Cache valid for 10 minutes
      const CACHE_DURATION = 10 * 60 * 1000;
      const now = Date.now();
      
      if (cachedData && cacheTimestamp) {
        const age = now - parseInt(cacheTimestamp);
        if (age < CACHE_DURATION) {
          console.log('Using cached year recap (age:', Math.round(age / 1000), 'seconds)');
          const cached = JSON.parse(cachedData);
          setYearRecapData(cached);
          setYearRecapLoading(false);
          return;
        } else {
          console.log('Year recap cache expired (age:', Math.round(age / 1000), 'seconds), fetching fresh data');
        }
      }

      const response = await fetch(`${API_BASE_URL}/api/year-recap/heatmap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          puuid: currentPuuid,
          player_name: currentPlayerName
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setYearRecapData(data);
      
      // Cache the data
      localStorage.setItem(cacheKey, JSON.stringify(data));
      localStorage.setItem(`${cacheKey}_timestamp`, now.toString());
      console.log('Year recap cached for 10 minutes');
    } catch (error) {
      console.error('Error fetching year recap data:', error);
      setYearRecapError(error.message);
    } finally {
      setYearRecapLoading(false);
    }
  };

  // Fetch performance analytics data
  const fetchPerformanceAnalyticsData = async (filters = performanceAnalyticsFilters) => {
    setPerformanceAnalyticsLoading(true);
    setPerformanceAnalyticsError(null);

    try {
      // Check cache first
      const filterKey = `${filters.champion}_${filters.role}_${filters.timeRange}`;
      const cacheKey = `perfAnalytics_${currentPuuid}_${filterKey}`;
      const cachedData = localStorage.getItem(cacheKey);
      const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
      
      // Cache valid for 10 minutes
      const CACHE_DURATION = 10 * 60 * 1000;
      const now = Date.now();
      
      if (cachedData && cacheTimestamp) {
        const age = now - parseInt(cacheTimestamp);
        if (age < CACHE_DURATION) {
          console.log('Using cached performance analytics (age:', Math.round(age / 1000), 'seconds)');
          const cached = JSON.parse(cachedData);
          setPerformanceAnalyticsData(cached);
          setPerformanceAnalyticsLoading(false);
          return;
        } else {
          console.log('Performance analytics cache expired (age:', Math.round(age / 1000), 'seconds), fetching fresh data');
        }
      }

      const response = await fetch(`${API_BASE_URL}/api/analytics/performance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          puuid: currentPuuid,
          champion: filters.champion !== 'All Champions' ? filters.champion : 'All',
          role: filters.role !== 'All Roles' ? filters.role : 'All',
          timeRange: parseInt(filters.timeRange)
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setPerformanceAnalyticsData(data);
      
      // Cache the data
      localStorage.setItem(cacheKey, JSON.stringify(data));
      localStorage.setItem(`${cacheKey}_timestamp`, now.toString());
      console.log('Performance analytics cached for 10 minutes');
    } catch (error) {
      console.error('Error fetching performance analytics:', error);
      setPerformanceAnalyticsError(error.message);
    } finally {
      setPerformanceAnalyticsLoading(false);
    }
  };

  // Fetch narrative data (cached in localStorage)
  const fetchNarrativeData = async () => {
    if (!currentPuuid) return;

    try {
      setNarrativeLoading(true);
      setNarrativeError(null);

      // Check cache first
      const cacheKey = `narrative_${currentPuuid}`;
      const cachedData = localStorage.getItem(cacheKey);
      const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
      
      // Cache valid for 10 minutes
      const CACHE_DURATION = 10 * 60 * 1000;
      const now = Date.now();
      
      if (cachedData && cacheTimestamp) {
        const age = now - parseInt(cacheTimestamp);
        if (age < CACHE_DURATION) {
          console.log('Using cached narrative (age:', Math.round(age / 1000), 'seconds)');
          const cached = JSON.parse(cachedData);
          setNarrativeData(cached);
          setNarrativeLoading(false);
          return;
        } else {
          console.log('Narrative cache expired (age:', Math.round(age / 1000), 'seconds), fetching fresh data');
        }
      }

      const response = await fetch(`${API_BASE_URL}/api/analytics/year-narrative`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          puuid: currentPuuid,
          player_name: currentPlayerName || 'Player',
          year: 2024
        })
      });

      const data = await response.json();

      if (data.success) {
        setNarrativeData(data);
        
        // Cache the data
        localStorage.setItem(cacheKey, JSON.stringify(data));
        localStorage.setItem(`${cacheKey}_timestamp`, now.toString());
        console.log('Narrative cached for 10 minutes');
      } else {
        setNarrativeError(data.error || 'Failed to generate narrative');
      }
    } catch (err) {
      setNarrativeError(err.message);
    } finally {
      setNarrativeLoading(false);
    }
  };

  // DON'T fetch analytics upfront - only when user navigates to those pages
  // This makes the app load instantly for match analysis (the primary use case)
  useEffect(() => {
    if (currentPuuid && currentPage === 'year-recap') {
      if (!yearRecapData) {
        fetchYearRecapData();
      }
      if (!narrativeData && !narrativeLoading) {
        fetchNarrativeData();
      }
    }
  }, [currentPuuid, currentPage, yearRecapData, narrativeData, narrativeLoading]);

  useEffect(() => {
    if (currentPuuid && currentPage === 'performance-analytics' && !performanceAnalyticsData) {
      // Only fetch if we don't already have the data
      fetchPerformanceAnalyticsData();
    }
  }, [currentPuuid, currentPage, performanceAnalyticsData]);

  return (
    <DataCacheProvider>
    <div className="h-screen w-screen bg-bg-dark flex flex-col overflow-hidden">
      {/* Navigation Bar */}
      <div className="bg-gray-900 border-b border-gray-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-xl font-bold text-primary-gold">RIFT Analyzer</div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage('performance-analytics')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                currentPage === 'performance-analytics'
                  ? 'bg-primary-gold text-bg-dark'
                  : 'bg-gray-800 text-white hover:bg-gray-700'
              }`}
            >
              Performance Analytics
            </button>
            <button
              onClick={() => setCurrentPage('match')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                currentPage === 'match'
                  ? 'bg-primary-gold text-bg-dark'
                  : 'bg-gray-800 text-white hover:bg-gray-700'
              }`}
            >
              Match Analysis
            </button>
            <button
              onClick={() => setCurrentPage('year-recap')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                currentPage === 'year-recap'
                  ? 'bg-primary-gold text-bg-dark'
                  : 'bg-gray-800 text-white hover:bg-gray-700'
              }`}
            >
              Year Recap
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-300">
            Current Player: <span className="text-primary-gold font-semibold">{currentPlayerName}</span>
          </div>
        </div>
      </div>

      {currentPage === 'year-recap' ? (
        <YearRecapPage
          yearRecapData={yearRecapData}
          puuid={currentPuuid}
          playerName={currentPlayerName}
          loading={yearRecapLoading}
          error={yearRecapError}
          narrativeData={narrativeData}
          narrativeLoading={narrativeLoading}
          narrativeError={narrativeError}
          onFetchNarrative={fetchNarrativeData}
        />
      ) : currentPage === 'performance-analytics' ? (
        <PerformanceAnalyticsPage
          puuid={currentPuuid}
          playerName={currentPlayerName}
          cachedData={performanceAnalyticsData}
          loading={performanceAnalyticsLoading}
          error={performanceAnalyticsError}
          onFiltersChange={(filters) => {
            setPerformanceAnalyticsFilters(filters);
            fetchPerformanceAnalyticsData(filters);
          }}
        />
      ) : (
        <>
      {/* Match Selector Bar */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-2">
        <MatchSelector
          puuid={currentPuuid}
          onMatchSelect={handleMatchSelect}
          currentMatchId={currentMatchId}
          onDropdownChange={setIsMatchDropdownOpen}
          forceClose={detailsModalPlayer !== null || showFrameEvents}
        />
        {loadingMatch && (
          <div className="text-center text-yellow-500 text-sm mt-2">
            Loading match data...
          </div>
        )}
        {matchError && (
          <div className="text-center text-red-500 text-sm mt-2">
            Error: {matchError}
          </div>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        <LeftSidebar
          matchSummary={matchSummary}
          playerFilter={playerFilter}
          setPlayerFilter={setPlayerFilter}
          eventToggles={eventToggles}
          setEventToggles={setEventToggles}
          availableEventFilters={eventFiltersWithPositions}
          currentPuuid={currentPuuid}
        />
        
        <MapArea 
          currentFrame={currentFrame}
          playerFilter={playerFilter}
          eventToggles={eventToggles}
          selectedPlayer={selectedPlayer}
          onPlayerClick={handlePlayerClick}
          frames={frames}
          currentFrameIndex={currentFrameIndex}
          participantSummary={participantSummaryById}
          mainParticipantId={mainParticipantId}
        />
        
        <RightSidebar 
          currentFrame={currentFrame}
          selectedPlayer={selectedPlayer}
          pinnedPlayers={pinnedPlayers}
          onPinPlayer={handlePinPlayer}
          onClose={() => setSelectedPlayer(null)}
          participantSummary={participantSummaryById}
          mainParticipantId={mainParticipantId}
          matchData={matchData}
          matchSummary={matchSummary}
          currentFrameIndex={currentFrameIndex}
          onNavigateToFrame={handleTimelineChange}
          eventToggles={eventToggles}
          onToggleEvent={(eventType, enabled) => {
            setEventToggles(prev => ({ ...prev, [eventType]: enabled }));
          }}
          onOpenPlayerModal={(participantId) => setDetailsModalPlayer(participantId)}
          onOpenFrameEventsModal={() => setShowFrameEvents(true)}
          onSetPlayerFilter={setPlayerFilter}
        />
      </div>
      
      <TimelineBar 
        currentFrameIndex={currentFrameIndex}
        maxFrames={maxFrames}
        isPlaying={isPlaying}
        playbackSpeed={playbackSpeed}
        onTimelineChange={handleTimelineChange}
        onPlayPause={handlePlayPause}
        onNextFrame={handleNextFrame}
        onPreviousFrame={handlePreviousFrame}
        onSpeedChange={setPlaybackSpeed}
        frames={frames}
        onShowFrameEvents={() => setShowFrameEvents(true)}
      />

      {detailsModalPlayer && (
        <ParticipantDetailsModal
          participantId={detailsModalPlayer}
          participant={currentFrame?.participantFrames?.[detailsModalPlayer]}
          currentFrame={currentFrame}
          allFrames={frames}
          currentFrameIndex={currentFrameIndex}
          participantSummaryMap={participantSummaryById}
          mainParticipantId={mainParticipantId}
          onClose={() => setDetailsModalPlayer(null)}
        />
      )}

      {showFrameEvents && (
        <FrameEventsModal
          frame={currentFrame}
          frameIndex={currentFrameIndex}
          participantSummaryMap={participantSummaryById}
          onClose={() => setShowFrameEvents(false)}
          onEventClick={(event) => {
            console.log('Event clicked:', event);
          }}
        />
      )}
        </>
      )}

      {/* Player Search Modal */}
      {showPlayerSearch && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="relative max-w-2xl w-full mx-4">
            <button
              onClick={() => setShowPlayerSearch(false)}
              className="absolute -top-4 -right-4 bg-red-600 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-red-700 transition-all z-10"
              aria-label="Close"
            >
              ✕
            </button>
            <PlayerSearch onPlayerFound={handlePlayerFound} />
          </div>
        </div>
      )}
    </div>
    </DataCacheProvider>
  );
}

export default App;
