import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { MONSTER_ICONS } from '../constants/monsterIcons';
import { getChampionImageUrl } from '../utils/championImages';

const MapArea = ({
  currentFrame,
  playerFilter,
  eventToggles,
  selectedPlayer,
  onPlayerClick,
  frames,
  currentFrameIndex,
  participantSummary = {},
  mainParticipantId = 1,
  selectedEvent: selectedEventProp,
  onSelectEvent
}) => {
  const [mapDimensions, setMapDimensions] = useState({ width: 0, height: 0 });
  const [mapAspect, setMapAspect] = useState(1);
  const [internalSelectedEvent, setInternalSelectedEvent] = useState(null);
  const isEventControlled = selectedEventProp !== undefined;
  const selectedEvent = isEventControlled ? selectedEventProp : internalSelectedEvent;

  const setSelectedEvent = useCallback((valueOrUpdater) => {
    const currentValue = isEventControlled ? selectedEventProp : internalSelectedEvent;
    const nextValue = typeof valueOrUpdater === 'function'
      ? valueOrUpdater(currentValue)
      : valueOrUpdater;

    if (!isEventControlled) {
      setInternalSelectedEvent(nextValue);
    }
    if (onSelectEvent) {
      onSelectEvent(nextValue);
    }
  }, [isEventControlled, selectedEventProp, internalSelectedEvent, onSelectEvent]);
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

  const hasFrameData = Boolean(currentFrame && currentFrame.participantFrames);
  const participantFrames = hasFrameData
    ? Object.values(currentFrame.participantFrames)
    : [];

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
      return participantFrames.filter(p => p.participantId === mainParticipantId);
    } else if (playerFilter === 'team') {
      // Show main player's team (same team as main player)
      const mainPlayerTeam = mainParticipantId <= 5 ? 'blue' : 'red';
      if (mainPlayerTeam === 'blue') {
        return participantFrames.filter(p => p.participantId <= 5);
      } else {
        return participantFrames.filter(p => p.participantId > 5);
      }
    } else if (playerFilter === 'opponents') {
      // Show opponents (opposite team from main player)
      const mainPlayerTeam = mainParticipantId <= 5 ? 'blue' : 'red';
      if (mainPlayerTeam === 'blue') {
        return participantFrames.filter(p => p.participantId > 5);
      } else {
        return participantFrames.filter(p => p.participantId <= 5);
      }
    } else if (playerFilter === 'blueTeam') {
      return participantFrames.filter(p => p.participantId <= 5);
    } else if (playerFilter === 'redTeam') {
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
      const monsterKey = event.monsterSubType || event.monsterType;
      const iconSrc = monsterKey ? MONSTER_ICONS[monsterKey] : undefined;

      const baseVisual = {
        backgroundColor: '#92400E',
        borderColor: '#FDE68A',
        textColor: '#FEF3C7',
        size: 30,
        iconAlt: monsterKey ? monsterKey.replace(/_/g, ' ') : 'Elite Monster',
      };

      if (event.monsterType === 'DRAGON') {
        Object.assign(baseVisual, {
          backgroundColor: '#7C2D12',
          borderColor: '#FB923C',
          textColor: '#FFF7ED',
          size: 34,
        });
      } else if (event.monsterType === 'BARON_NASHOR') {
        Object.assign(baseVisual, {
          backgroundColor: '#312E81',
          borderColor: '#C7D2FE',
          textColor: '#E0E7FF',
          size: 36,
        });
      } else if (event.monsterType === 'RIFTHERALD') {
        Object.assign(baseVisual, {
          backgroundColor: '#1F2937',
          borderColor: '#38BDF8',
          textColor: '#E0F2FE',
          size: 34,
        });
      } else if (event.monsterType === 'HORDE') {
        Object.assign(baseVisual, {
          backgroundColor: '#4C1D95',
          borderColor: '#DDD6FE',
          textColor: '#F5F3FF',
          size: 40,
        });
      }

      const fallbackIcon =
        event.monsterType === 'DRAGON'
          ? '🐉'
          : event.monsterType === 'BARON_NASHOR'
            ? '👑'
            : event.monsterType === 'RIFTHERALD'
              ? '🌀'
              : '⭐';

      return iconSrc
        ? { ...baseVisual, iconSrc }
        : { ...baseVisual, icon: fallbackIcon };
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
      if (!frame?.events) continue;

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

  const getParticipantSummary = (participantId) => participantSummary?.[participantId] || {};
  const getParticipantName = (participantId) => {
    if (!participantId) return 'Unknown player';
    const summary = getParticipantSummary(participantId);
    return summary.championName || `Player ${participantId}`;
  };
  const getParticipantImage = (participantId) => {
    const summary = getParticipantSummary(participantId);
    return summary.championName ? getChampionImageUrl(summary.championName) : null;
  };

  const getEventDescription = useCallback((event) => {
    if (!event?.type) return 'Unknown event';

    if (event.type === 'CHAMPION_KILL') {
      const assists = event.assistingParticipantIds?.length || 0;
      return `${getParticipantName(event.killerId)} eliminated ${getParticipantName(event.victimId)}${assists > 0 ? ` with help from ${assists} ${assists > 1 ? 'allies' : 'ally'}` : ''}`;
    }

    if (event.type === 'ELITE_MONSTER_KILL') {
      const monsterName = event.monsterType === 'DRAGON'
        ? 'Dragon'
        : event.monsterType === 'BARON_NASHOR'
          ? 'Baron Nashor'
          : event.monsterType === 'RIFTHERALD'
            ? 'Rift Herald'
            : event.monsterType;
      return `${getParticipantName(event.killerId)} slayed ${monsterName}${event.monsterSubType ? ` (${event.monsterSubType})` : ''}`;
    }

    if (event.type === 'BUILDING_KILL') {
      return `${event.buildingType?.replace(/_/g, ' ')} destroyed${event.killerId ? ` by ${getParticipantName(event.killerId)}` : ''}`;
    }

    if (event.type === 'ITEM_PURCHASED') {
      return `${getParticipantName(event.participantId)} purchased Item ${event.itemId}`;
    }

    if (event.type === 'ITEM_SOLD') {
      return `${getParticipantName(event.participantId)} sold Item ${event.itemId}`;
    }

    if (event.type === 'SKILL_LEVEL_UP') {
      const skillNames = { 1: 'Q', 2: 'W', 3: 'E', 4: 'R' };
      return `${getParticipantName(event.participantId)} leveled ${skillNames[event.skillSlot] || event.skillSlot}`;
    }

    if (event.type === 'WARD_PLACED') {
      return `${getParticipantName(event.creatorId)} placed ${event.wardType?.replace(/_/g, ' ')}`;
    }

    if (event.type === 'WARD_KILL') {
      return `${getParticipantName(event.killerId)} destroyed ward`;
    }

    return event.type?.replace(/_/g, ' ') || 'Event';
  }, [participantSummary, getParticipantName]);

  const getEventTimestamp = useCallback((event) => {
    if (event?.timestampMillis !== undefined) return event.timestampMillis;
    if (event?.timestamp !== undefined) {
      const raw = event.timestamp;
      return raw < 1000 ? Math.round(raw * 60000) : raw;
    }
    const frame = frames?.[event?.frameIndex];
    if (frame?.timestamp !== undefined) return frame.timestamp;
    return (event?.frameIndex || 0) * 60000;
  }, [frames]);

  const formatEventTime = useCallback((event) => {
    const timestamp = getEventTimestamp(event);
    const minutes = Math.floor(timestamp / 60000);
    const seconds = Math.floor((timestamp % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [getEventTimestamp]);

  const selectedEventVisuals = useMemo(() => (
    selectedEvent ? getEventVisuals(selectedEvent) : null
  ), [selectedEvent]);

  return (
    <div className="flex-1 bg-bg-dark flex items-center justify-center p-4" ref={mapContainerRef}>
      <div 
        className="relative bg-gray-800 rounded-lg overflow-hidden shadow-2xl flex items-center justify-center"
        style={{ width: mapDimensions.width, height: mapDimensions.height }}
      >
        {hasFrameData ? (
          <>
            <img
              ref={mapImageRef}
              src="/assets/map.png"
              alt="Summoner's Rift map"
              className="w-full h-full object-contain"
              onLoad={handleImageLoad}
              onError={handleImageLoad}
            />

            <div className="absolute inset-0" onClick={() => setSelectedEvent(null)}>
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

            const { icon, iconSrc, iconAlt, backgroundColor, borderColor, textColor, size, plain, textShadow } = getEventVisuals(event);
            const isSelected = selectedEvent?.frameIndex === event.frameIndex && selectedEvent?.timestamp === event.timestamp && selectedEvent?.type === event.type;
            
            return (
              <div
                key={`event-${idx}`}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform ${
                  isSelected ? 'scale-110 z-30' : 'hover:scale-110 z-20'
                }`}
                style={{ 
                  left: `${x}px`, 
                  top: `${y}px`,
                }}
                title={getEventDescription(event)}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedEvent(prev => (
                    prev && prev.frameIndex === event.frameIndex && prev.timestamp === event.timestamp && prev.type === event.type
                      ? null
                      : event
                  ));
                }}
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
                    className="rounded-full border-[3px] flex items-center justify-center overflow-hidden"
                    style={{
                      width: `${size}px`,
                      height: `${size}px`,
                      backgroundColor,
                      borderColor,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.6)',
                      ...(iconSrc
                        ? {}
                        : {
                            color: textColor || '#ffffff',
                            fontWeight: 800,
                            fontSize: `${Math.max(12, size * 0.45)}px`,
                            textShadow: textShadow || '0 0 2px rgba(0,0,0,0.6)'
                          })
                    }}
                  >
                    {iconSrc ? (
                      <img
                        src={iconSrc}
                        alt={iconAlt || 'Elite monster'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      icon
                    )}
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
            
            const isMainPlayer = player.participantId === mainParticipantId;
            const isTeammate = player.participantId <= 5;
            const isSelected = selectedPlayer === player.participantId;
            const championName = getParticipantName(player.participantId);
            const championImage = getParticipantImage(player.participantId);
             
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
                {championImage && (
                  <div className="absolute left-1/2 -translate-x-1/2 -top-12 w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-lg">
                    <img src={championImage} alt={championName} className="w-full h-full object-cover" />
                  </div>
                )}
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
                  {championName} • Lv {player.level}
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

        {selectedEvent && (
          <div
            className="absolute bottom-4 left-4 w-80 bg-bg-dark border border-primary-gold rounded-xl shadow-2xl p-4 pointer-events-auto z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden border-2 ${selectedEvent.type === 'ELITE_MONSTER_KILL' ? 'bg-black/50 border-primary-gold/60' : 'border-gray-700 bg-gray-800'}`}
                  style={{
                    borderColor: selectedEventVisuals?.borderColor || undefined,
                    backgroundColor: selectedEvent.type === 'ELITE_MONSTER_KILL'
                      ? '#0f172a'
                      : selectedEventVisuals?.backgroundColor || '#1f2937'
                  }}
                >
                  {selectedEvent.type === 'ELITE_MONSTER_KILL' && selectedEventVisuals?.iconSrc ? (
                    <img
                      src={selectedEventVisuals.iconSrc}
                      alt={selectedEventVisuals.iconAlt || 'Elite monster'}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span
                      className="text-2xl"
                      style={{
                        color: selectedEventVisuals?.textColor || '#F9FAFB'
                      }}
                    >
                      {selectedEventVisuals?.icon || '◉'}
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-white font-semibold text-lg leading-tight">
                    {selectedEvent.type?.replace(/_/g, ' ') || 'Event'}
                  </div>
                  <div className="text-text-secondary text-xs">Frame {selectedEvent.frameIndex ?? currentFrameIndex} • {formatEventTime(selectedEvent)}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-text-secondary hover:text-primary-gold text-xl leading-none"
                aria-label="Close event card"
              >
                ×
              </button>
            </div>

            <p className="text-sm text-white mt-3">
              {getEventDescription(selectedEvent)}
            </p>

            {selectedEvent.type === 'CHAMPION_KILL' && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-3">
                  <ParticipantBadge participantId={selectedEvent.killerId} label="Killer" accent="text-team-blue" participantSummary={participantSummary} />
                  <span className="text-2xl text-primary-gold animate-pulse">✕</span>
                  <ParticipantBadge participantId={selectedEvent.victimId} label="Victim" accent="text-enemy-red" participantSummary={participantSummary} />
                </div>
                {selectedEvent.assistingParticipantIds?.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-text-secondary mb-2">Assists</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedEvent.assistingParticipantIds.map(id => (
                        <ParticipantBadge key={`assist-${id}`} participantId={id} label="Assist" accent="text-primary-gold" compact participantSummary={participantSummary} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedEvent.type === 'ELITE_MONSTER_KILL' && (
              <div className="mt-4 space-y-3">
                {selectedEvent.killerId !== undefined && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-text-secondary mb-2">Secured By</p>
                    <ParticipantBadge
                      participantId={selectedEvent.killerId}
                      label="Killer"
                      accent="text-primary-gold"
                      participantSummary={participantSummary}
                    />
                  </div>
                )}
                {selectedEvent.assistingParticipantIds?.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-text-secondary mb-2">Assist Contributors</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedEvent.assistingParticipantIds.map(id => (
                        <ParticipantBadge
                          key={`elite-assist-${id}`}
                          participantId={id}
                          label="Assist"
                          accent="text-primary-gold"
                          compact
                          participantSummary={participantSummary}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 mt-4 text-xs text-text-secondary">
              {selectedEvent.position && (
                <div className="bg-gray-800 rounded-md px-2 py-1">
                  <div className="uppercase tracking-wide text-[10px] text-text-secondary">Position</div>
                  <div className="text-white font-medium">({Math.round(selectedEvent.position.x)}, {Math.round(selectedEvent.position.y)})</div>
                </div>
              )}
              <div className="bg-gray-800 rounded-md px-2 py-1">
                <div className="uppercase tracking-wide text-[10px] text-text-secondary">Game Time</div>
                <div className="text-white font-medium">{formatEventTime(selectedEvent)}</div>
              </div>
              {selectedEvent.killerId !== undefined && (
                <div className="bg-gray-800 rounded-md px-2 py-1">
                  <div className="uppercase tracking-wide text-[10px] text-text-secondary">Killer</div>
                  <div className="text-white font-medium">{getParticipantName(selectedEvent.killerId)}</div>
                </div>
              )}
              {selectedEvent.victimId !== undefined && (
                <div className="bg-gray-800 rounded-md px-2 py-1">
                  <div className="uppercase tracking-wide text-[10px] text-text-secondary">Victim</div>
                  <div className="text-white font-medium">{getParticipantName(selectedEvent.victimId)}</div>
                </div>
              )}
              {selectedEvent.assistingParticipantIds?.length > 0 && (
                <div className="bg-gray-800 rounded-md px-2 py-1 col-span-2">
                  <div className="uppercase tracking-wide text-[10px] text-text-secondary">Assists</div>
                  <div className="text-white font-medium">
                    {selectedEvent.assistingParticipantIds.map(id => getParticipantName(id)).join(', ')}
                  </div>
                </div>
              )}
              {selectedEvent.bounty !== undefined && (
                <div className="bg-gray-800 rounded-md px-2 py-1">
                  <div className="uppercase tracking-wide text-[10px] text-text-secondary">Bounty</div>
                  <div className="text-primary-gold font-medium">{selectedEvent.bounty}g</div>
                </div>
              )}
              {selectedEvent.shutdownBounty !== undefined && (
                <div className="bg-gray-800 rounded-md px-2 py-1">
                  <div className="uppercase tracking-wide text-[10px] text-text-secondary">Shutdown</div>
                  <div className="text-primary-gold font-medium">{selectedEvent.shutdownBounty}g</div>
                </div>
              )}
              {selectedEvent.teamId !== undefined && (
                <div className="bg-gray-800 rounded-md px-2 py-1">
                  <div className="uppercase tracking-wide text-[10px] text-text-secondary">Team</div>
                  <div className={`${selectedEvent.teamId === 100 ? 'text-team-blue' : 'text-enemy-red'} font-medium`}>
                    {selectedEvent.teamId}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-text-secondary">Loading match data...</div>
          </div>
        )}
      </div>
    </div>
  );
};

const ParticipantBadge = ({ participantId, label, accent = '', compact = false, participantSummary = {} }) => {
  const summary = participantSummary?.[participantId] || {};
  const championName = summary.championName || `Player ${participantId}`;
  const championImage = summary.championName ? getChampionImageUrl(summary.championName) : null;
  const sizeClasses = compact ? 'w-7 h-7' : 'w-9 h-9';

  return (
    <div className={`flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-full px-2 ${compact ? 'py-1' : 'py-1.5'} shadow-md`}
      title={championName}
    >
      <div className={`${sizeClasses} rounded-full overflow-hidden border-2 border-primary-gold flex items-center justify-center bg-gray-700`}>
        {championImage ? (
          <img src={championImage} alt={championName} className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs text-white font-bold">P{participantId}</span>
        )}
      </div>
      <div>
        <div className={`text-xs font-semibold text-white leading-tight ${accent}`}>{championName}</div>
        {!compact && <div className="text-[10px] uppercase tracking-wide text-text-secondary">{label}</div>}
      </div>
    </div>
  );
};

export default MapArea;
