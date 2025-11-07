import React from 'react';
const generateSvgId = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

const createSidebarBadge = ({ fillStops, strokeColor, innerRingColor, glyph, className = 'w-8 h-8' }) => {
  const gradientId = generateSvgId('sidebar-gradient');
  const stops = fillStops && fillStops.length
    ? fillStops
    : [
        { offset: '0%', color: '#151b27' },
        { offset: '100%', color: '#0b111a' }
      ];

  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          {stops.map((stop, idx) => (
            <stop
              key={idx}
              offset={stop.offset}
              stopColor={stop.color}
              stopOpacity={stop.opacity ?? 1}
            />
          ))}
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="16" fill={`url(#${gradientId})`} stroke={strokeColor} strokeWidth="1" />
      {innerRingColor && (
        <circle cx="20" cy="20" r="12.5" fill="none" stroke={innerRingColor} strokeWidth="1" />
      )}
      {glyph}
    </svg>
  );
};

const renderFilterIcon = (type, active) => {
  const filterThemes = {
    solo: { accent: '#d4a72c', ring: 'rgba(212,167,44,0.28)' },
    team: { accent: '#4aa8e5', ring: 'rgba(74,168,229,0.28)' },
    opponents: { accent: '#e66b6b', ring: 'rgba(230,107,107,0.28)' },
    all: { accent: '#b49ae1', ring: 'rgba(180,154,225,0.28)' }
  }[type];

  const baseStopsActive = [
    { offset: '0%', color: '#1b2330' },
    { offset: '100%', color: '#101723' }
  ];
  const baseStopsInactive = [
    { offset: '0%', color: '#151b27' },
    { offset: '100%', color: '#0d121d' }
  ];

  const strokeColor = active ? filterThemes.accent : 'rgba(94,102,120,0.85)';
  const fillSoft = active ? `${filterThemes.ring}` : 'rgba(100,116,139,0.18)';
  const glyphStroke = active ? filterThemes.accent : '#9aa5b5';
  const innerRingColor = active ? filterThemes.ring : 'rgba(59,70,87,0.35)';

  const glyphs = {
    solo: (
      <g fill="none" stroke={glyphStroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="20" cy="14" r="4.2" fill={fillSoft} />
        <path d="M12 26c1.2-4.2 4.1-6.2 8-6.2s6.8 2 8 6.2" />
      </g>
    ),
    team: (
      <g fill="none" stroke={glyphStroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="15" cy="15" r="3.3" fill={fillSoft} />
        <circle cx="25" cy="15" r="3.3" fill={fillSoft} />
        <path d="M9.5 27c0.7-3.5 2.8-5.3 5.5-5.3s4.8 1.8 5.5 5.3" />
        <path d="M17.2 27c0.5-3 2.2-5.3 4.8-5.3 2.6 0 4.3 2.3 4.8 5.3" />
      </g>
    ),
    opponents: (
      <g fill="none" stroke={glyphStroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15.5 25.5l9-9" />
        <path d="M15.5 16.5l9 9" />
        <path d="M18.2 13l1.8-5.2" />
        <path d="M21.8 13l-1.8-5.2" />
        <circle cx="20" cy="20" r="8.2" stroke={active ? filterThemes.ring : 'rgba(94,106,126,0.45)'} />
      </g>
    ),
    all: (
      <g fill="none" stroke={glyphStroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="12.2" y="12.2" width="15.6" height="11.6" rx="3" fill={fillSoft} />
        <path d="M10.5 18h3.3" />
        <path d="M26.2 18h3.3" />
        <circle cx="20" cy="19.8" r="2.6" />
      </g>
    )
  };

  return createSidebarBadge({
    fillStops: active ? baseStopsActive : baseStopsInactive,
    strokeColor,
    innerRingColor,
    glyph: glyphs[type]
  });
};

const renderEventIcon = (type, active) => {
  const eventThemes = {
    kills: { accent: '#e26b6b', ring: 'rgba(226,107,107,0.28)' },
    objectives: { accent: '#5a87d8', ring: 'rgba(90,135,216,0.28)' },
    wards: { accent: '#4aa879', ring: 'rgba(74,168,121,0.28)' },
    items: { accent: '#d39b43', ring: 'rgba(211,155,67,0.28)' }
  }[type];

  const baseStopsActive = [
    { offset: '0%', color: '#1a212f' },
    { offset: '100%', color: '#0f141f' }
  ];
  const baseStopsInactive = [
    { offset: '0%', color: '#141a26' },
    { offset: '100%', color: '#0c111b' }
  ];

  const strokeColor = active ? eventThemes.accent : 'rgba(93,104,120,0.85)';
  const glyphStroke = active ? eventThemes.accent : '#9aa5b5';
  const innerRingColor = active ? eventThemes.ring : 'rgba(59,70,87,0.32)';

  const glyphs = {
    kills: (
      <g fill="none" stroke={glyphStroke} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 25.5l11-11" />
        <path d="M14.5 14.5l11 11" />
        <path d="M17.5 12.2l2.5-4.7" />
        <path d="M22.5 12.2l-2.5-4.7" />
      </g>
    ),
    objectives: (
      <g fill="none" stroke={glyphStroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 12.5h11" />
        <path d="M16.2 12.5l-1 7.2 4.8 3.8 4.8-3.8-1-7.2" />
        <path d="M16.5 12.5c-2.3 0-3.8-1.7-4.2-4.2h15.4c-0.4 2.5-1.9 4.2-4.2 4.2" />
      </g>
    ),
    wards: (
      <g fill="none" stroke={glyphStroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.8 20c2.4-4.2 5.7-6.4 9.2-6.4s6.8 2.2 9.2 6.4c-2.4 4.2-5.7 6.4-9.2 6.4s-6.8-2.2-9.2-6.4z" />
        <circle cx="20" cy="20" r="3" />
      </g>
    ),
    items: (
      <g fill="none" stroke={glyphStroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15.5 14.5h9l2.6 4.4v7.2a2.8 2.8 0 0 1-2.8 2.8h-8a2.8 2.8 0 0 1-2.8-2.8v-7.2z" />
        <path d="M17.4 14.5l1.8-3.6h3.6l1.8 3.6" />
        <path d="M18.4 21.2h3.2" />
      </g>
    )
  };

  return createSidebarBadge({
    fillStops: active ? baseStopsActive : baseStopsInactive,
    strokeColor,
    innerRingColor,
    glyph: <g transform="translate(0,0)">{glyphs[type]}</g>,
    className: 'w-7 h-7'
  });
};

const LeftSidebar = ({ matchSummary, playerFilter, setPlayerFilter, eventToggles, setEventToggles, availableEventFilters, currentPuuid }) => {
  const matchInfo = matchSummary?.info || {};
  
  // Find the main player's participant data to determine win/loss
  const mainPlayerParticipant = matchInfo.participants?.find(
    p => p.puuid === currentPuuid
  );
  const matchResult = mainPlayerParticipant?.win === true ? 'Victory' : 
                      mainPlayerParticipant?.win === false ? 'Defeat' : 
                      'Unknown Result';
  const matchEndDate = matchInfo.gameEndTimestamp ? new Date(matchInfo.gameEndTimestamp) : null;
  const formattedEndDate = matchEndDate
    ? matchEndDate.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : 'Unavailable';

  const formatDuration = (seconds) => {
    if (!seconds || Number.isNaN(Number(seconds))) return '0:00';
    const totalSeconds = Math.max(0, Math.floor(Number(seconds)));
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formattedDuration = formatDuration(matchInfo.gameDuration);
  const mapName = matchInfo.gameMode === 'CLASSIC' ? 'Summoner’s Rift' : matchInfo.gameMode || 'Unknown Map';

  const filterOptions = [
    { id: 'solo', label: 'Solo', iconType: 'solo' },
    { id: 'team', label: 'My Team', iconType: 'team' },
    { id: 'opponents', label: 'Opponents', iconType: 'opponents' },
    { id: 'all', label: 'All Players', iconType: 'all' }
  ];

  const eventOptions = [
    { id: 'kills', label: 'Kills/Deaths', iconType: 'kills' },
    { id: 'objectives', label: 'Objectives', iconType: 'objectives' },
    { id: 'wards', label: 'Wards', iconType: 'wards' },
    { id: 'items', label: 'Items', iconType: 'items' }
  ];

  const enabledEventFilters = availableEventFilters || {
    kills: true,
    objectives: true,
    wards: true,
    items: true
  };

  const activeEventOptions = eventOptions.filter(option => enabledEventFilters[option.id]);

  const handleToggle = (eventId) => {
    setEventToggles(prev => ({
      ...prev,
      [eventId]: !prev[eventId]
    }));
  };

  return (
    <div className="w-[280px] bg-surface h-full flex flex-col overflow-y-auto overflow-x-hidden">
      {/* Current Match Summary */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-white font-bold text-base mb-3">Current Match</h2>
        <div className="rounded-lg border border-gray-700 bg-gray-900/60 p-4 shadow-inner">
          <div className="flex items-center justify-between text-sm text-text-secondary">
            <span>Match Status</span>
            <span className="text-white font-semibold">Completed</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-text-secondary">
            <span>Result</span>
            <span className={`text-sm font-semibold ${matchResult === 'Victory' ? 'text-team-blue' : matchResult === 'Defeat' ? 'text-enemy-red' : 'text-white'}`}>
              {matchResult}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-text-secondary">
            <div>
              <div className="uppercase tracking-wide text-[10px] text-gray-400">Completed On</div>
              <div className="text-white font-semibold leading-snug">{formattedEndDate}</div>
            </div>
            <div>
              <div className="uppercase tracking-wide text-[10px] text-gray-400">Duration</div>
              <div className="text-white font-semibold">{formattedDuration}</div>
            </div>
            <div>
              <div className="uppercase tracking-wide text-[10px] text-gray-400">Map</div>
              <div className="text-white font-semibold">{mapName}</div>
            </div>
            <div>
              <div className="uppercase tracking-wide text-[10px] text-gray-400">View Focus</div>
              <div className="text-white font-semibold">{playerFilter === 'solo' ? 'Solo Player' : playerFilter === 'team' ? 'My Team' : playerFilter === 'opponents' ? 'Opponents' : 'All Players'}</div>
            </div>
            <div className="col-span-2">
              <div className="uppercase tracking-wide text-[10px] text-gray-400 mb-1">Visible Overlays</div>
              <div className="flex flex-wrap gap-2 text-[11px]">
                {['kills', 'objectives', 'wards', 'items'].filter(id => eventToggles[id]).map(id => (
                  <span key={id} className="px-2 py-0.5 rounded-full bg-gray-800/70 border border-gray-700 text-white capitalize">
                    {id}
                  </span>
                ))}
                {['kills', 'objectives', 'wards', 'items'].every(id => !eventToggles[id]) && (
                  <span className="text-gray-500 italic">No overlays enabled</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Player Filter Section */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-white font-semibold text-sm mb-3">Display Players</h3>
        <div className="space-y-2">
          {filterOptions.map(option => (
            <label 
              key={option.id}
              className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-all h-10 ${
                playerFilter === option.id 
                  ? 'bg-primary-gold bg-opacity-20 border border-primary-gold' 
                  : 'hover:bg-gray-700 hover:bg-opacity-30'
              }`}
            >
              <input
                type="radio"
                name="playerFilter"
                value={option.id}
                checked={playerFilter === option.id}
                onChange={(e) => setPlayerFilter(e.target.value)}
                className="hidden"
              />
              <span className="flex items-center justify-center">
                {renderFilterIcon(option.iconType, playerFilter === option.id)}
              </span>
              <span className={`text-sm ${playerFilter === option.id ? 'text-white font-medium' : 'text-text-secondary'}`}>
                {option.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Event Overlays Section */}
      <div className="p-4">
        <h3 className="text-white font-semibold text-sm mb-3">Show Events</h3>
        {activeEventOptions.length === 0 ? (
          <p className="text-xs text-text-secondary italic">No positional event data available yet.</p>
        ) : (
          <div className="space-y-2">
            {activeEventOptions.map(option => (
              <label 
                key={option.id}
                className="flex items-center justify-between p-2 rounded cursor-pointer hover:bg-gray-700 hover:bg-opacity-30 transition-all h-9"
              >
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center">
                    {renderEventIcon(option.iconType, eventToggles[option.id])}
                  </span>
                  <span className={`text-sm ${eventToggles[option.id] ? 'text-white font-medium' : 'text-text-secondary'}`}>{option.label}</span>
                </div>
                <div 
                  onClick={() => handleToggle(option.id)}
                  className={`w-11 h-6 rounded-full transition-all cursor-pointer ${
                    eventToggles[option.id] ? 'bg-primary-gold' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full mt-0.5 transition-transform ${
                    eventToggles[option.id] ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </div>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeftSidebar;
