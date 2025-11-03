import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

const MapArea = ({ 
  currentFrame, 
  playerFilter, 
  eventToggles, 
  selectedPlayer,
  onPlayerClick,
  frames,
  currentFrameIndex
}) => {
  const [mapDimensions, setMapDimensions] = useState({ width: 0, height: 0 });
  const [mapAspect, setMapAspect] = useState(1);
  const mapContainerRef = useRef(null);
  const mapImageRef = useRef(null);

  const coordinateBounds = useMemo(() => {
    const bounds = {
      minX: Infinity,
      maxX: -Infinity,
      minY: Infinity,
      maxY: -Infinity,
    };

    frames.forEach(frame => {
      if (!frame.participantFrames) return;
      Object.values(frame.participantFrames).forEach(participant => {
        if (participant?.position) {
          const { x, y } = participant.position;
          if (x < bounds.minX) bounds.minX = x;
          if (x > bounds.maxX) bounds.maxX = x;
          if (y < bounds.minY) bounds.minY = y;
          if (y > bounds.maxY) bounds.maxY = y;
        }
      });
      if (!frame.events) return;
      frame.events.forEach(event => {
        if (event?.position) {
          const { x, y } = event.position;
          if (x < bounds.minX) bounds.minX = x;
          if (x > bounds.maxX) bounds.maxX = x;
          if (y < bounds.minY) bounds.minY = y;
          if (y > bounds.maxY) bounds.maxY = y;
        }
      });
    });

    const hasData = Number.isFinite(bounds.minX) && Number.isFinite(bounds.maxX) && Number.isFinite(bounds.minY) && Number.isFinite(bounds.maxY);

    if (!hasData) {
      return { minX: 0, maxX: 15000, minY: 0, maxY: 15000 };
    }

    const padding = 250;
    return {
      minX: Math.max(0, bounds.minX - padding),
      maxX: Math.min(15000, bounds.maxX + padding),
      minY: Math.max(0, bounds.minY - padding),
      maxY: Math.min(15000, bounds.maxY + padding),
    };
  }, [frames]);

  const handleImageLoad = useCallback(() => {
    if (mapImageRef.current) {
      const { naturalWidth, naturalHeight } = mapImageRef.current;
      if (naturalWidth && naturalHeight) {
        setMapAspect(naturalWidth / naturalHeight);
      }
    }
  }, []);

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
  }, [handleImageLoad]);

  if (!currentFrame || !currentFrame.participantFrames) {
    return (
      <div className="flex-1 bg-bg-dark flex items-center justify-center">
        <div className="text-text-secondary">Loading match data...</div>
      </div>
    );
  }

  const participantFrames = Object.values(currentFrame.participantFrames);

  const gameToPixelX = (gameCoord, min, max, dimension) => {
    if (!dimension || max <= min) return 0;
    const clamped = Math.min(Math.max(gameCoord, min), max);
    const normalized = (clamped - min) / (max - min);
    return normalized * dimension;
  };

  const gameToPixelY = (gameCoord, min, max, dimension) => {
    if (!dimension || max <= min) return 0;
    const clamped = Math.min(Math.max(gameCoord, min), max);
    const normalized = (clamped - min) / (max - min);
    // Flip Y-axis: (0,0) is bottom-left in game coords, but top-left in CSS
    return dimension - (normalized * dimension);
  };

  // Filter players based on selection
  const getFilteredPlayers = () => {
    if (playerFilter === 'solo') {
      return participantFrames.filter(p => p.participantId === 1);
    } else if (playerFilter === 'team') {
      return participantFrames.filter(p => p.participantId <= 5);
    } else if (playerFilter === 'opponents') {
      return participantFrames.filter(p => p.participantId > 5);
    }
    return participantFrames;
  };

  const filteredPlayers = getFilteredPlayers();

  // Get events for current frame
  const getEventsForFrame = () => {
    if (!eventToggles.kills && !eventToggles.objectives) return [];
    
    const events = [];
    for (let i = 0; i <= currentFrameIndex; i++) {
      const frame = frames[i];
      if (frame.events) {
        frame.events.forEach(event => {
          if (eventToggles.kills && event.type === 'CHAMPION_KILL' && event.position) {
            events.push({ ...event, frameIndex: i });
          }
          if (eventToggles.objectives && 
              (event.type === 'ELITE_MONSTER_KILL' || event.type === 'BUILDING_KILL') && 
              event.position) {
            events.push({ ...event, frameIndex: i });
          }
        });
      }
    }
    return events.slice(-50); // Show last 50 events
  };

  const events = getEventsForFrame();

  return (
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

        <div className="absolute inset-0">
          {/* Event Markers */}
          {events.map((event, idx) => {
            if (!event.position) return null;
            
            const x = gameToPixelX(
              event.position.x,
              coordinateBounds.minX,
              coordinateBounds.maxX,
              mapDimensions.width,
            );
            const y = gameToPixelY(
              event.position.y,
              coordinateBounds.minY,
              coordinateBounds.maxY,
              mapDimensions.height,
            );

            let icon = '⚔';
            let size = 16;

            if (event.type === 'ELITE_MONSTER_KILL') {
              icon = event.monsterType === 'DRAGON' ? '🐉' : '👹';
              size = 20;
            } else if (event.type === 'BUILDING_KILL') {
              icon = '🏰';
              size = 18;
            }
            
            return (
              <div
                key={`event-${idx}`}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-125 transition-transform"
                style={{ 
                  left: `${x}px`, 
                  top: `${y}px`,
                  fontSize: `${size}px`,
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                  opacity: 0.7
                }}
                title={event.type}
              >
                {icon}
              </div>
            );
          })}

          {/* Player Markers */}
          {filteredPlayers.map(player => {
            if (!player.position) return null;
            
            const x = gameToPixelX(
              player.position.x,
              coordinateBounds.minX,
              coordinateBounds.maxX,
              mapDimensions.width,
            );
            const y = gameToPixelY(
              player.position.y,
              coordinateBounds.minY,
              coordinateBounds.maxY,
              mapDimensions.height,
            );
            
            const isMainPlayer = player.participantId === 1;
            const isTeammate = player.participantId <= 5;
            const isSelected = selectedPlayer === player.participantId;
            
            let circleColor = isTeammate ? '#00D9FF' : '#FF4655';
            let circleSize = 18;
            
            if (isMainPlayer) {
              circleColor = '#FFD700';
              circleSize = 24;
            }
            
            return (
              <div
                key={player.participantId}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all ${
                  isSelected ? 'scale-125 z-30' : 'hover:scale-110 z-20'
                }`}
                style={{ left: `${x}px`, top: `${y}px` }}
                onClick={() => onPlayerClick(player.participantId)}
              >
                <div
                  className={`rounded-full border-2 border-white flex items-center justify-center font-bold text-white text-xs ${
                    isMainPlayer ? 'animate-pulse' : ''
                  }`}
                  style={{
                    width: `${circleSize}px`,
                    height: `${circleSize}px`,
                    backgroundColor: circleColor,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
                  }}
                >
                  {player.participantId}
                </div>
                
                {/* Player tooltip on hover */}
                <div className="absolute left-1/2 -translate-x-1/2 -top-8 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 hover:opacity-100 pointer-events-none transition-opacity">
                  Player {player.participantId} - Lvl {player.level}
                </div>
              </div>
            );
          })}

          {/* Map overlay grid (optional) */}
          <div className="absolute inset-0 pointer-events-none opacity-10">
            <svg width="100%" height="100%">
              {[...Array(10)].map((_, i) => (
                <React.Fragment key={i}>
                  <line 
                    x1={`${(i + 1) * 10}%`} 
                    y1="0" 
                    x2={`${(i + 1) * 10}%`} 
                    y2="100%" 
                    stroke="white" 
                    strokeWidth="1"
                  />
                  <line 
                    x1="0" 
                    y1={`${(i + 1) * 10}%`} 
                    x2="100%" 
                    y2={`${(i + 1) * 10}%`} 
                    stroke="white" 
                    strokeWidth="1"
                  />
                </React.Fragment>
              ))}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapArea;
