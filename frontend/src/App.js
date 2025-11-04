import React, { useState, useEffect, useMemo } from 'react';
import LeftSidebar from './components/LeftSidebar';
import MapArea from './components/MapArea';
import RightSidebar from './components/RightSidebar';
import TimelineBar from './components/TimelineBar';
import ParticipantDetailsModal from './components/ParticipantDetailsModal';
import FrameEventsModal from './components/FrameEventsModal';
import matchData from './data/match-data.json';

function App() {
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

  return (
    <div className="h-screen w-screen bg-bg-dark flex flex-col overflow-hidden">
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
        />
        
        <RightSidebar 
          currentFrame={currentFrame}
          selectedPlayer={selectedPlayer}
          pinnedPlayers={pinnedPlayers}
          onPinPlayer={handlePinPlayer}
          onClose={() => setSelectedPlayer(null)}
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
          onClose={() => setDetailsModalPlayer(null)}
        />
      )}

      {showFrameEvents && (
        <FrameEventsModal
          frame={currentFrame}
          frameIndex={currentFrameIndex}
          onClose={() => setShowFrameEvents(false)}
          onEventClick={(event) => {
            console.log('Event clicked:', event);
          }}
        />
      )}
    </div>
  );
}

export default App;
