import { useState, useEffect } from 'react';
import LeftSidebar from '../components/replay/LeftSidebar';
import MapArea from '../components/replay/MapArea';
import RightSidebar from '../components/replay/RightSidebar';
import TimelineBar from '../components/replay/TimelineBar';
import ParticipantDetailsModal from '../components/replay/ParticipantDetailsModal';
import FrameEventsModal from '../components/replay/FrameEventsModal';
import matchData from '../data/match-data.json';

export default function ReplayAnalyzerPage() {
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
