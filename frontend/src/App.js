import React, { useState, useEffect, useMemo } from 'react';
import LeftSidebar from './components/LeftSidebar';
import MapArea from './components/MapArea';
import RightSidebar from './components/RightSidebar';
import TimelineBar from './components/TimelineBar';
import ParticipantDetailsModal from './components/ParticipantDetailsModal';
import FrameEventsModal from './components/FrameEventsModal';
import YearRecapPage from './components/YearRecapPage';
import PerformanceAnalyticsPage from './components/PerformanceAnalyticsPage';
import { FeaturesPage } from './components/FeaturesPage';
import matchData from './data/match-data.json';
import matchSummary from './data/match-summary.json';

// Configuration
const API_BASE_URL = 'http://localhost:8000';
const SNEAKY_PUUID = 'BQD2G_OKDrt_YjF9A5qJvfzClUx0Fe2fPzQm8cqLQWnATfQmzBta-JAW3ZOGABb07RmYrpJ_AXr-cg';

function App() {
  const [currentPage, setCurrentPage] = useState('match');
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

  const frames = matchData.info.frames;

  const participantSummaryById = useMemo(() => {
    const participants = matchSummary?.info?.participants || [];
    return participants.reduce((acc, participant) => {
      if (participant?.participantId != null) {
        acc[participant.participantId] = participant;
      }
      return acc;
    }, {});
  }, []);

  const eventFiltersWithPositions = useMemo(() => {
    const result = {
      kills: false,
      objectives: false,
      wards: false,
      items: false
    };

    frames.forEach(frame => {
      frame.events?.forEach(event => {
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
          puuid: SNEAKY_PUUID,
          player_name: 'Sneaky#NA1'
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

  // Fetch year recap data when navigating to that page
  useEffect(() => {
    if (currentPage === 'year-recap') {
      fetchYearRecapData();
    }
  }, [currentPage]);

  return (
    <div className="h-screen w-screen bg-bg-dark flex flex-col overflow-hidden">
      {/* Navigation Bar */}
      <div className="bg-gray-900 border-b border-gray-700 px-6 py-3 flex items-center gap-4">
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
          <button
            onClick={() => setCurrentPage('features')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              currentPage === 'features'
                ? 'bg-primary-gold text-bg-dark'
                : 'bg-gray-800 text-white hover:bg-gray-700'
            }`}
          >
            Insights & Social
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
        <PerformanceAnalyticsPage />
      ) : currentPage === 'features' ? (
        <FeaturesPage />
      ) : (
        <>
      <div className="flex-1 flex overflow-hidden">
        <LeftSidebar 
          playerFilter={playerFilter}
          setPlayerFilter={setPlayerFilter}
          eventToggles={eventToggles}
          setEventToggles={setEventToggles}
          availableEventFilters={eventFiltersWithPositions}
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
        />
        
        <RightSidebar 
          currentFrame={currentFrame}
          selectedPlayer={selectedPlayer}
          pinnedPlayers={pinnedPlayers}
          onPinPlayer={handlePinPlayer}
          onClose={() => setSelectedPlayer(null)}
          participantSummary={participantSummaryById}
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
    </div>
  );
}

export default App;
