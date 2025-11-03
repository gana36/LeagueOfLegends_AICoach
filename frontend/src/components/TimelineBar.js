import React, { useRef, useState } from 'react';

const TimelineBar = ({ 
  currentFrameIndex, 
  maxFrames, 
  isPlaying, 
  playbackSpeed,
  onTimelineChange, 
  onPlayPause, 
  onNextFrame, 
  onPreviousFrame,
  onSpeedChange,
  frames,
  onShowFrameEvents
}) => {
  const timelineRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleTimelineClick = (e) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const frameIndex = Math.floor(percent * (maxFrames - 1));
    
    onTimelineChange(Math.max(0, Math.min(maxFrames - 1, frameIndex)));
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    handleTimelineClick(e);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    handleTimelineClick(e);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging]);

  // Get time markers
  const getTimeMarkers = () => {
    const markers = [];
    const frameInterval = 60000; // 60 seconds per frame
    
    for (let i = 0; i < maxFrames; i += 1) {
      const timestamp = i * frameInterval;
      const minutes = Math.floor(timestamp / 60000);
      if (i % 1 === 0) { // Every minute
        markers.push({
          frameIndex: i,
          label: `${minutes}:00`,
          position: (i / (maxFrames - 1)) * 100
        });
      }
    }
    return markers;
  };

  // Get event markers from frames
  const getEventMarkers = () => {
    const eventMarkers = [];
    frames.forEach((frame, index) => {
      if (frame.events) {
        frame.events.forEach(event => {
          if (event.type === 'CHAMPION_KILL') {
            eventMarkers.push({
              frameIndex: index,
              type: 'kill',
              color: '#FF4655',
              position: (index / (maxFrames - 1)) * 100
            });
          } else if (event.type === 'ELITE_MONSTER_KILL') {
            eventMarkers.push({
              frameIndex: index,
              type: 'objective',
              color: '#FFD700',
              position: (index / (maxFrames - 1)) * 100
            });
          }
        });
      }
    });
    return eventMarkers;
  };

  const timeMarkers = getTimeMarkers();
  const eventMarkers = getEventMarkers();
  const currentPosition = (currentFrameIndex / (maxFrames - 1)) * 100;

  const getCurrentTime = () => {
    const timestamp = currentFrameIndex * 60000;
    const minutes = Math.floor(timestamp / 60000);
    const seconds = Math.floor((timestamp % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-20 bg-timeline-bg border-t border-gray-700 flex flex-col">
      {/* Timeline Scrubber */}
      <div className="flex-1 px-4 py-2">
        <div className="relative h-full">
          {/* Time markers */}
          <div className="absolute top-0 left-0 right-0 flex justify-between text-xs text-text-secondary mb-1">
            {timeMarkers.map((marker, idx) => (
              <div 
                key={idx}
                className="absolute transform -translate-x-1/2"
                style={{ left: `${marker.position}%` }}
              >
                {marker.label}
              </div>
            ))}
          </div>

          {/* Timeline track */}
          <div 
            ref={timelineRef}
            className="absolute top-6 left-0 right-0 h-2 bg-gray-700 rounded-full cursor-pointer"
            onMouseDown={handleMouseDown}
          >
            {/* Event markers */}
            {eventMarkers.map((marker, idx) => (
              <div
                key={idx}
                className="absolute top-1/2 transform -translate-y-1/2 w-2 h-2 rounded-full"
                style={{ 
                  left: `${marker.position}%`,
                  backgroundColor: marker.color
                }}
                title={marker.type}
              />
            ))}

            {/* Progress bar */}
            <div 
              className="absolute top-0 left-0 h-full bg-primary-gold rounded-full transition-all"
              style={{ width: `${currentPosition}%` }}
            />

            {/* Current position handle */}
            <div
              className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-primary-gold rounded-full border-2 border-white shadow-lg cursor-grab active:cursor-grabbing"
              style={{ left: `${currentPosition}%` }}
            />
          </div>

          {/* Current time display */}
          <div 
            className="absolute top-10 transform -translate-x-1/2 bg-gray-900 text-primary-gold text-xs px-2 py-1 rounded font-semibold"
            style={{ left: `${currentPosition}%` }}
          >
            {getCurrentTime()}
          </div>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="h-12 flex items-center justify-center gap-4 border-t border-gray-700">
        <button
          onClick={onPreviousFrame}
          className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center text-white transition-colors"
          title="Previous Frame"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>

        <button
          onClick={onPlayPause}
          className="w-12 h-12 bg-primary-gold hover:bg-yellow-500 rounded-full flex items-center justify-center text-bg-dark transition-colors shadow-lg"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16"/>
              <rect x="14" y="4" width="4" height="16"/>
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>

        <button
          onClick={onNextFrame}
          className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center text-white transition-colors"
          title="Next Frame"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>

        <select
          value={playbackSpeed}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
          className="bg-gray-700 text-white px-3 py-2 rounded text-sm border border-gray-600 focus:border-primary-gold focus:outline-none cursor-pointer"
        >
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={2}>2x</option>
          <option value={5}>5x</option>
        </select>

        <button
          onClick={onShowFrameEvents}
          className="bg-accent-purple hover:bg-purple-600 text-white px-4 py-2 rounded text-sm transition-colors flex items-center gap-2"
          title="View Frame Events"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          Frame Events ({frames[currentFrameIndex]?.events?.length || 0})
        </button>
      </div>
    </div>
  );
};

export default TimelineBar;
