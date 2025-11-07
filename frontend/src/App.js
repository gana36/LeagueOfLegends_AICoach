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
const EMPTY_MATCH_DATA = { info: { frames: [] } };
const EMPTY_MATCH_SUMMARY = { info: { participants: [] } };

// Configuration
const API_BASE_URL = 'http://localhost:8000';
const SNEAKY_PUUID = 'BQD2G_OKDrt_YjF9A5qJvfzClUx0Fe2fPzQm8cqLQWnATfQmzBta-JAW3ZOGABb07RmYrpJ_AXr-cg';

function App() {
  const [currentPage, setCurrentPage] = useState('match');
  
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

  const frames = matchData?.info?.frames ?? [];
  
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

    // Reset match data
    setCurrentMatchId(null);
    setMatchData(EMPTY_MATCH_DATA);
    setMatchSummary(EMPTY_MATCH_SUMMARY);
    setCurrentFrameIndex(0);
    setIsPlaying(false);

    // Close the search modal
    setShowPlayerSearch(false);

    // Optionally navigate to a page to show the new player's data
    // For now, we'll stay on the current page
  };

  // Handle match selection
  const handleMatchSelect = async (matchInfo) => {
    console.log('Match selected:', matchInfo);

    try {
      setLoadingMatch(true);
      setMatchError(null);
      setCurrentMatchId(matchInfo.matchId);

      // Set match summary immediately (from DynamoDB data)
      setMatchSummary(matchInfo.fullData || EMPTY_MATCH_SUMMARY);

      // Find the participant ID for the current player (Sneaky#NA1)
      const participantIdForPlayer = matchInfo.fullData?.info?.participants?.find(
        participant => participant.puuid === currentPuuid
      )?.participantId;
      if (participantIdForPlayer) {
        setMainParticipantId(participantIdForPlayer);
      }

      // Fetch timeline data from MongoDB
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

        // Set the timeline data
        setMatchData(timelinePayload);

        // Reset playback
        setCurrentFrameIndex(0);
        setIsPlaying(false);
      } else {
        throw new Error('Timeline data not available');
      }
    } catch (error) {
      console.error('Error loading match:', error);
      setMatchError(error.message);
    } finally {
      setLoadingMatch(false);
    }
  };

  // Fetch year recap data when switching to that page
  const fetchYearRecapData = async () => {
    if (yearRecapData) return; // Already fetched

    setYearRecapLoading(true);
    setYearRecapError(null);

    try {
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
    } catch (error) {
      console.error('Error fetching year recap data:', error);
      setYearRecapError(error.message);
    } finally {
      setYearRecapLoading(false);
    }
  };

  // Fetch year recap data when navigating to that page or when player changes
  useEffect(() => {
    if (currentPage === 'year-recap') {
      fetchYearRecapData();
    }
  }, [currentPage, currentPuuid]);

  return (
    <div className="h-screen w-screen bg-bg-dark flex flex-col overflow-hidden">
      {/* Navigation Bar */}
      <div className="bg-gray-900 border-b border-gray-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-xl font-bold text-primary-gold">RIFT Analyzer</div>
          <div className="flex gap-2">
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
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-300">
            Current Player: <span className="text-primary-gold font-semibold">{currentPlayerName}</span>
          </div>
          <button
            onClick={() => setShowPlayerSearch(true)}
            className="px-4 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all"
          >
            Load Player
          </button>
        </div>
      </div>

      {currentPage === 'year-recap' ? (
        <YearRecapPage
          yearRecapData={yearRecapData}
          loading={yearRecapLoading}
          error={yearRecapError}
        />
      ) : currentPage === 'performance-analytics' ? (
        <PerformanceAnalyticsPage puuid={currentPuuid} playerName={currentPlayerName} />
      ) : (
        <>
      {/* Match Selector Bar */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-2">
        <MatchSelector
          puuid={currentPuuid}
          onMatchSelect={handleMatchSelect}
          currentMatchId={currentMatchId}
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
  );
}

export default App;
