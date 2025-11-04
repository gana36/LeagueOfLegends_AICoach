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
  const categorizeEvent = (event) => {
    if (event.type === 'CHAMPION_KILL') return 'kills';
    if (event.type === 'ELITE_MONSTER_KILL' || event.type === 'BUILDING_KILL') return 'objectives';
    if (event.type?.includes('WARD')) return 'wards';
    if (event.type?.includes('ITEM')) return 'items';
    return null;
  };

  const getEventVisuals = (event) => {
    if (event.type === 'CHAMPION_KILL') {
      return {
        icon: '⚔',
        textColor: '#F87171',
        textShadow: '0 0 6px rgba(0,0,0,0.8)',
        size: 42,
        plain: true
      };
    }

    if (event.type === 'ELITE_MONSTER_KILL') {
      if (event.monsterType === 'DRAGON') {
        return {
          icon: '🐉',
          backgroundColor: '#7C2D12',
          borderColor: '#FB923C',
          textColor: '#FFF7ED',
          size: 30
        };
      }
      if (event.monsterType === 'BARON_NASHOR') {
        return {
          icon: '👑',
          backgroundColor: '#312E81',
          borderColor: '#C7D2FE',
          textColor: '#E0E7FF',
          size: 32
        };
      }
      if (event.monsterType === 'RIFTHERALD') {
        return {
          icon: '🌀',
          backgroundColor: '#1F2937',
          borderColor: '#38BDF8',
          textColor: '#E0F2FE',
          size: 30
        };
      }
      return {
        icon: '⭐',
        backgroundColor: '#92400E',
        borderColor: '#FDE68A',
        textColor: '#FEF3C7',
        size: 30
      };
    }

    if (event.type === 'BUILDING_KILL') {
      if (event.buildingType === 'TOWER_BUILDING') {
        return {
          icon: '🏰',
          backgroundColor: '#0F172A',
          borderColor: '#FBBF24',
          textColor: '#FEF08A',
          size: 28
        };
      }
      if (event.buildingType === 'INHIBITOR_BUILDING') {
        return {
          icon: '🛡',
          backgroundColor: '#1F2937',
          borderColor: '#F97316',
          textColor: '#FFEDD5',
          size: 28
        };
      }
      return {
        icon: '🏛',
        backgroundColor: '#111827',
        borderColor: '#6B7280',
        textColor: '#E5E7EB',
        size: 28
      };
    }

    if (event.type?.includes('WARD')) {
      const isKill = event.type === 'WARD_KILL';
      return {
        icon: isKill ? '✂️' : '👁',
        backgroundColor: isKill ? '#065F46' : '#047857',
        borderColor: isKill ? '#34D399' : '#6EE7B7',
        textColor: '#ECFDF5',
        size: 26
      };
    }

    if (event.type?.includes('ITEM')) {
      const isPurchase = event.type === 'ITEM_PURCHASED';
      return {
        icon: isPurchase ? '🛒' : '🎁',
        backgroundColor: '#1E3A8A',
        borderColor: '#93C5FD',
        textColor: '#DBEAFE',
        size: 26
      };
    }

    return {
      icon: '◉',
      backgroundColor: '#4B5563',
      borderColor: '#D1D5DB',
      textColor: '#F9FAFB',
      size: 26
    };
  };

  const getEventsForFrame = () => {
    const events = [];
    for (let i = 0; i <= currentFrameIndex; i++) {
      const frame = frames[i];
      if (!frame.events) continue;

      frame.events.forEach(event => {
        if (!event.position) return;

        const category = categorizeEvent(event);
        if (!category) return;

        if (!eventToggles[category]) return;

        events.push({ ...event, frameIndex: i, category });
      });
    }
    return events.slice(-50);
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

            const { icon, backgroundColor, borderColor, textColor, size, plain, textShadow } = getEventVisuals(event);
            
            return (
              <div
                key={`event-${idx}`}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform"
                style={{ 
                  left: `${x}px`, 
                  top: `${y}px`,
                }}
                title={event.type}
              >
                {plain ? (
                  <span
                    style={{
                      color: textColor || '#ffffff',
                      fontWeight: 900,
                      fontSize: `${Math.max(18, size)}px`,
                      textShadow: textShadow || '0 0 4px rgba(0,0,0,0.6)'
                    }}
                  >
                    {icon}
                  </span>
                ) : (
                  <div
                    className="rounded-full border-[3px] flex items-center justify-center"
                    style={{
                      width: `${size}px`,
                      height: `${size}px`,
                      backgroundColor,
                      borderColor,
                      color: textColor || '#ffffff',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.6)',
                      fontWeight: 800,
                      fontSize: `${Math.max(12, size * 0.45)}px`
                    }}
                  >
                    {icon}
                  </div>
                )}
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
