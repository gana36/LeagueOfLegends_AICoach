import React, { useState } from 'react';
import { MONSTER_ICONS } from '../constants/monsterIcons';
import { getItemName } from '../utils/itemNames';

const ITEM_IMAGE_BASE = 'https://ddragon.leagueoflegends.com/cdn/15.21.1/img/item';
const SPELL_IMAGE_BASE = 'https://ddragon.leagueoflegends.com/cdn/15.21.1/img/spell';

const SUMMONER_SPELLS = {
  summonerdot: { key: 'SummonerDot', label: 'Ignite' },
  summonersmite: { key: 'SummonerSmite', label: 'Smite' },
  summonerhaste: { key: 'SummonerHaste', label: 'Ghost' },
  summonerteleport: { key: 'SummonerTeleport', label: 'Teleport' },
  summonerheal: { key: 'SummonerHeal', label: 'Heal' },
  summonerflash: { key: 'SummonerFlash', label: 'Flash' },
  summonerexhaust: { key: 'SummonerExhaust', label: 'Exhaust' },
  summonerbarrier: { key: 'SummonerBarrier', label: 'Barrier' },
  summonerboost: { key: 'SummonerBoost', label: 'Cleanse' }
};

const FallbackIcon = ({ type, sizeClass = 'w-12 h-12', altText }) => {
  const wrapperClasses = `${sizeClass} rounded-lg border border-slate-500/60 bg-slate-900/75 flex items-center justify-center text-primary-gold/80 shadow-md shadow-black/40 backdrop-blur-sm`;

  if (type === 'item') {
    return (
      <div className={wrapperClasses} role="img" aria-label={altText || 'Item icon unavailable'}>
        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17 6h-2V4c0-1.1-.9-2-2-2h-2c-1.1 0-2 .9-2 2v2H7c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-2h2v2h-2V4zm1 12c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
        </svg>
      </div>
    );
  }

  if (type === 'monster') {
    return (
      <div className={wrapperClasses} role="img" aria-label={altText || 'Monster icon unavailable'}>
        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2c3.87 0 7 3.13 7 7 0 3.31-2.29 6.07-5.35 6.81L12 22l-1.65-6.19C7.29 15.07 5 12.31 5 9c0-3.87 3.13-7 7-7zm0 4c-1.66 0-3 1.57-3 3.5S10.34 13 12 13s3-1.57 3-3.5S13.66 6 12 6z" />
        </svg>
      </div>
    );
  }

  return (
    <div className={wrapperClasses} role="img" aria-label={altText || 'Event icon unavailable'}>
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" />
      </svg>
    </div>
  );
};

const ImageWithFallback = ({ src, alt, className, sizeClass = 'w-12 h-12', fallbackType = 'default' }) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return <FallbackIcon type={fallbackType} sizeClass={sizeClass} altText={alt} />;
  }

  return (
    <img
      src={src}
      alt={alt || 'Event icon'}
      className={className}
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
};

const generateSvgId = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

const createGradientIcon = ({ stops, borderColor, glyph, className = 'w-12 h-12' }) => {
  const gradientId = generateSvgId('event-gradient');
  const glowId = generateSvgId('event-glow');

  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
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
        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor={borderColor} floodOpacity="0.35" />
        </filter>
      </defs>
      <g filter={`url(#${glowId})`}>
        <rect x="4" y="4" width="40" height="40" rx="12" fill={`url(#${gradientId})`} stroke={borderColor} strokeWidth="1.5" />
      </g>
      <g>{glyph}</g>
    </svg>
  );
};

const renderKillIcon = () =>
  createGradientIcon({
    stops: [
      { offset: '0%', color: '#7f1d1d' },
      { offset: '55%', color: '#b91c1c' },
      { offset: '100%', color: '#dc2626' }
    ],
    borderColor: 'rgba(248,113,113,0.65)',
    glyph: (
      <>
        <g fill="none" stroke="#fde68a" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 32L24 24l8 8" />
          <path d="M18 16l6 6-10 10" />
          <path d="M30 16l-6 6 10 10" />
        </g>
        <path d="M19 12l5 5 5-5 3 3-8 8-8-8z" fill="#fef3c7" fillOpacity="0.9" />
        <circle cx="24" cy="24" r="4.5" fill="#fef9c3" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" />
        <rect x="13.5" y="31.5" width="3.4" height="6.5" rx="1.3" fill="#1f2937" stroke="#fde68a" strokeWidth="1" />
        <rect x="31.1" y="31.5" width="3.4" height="6.5" rx="1.3" fill="#1f2937" stroke="#fde68a" strokeWidth="1" />
      </>
    )
  });

const renderBuildingIcon = () =>
  createGradientIcon({
    stops: [
      { offset: '0%', color: '#78350f' },
      { offset: '50%', color: '#b45309' },
      { offset: '100%', color: '#f59e0b' }
    ],
    borderColor: 'rgba(251,191,36,0.7)',
    glyph: (
      <>
        <path
          d="M17 34h14v8H17z"
          fill="#fef3c7"
          stroke="#fde68a"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M19 34V27h-4l9-9 9 9h-4v7z"
          fill="#ffffff"
          fillOpacity="0.85"
          stroke="#ffffff"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <rect x="22.5" y="26" width="3" height="5.2" rx="1.2" fill="#fcd34d" stroke="#f59e0b" strokeWidth="1" />
        <path d="M18 22h12" stroke="#f59e0b" strokeWidth="1.4" strokeLinecap="round" />
      </>
    )
  });

const renderDefaultEventIcon = () =>
  createGradientIcon({
    stops: [
      { offset: '0%', color: '#1e293b' },
      { offset: '100%', color: '#0f172a' }
    ],
    borderColor: 'rgba(148,163,184,0.7)',
    glyph: (
      <>
        <path
          d="M24 4c-7.74 0-14 6.26-14 14 0 10.5 14 26 14 26s14-15.5 14-26c0-7.74-6.26-14-14-14z"
          fill="rgba(15,23,42,0.55)"
          stroke="rgba(226,232,240,0.55)"
          strokeWidth="1.6"
        />
        <circle
          cx="24"
          cy="18"
          r="5"
          fill="rgba(148,163,184,0.9)"
          stroke="rgba(226,232,240,0.75)"
          strokeWidth="1.2"
        />
      </>
    )
  });

const FrameEventsModal = ({ frame, frameIndex, onClose, onEventClick, participantSummaryMap = {} }) => {
  const [filter, setFilter] = useState('all');

  if (!frame) return null;

  const events = frame.events || [];
  const timestamp = frame.timestamp;
  const minutes = Math.floor(timestamp / 60000);
  const seconds = Math.floor((timestamp % 60000) / 1000);
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    if (filter === 'kills') return event.type === 'CHAMPION_KILL';
    if (filter === 'objectives') return event.type === 'ELITE_MONSTER_KILL' || event.type === 'BUILDING_KILL';
    if (filter === 'items') return event.type.includes('ITEM');
    if (filter === 'wards') return event.type.includes('WARD');
    if (filter === 'skills') return event.type === 'SKILL_LEVEL_UP';
    if (filter === 'positioned') return event.position !== undefined;
    if (filter === 'non-positioned') return event.position === undefined;
    return true;
  });

  const getParticipantSummary = (pid) => {
    if (!pid) return {};
    return participantSummaryMap?.[pid] || {};
  };

  const getParticipantDisplay = (pid) => {
    if (!pid) return 'Unknown Player';
    const summary = getParticipantSummary(pid);
    if (summary.summonerName && summary.championName) {
      return `${summary.summonerName} (${summary.championName})`;
    }
    if (summary.summonerName) return summary.summonerName;
    if (summary.championName) return summary.championName;
    return `Player ${pid}`;
  };

  const getItemIcon = (itemId, size = 'w-12 h-12') => {
    return (
      <ImageWithFallback
        src={itemId ? `${ITEM_IMAGE_BASE}/${itemId}.png` : null}
        alt={itemId ? getItemName(itemId) : 'Unknown item'}
        className={`${size} rounded-lg border border-primary-gold/40 bg-black/40 object-contain shadow-md`}
        sizeClass={size}
        fallbackType="item"
      />
    );
  };

  const getEventIcon = (event) => {
    if (event.type === 'ITEM_UNDO') {
      return (
        <div className="flex items-center gap-2">
          {getItemIcon(event.beforeId, 'w-10 h-10')}
          <span className="text-primary-gold font-bold">→</span>
          {getItemIcon(event.afterId, 'w-10 h-10')}
        </div>
      );
    }

    if (event.type.includes('ITEM')) {
      return getItemIcon(event.itemId);
    }

    // Return SVG icons as JSX
    if (event.type === 'CHAMPION_KILL') {
      return renderKillIcon();
    }
    if (event.type === 'ELITE_MONSTER_KILL') {
      const monsterKey = event.monsterSubType || event.monsterType;
      const iconSrc = monsterKey ? MONSTER_ICONS[monsterKey] : undefined;

      return (
        <ImageWithFallback
          src={iconSrc}
          alt={monsterKey?.replace(/_/g, ' ') || 'Monster'}
          className="w-12 h-12 rounded-lg border border-primary-gold/40 bg-black/40 object-cover shadow-md"
          sizeClass="w-12 h-12"
          fallbackType="monster"
        />
      );
    }
    if (event.type === 'BUILDING_KILL') {
      return renderBuildingIcon();
    }
    if (event.type === 'ITEM_PURCHASED') {
      return (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
        </svg>
      );
    }
    if (event.type === 'ITEM_SOLD') {
      return (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
        </svg>
      );
    }
    if (event.type === 'SKILL_LEVEL_UP') {
      return (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 14l5-5 5 5z"/>
        </svg>
      );
    }
    if (event.type === 'WARD_PLACED') {
      return (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
        </svg>
      );
    }
    return renderDefaultEventIcon();
  };

  const normalizeSpellKey = (spellName) => (spellName ? spellName.trim().toLowerCase() : '');

  const formatSpellLabel = (spellName, damage = {}) => {
    if (!spellName) {
      return damage.basic ? 'Basic Attack' : 'Unknown Ability';
    }

    const normalized = normalizeSpellKey(spellName);
    if (SUMMONER_SPELLS[normalized]) {
      return SUMMONER_SPELLS[normalized].label;
    }

    const cleaned = spellName
      .replace(/[_-]/g, ' ')
      .replace(/\d+/g, '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .trim();

    return cleaned.length ? cleaned.replace(/\b\w/g, (l) => l.toUpperCase()) : 'Unknown Ability';
  };

  const renderSpellChip = (participantId, spellName, damage = {}, keySuffix = '') => {
    const label = formatSpellLabel(spellName, damage);
    const normalized = normalizeSpellKey(spellName);
    const summonerSpell = SUMMONER_SPELLS[normalized];

    return (
      <span
        key={`${participantId || 'unknown'}-${spellName || (damage.basic ? 'basic' : 'unknown')}-${keySuffix}`}
        className="flex items-center gap-1 px-2 py-1 text-[10px] uppercase tracking-wide rounded-full bg-slate-800/60 border border-slate-600/60 text-slate-200 transition-colors duration-200 hover:border-primary-gold/60 hover:text-white"
        title={label}
      >
        {summonerSpell ? (
          <img
            src={`${SPELL_IMAGE_BASE}/${summonerSpell.key}.png`}
            alt={label}
            className="w-4 h-4 rounded"
            loading="lazy"
          />
        ) : (
          <span className="w-4 h-4 rounded-full border border-primary-gold/60 bg-primary-gold/15 text-primary-gold flex items-center justify-center text-[8px] font-bold">
            ★
          </span>
        )}
        <span className="text-white font-semibold">{label}</span>
        {participantId && (
          <span className="opacity-60">{getParticipantDisplay(participantId)}</span>
        )}
      </span>
    );
  };

  const collectSpellChips = (event) => {
    const chips = [];
    const seen = new Set();

    const processDamageArray = (arr, suffix) => {
      arr?.forEach((damage, idx) => {
        const uniqueKey = `${damage.participantId || 'unknown'}-${damage.spellName || (damage.basic ? 'basic' : 'unknown')}-${suffix}-${idx}`;
        if (!seen.has(uniqueKey)) {
          seen.add(uniqueKey);
          chips.push(renderSpellChip(damage.participantId, damage.spellName, damage, `${suffix}-${idx}`));
        }
      });
    };

    processDamageArray(event.victimDamageDealt, 'dealt');
    processDamageArray(event.victimDamageReceived, 'received');

    return chips;
  };

    const baseEventClasses = 'bg-slate-900/75 border border-slate-600/70 rounded-xl shadow-xl shadow-black/30 backdrop-blur-md ring-1 ring-inset ring-white/10';
  const getEventClasses = (event) => {
    if (!event) return baseEventClasses;

    if (event.type === 'CHAMPION_KILL') {
      return `${baseEventClasses} bg-gradient-to-br from-rose-800/45 via-rose-700/30 to-slate-900/65 border-rose-500/45 ring-rose-400/25 shadow-rose-900/25`;
    }

    if (event.type === 'ELITE_MONSTER_KILL') {
      return `${baseEventClasses} bg-gradient-to-br from-indigo-800/45 via-indigo-700/30 to-slate-900/65 border-indigo-500/45 ring-indigo-400/25 shadow-indigo-900/25`;
    }

    if (event.type === 'BUILDING_KILL') {
      return `${baseEventClasses} bg-gradient-to-br from-amber-700/45 via-amber-600/30 to-slate-900/65 border-amber-500/45 ring-amber-400/25 shadow-amber-900/20`;
    }

    if (event.type && event.type.includes('ITEM')) {
      return `${baseEventClasses} bg-gradient-to-br from-sky-800/40 via-sky-700/28 to-slate-900/65 border-sky-500/45 ring-sky-400/25 shadow-sky-900/20`;
    }

    if (event.type && event.type.includes('WARD')) {
      return `${baseEventClasses} bg-gradient-to-br from-emerald-800/40 via-emerald-700/28 to-slate-900/65 border-emerald-500/45 ring-emerald-400/25 shadow-emerald-900/20`;
    }

    if (event.type === 'SKILL_LEVEL_UP') {
      return `${baseEventClasses} bg-gradient-to-br from-cyan-800/40 via-cyan-700/28 to-slate-900/65 border-cyan-500/45 ring-cyan-400/25 shadow-cyan-900/20`;
    }

    return `${baseEventClasses} bg-gradient-to-br from-slate-800/40 via-slate-700/28 to-slate-900/65 border-slate-600/60 ring-slate-400/20 shadow-black/25`;
  };

  const formatEventType = (type) => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const getEventDescription = (event) => {
    if (event.type === 'CHAMPION_KILL') {
      const assists = event.assistingParticipantIds?.length || 0;
      const killerName = getParticipantDisplay(event.killerId);
      const victimName = getParticipantDisplay(event.victimId);
      return `${killerName} eliminated ${victimName}${assists > 0 ? ` with ${assists} assist${assists > 1 ? 's' : ''}` : ''}`;
    }
    if (event.type === 'ELITE_MONSTER_KILL') {
      const monsterName = event.monsterType === 'DRAGON' ? 'Dragon' : event.monsterType === 'BARON_NASHOR' ? 'Baron Nashor' : event.monsterType === 'RIFTHERALD' ? 'Rift Herald' : event.monsterType;
      const killerName = getParticipantDisplay(event.killerId);
      return `${killerName} secured ${monsterName}${event.monsterSubType ? ` (${formatEventType(event.monsterSubType)})` : ''}`;
    }
    if (event.type === 'BUILDING_KILL') {
      const buildingName = event.buildingType === 'TOWER_BUILDING' ? 'Turret' : event.buildingType === 'INHIBITOR_BUILDING' ? 'Inhibitor' : formatEventType(event.buildingType);
      const killerName = getParticipantDisplay(event.killerId);
      return `${buildingName} destroyed${event.killerId ? ` by ${killerName}` : ''}`;
    }
    if (event.type === 'ITEM_PURCHASED') {
      const buyer = getParticipantDisplay(event.participantId);
      return `${buyer} purchased ${getItemName(event.itemId)}`;
    }
    if (event.type === 'ITEM_SOLD') {
      const seller = getParticipantDisplay(event.participantId);
      return `${seller} sold ${getItemName(event.itemId)}`;
    }
    if (event.type === 'ITEM_DESTROYED') {
      const owner = getParticipantDisplay(event.participantId);
      return `${owner}'s ${getItemName(event.itemId)} consumed`;
    }
    if (event.type === 'ITEM_UNDO') {
      const owner = getParticipantDisplay(event.participantId);
      return `${owner} refunded ${getItemName(event.itemId)}`;
    }
    if (event.type === 'SKILL_LEVEL_UP') {
      const skillNames = { 1: 'Q', 2: 'W', 3: 'E', 4: 'R' };
      const owner = getParticipantDisplay(event.participantId);
      return `${owner} leveled ${skillNames[event.skillSlot] || event.skillSlot}`;
    }
    if (event.type === 'WARD_PLACED') {
      const wardName = event.wardType === 'YELLOW_TRINKET' ? 'Stealth Ward' : event.wardType === 'SIGHT_WARD' ? 'Stealth Ward' : event.wardType === 'CONTROL_WARD' ? 'Control Ward' : formatEventType(event.wardType);
      const creator = getParticipantDisplay(event.creatorId);
      return `${creator} placed ${wardName}`;
    }
    if (event.type === 'WARD_KILL') {
      const killerName = getParticipantDisplay(event.killerId);
      return `${killerName} destroyed a ward`;
    }
    return formatEventType(event.type);
  };

  const eventTypes = [
    { value: 'all', label: 'All Events', count: events.length },
    { value: 'kills', label: 'Kills', count: events.filter(e => e.type === 'CHAMPION_KILL').length },
    { value: 'objectives', label: 'Objectives', count: events.filter(e => e.type === 'ELITE_MONSTER_KILL' || e.type === 'BUILDING_KILL').length },
    { value: 'items', label: 'Items', count: events.filter(e => e.type.includes('ITEM')).length },
    { value: 'wards', label: 'Wards', count: events.filter(e => e.type.includes('WARD')).length },
    { value: 'skills', label: 'Skills', count: events.filter(e => e.type === 'SKILL_LEVEL_UP').length },
    { value: 'positioned', label: 'With Position', count: events.filter(e => e.position).length },
    { value: 'non-positioned', label: 'No Position', count: events.filter(e => !e.position).length },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[1100] p-4" onClick={onClose}>
      <div 
        className="bg-surface rounded-lg shadow-2xl border-2 border-primary-gold max-w-4xl w-full h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gray-800 p-4 flex justify-between items-center border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-white">Frame {frameIndex} Events</h2>
            <p className="text-text-secondary">Game Time: {timeStr}</p>
          </div>
          <button 
            onClick={onClose}
            className="text-white hover:text-primary-gold text-3xl font-bold transition-colors"
          >
            ×
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="bg-gray-800 border-b border-gray-700 overflow-x-auto">
          <div className="flex">
            {eventTypes.map(type => (
              <button
                key={type.value}
                onClick={() => setFilter(type.value)}
                className={`px-4 py-3 font-semibold whitespace-nowrap transition-colors ${
                  filter === type.value 
                    ? 'text-primary-gold border-b-2 border-primary-gold bg-gray-700' 
                    : 'text-text-secondary hover:text-white hover:bg-gray-700'
                }`}
              >
                {type.label} ({type.count})
              </button>
            ))}
          </div>
        </div>

        {/* Events List */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-text-secondary text-lg">No events in this frame</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((event, idx) => {
                const spellChips = collectSpellChips(event);

                return (
                  <div
                    key={idx}
                    className={`relative overflow-hidden ${getEventClasses(event)} p-4 transition-transform transform hover:-translate-y-1 hover:scale-[1.01] hover:border-primary-gold/60 ${
                      event.position ? 'cursor-pointer' : ''
                    }`}
                    onClick={() => event.position && onEventClick && onEventClick(event)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="relative flex-shrink-0 w-16 h-16 flex items-center justify-center rounded-xl bg-black/40 border border-white/10 shadow-inner">
                        <div className="text-current flex items-center justify-center">
                          {getEventIcon(event)}
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-white font-semibold text-lg mb-1">
                          {getEventDescription(event)}
                        </h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {spellChips.length > 0 && (
                            <div className="col-span-2">
                              <div className="text-[10px] uppercase tracking-wide text-primary-gold mb-1">Spell Usage</div>
                              <div className="flex flex-wrap gap-2">
                                {spellChips}
                              </div>
                            </div>
                          )}
                          {event.position ? (
                            <div className="text-text-secondary flex items-center gap-1">
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                              </svg>
                              Position: ({Math.round(event.position.x)}, {Math.round(event.position.y)})
                            </div>
                          ) : (
                            <div className="text-text-secondary opacity-50">
                              No position data
                            </div>
                          )}
                          {event.bounty !== undefined && (
                            <div className="text-primary-gold flex items-center gap-1">
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="12" cy="12" r="8"/>
                              </svg>
                              Bounty: {event.bounty}g
                            </div>
                          )}
                          {event.shutdownBounty !== undefined && (
                            <div className="text-primary-gold flex items-center gap-1">
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                              </svg>
                              Shutdown: {event.shutdownBounty}g
                            </div>
                          )}
                          {event.assistingParticipantIds && event.assistingParticipantIds.length > 0 && (
                            <div className="text-team-blue flex items-center gap-1">
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                              </svg>
                              Assists: {event.assistingParticipantIds.join(', ')}
                            </div>
                          )}
                          {event.teamId !== undefined && (
                            <div className={event.teamId === 100 ? 'text-team-blue' : 'text-enemy-red'}>
                              Team: {event.teamId}
                            </div>
                          )}
                          {event.laneType && (
                            <div className="text-text-secondary">
                              Lane: {event.laneType}
                            </div>
                          )}
                          {event.towerType && (
                            <div className="text-text-secondary">
                              Tower: {event.towerType}
                            </div>
                          )}
                        </div>

                        {/* Additional event details */}
                        {event.victimDamageDealt && event.victimDamageDealt.length > 0 && (
                          <details className="mt-2">
                            <summary className="text-text-secondary text-sm cursor-pointer hover:text-white">
                              Damage Details
                            </summary>
                            <div className="mt-2 space-y-1 text-xs">
                              {event.victimDamageDealt.map((dmg, i) => (
                                <div key={i} className="text-text-secondary">
                                  Player {dmg.participantId}: {dmg.basic} basic, {dmg.magicDamage} magic, {dmg.physicalDamage} physical, {dmg.trueDamage} true
                                </div>
                              ))}
                            </div>
                          </details>
                        )}

                        {event.victimDamageReceived && event.victimDamageReceived.length > 0 && (
                          <details className="mt-2">
                            <summary className="text-text-secondary text-sm cursor-pointer hover:text-white">
                              Damage Received
                            </summary>
                            <div className="mt-2 space-y-1 text-xs">
                              {event.victimDamageReceived.map((dmg, i) => (
                                <div key={i} className="text-text-secondary">
                                  From Player {dmg.participantId}: {dmg.basic} basic, {dmg.magicDamage} magic, {dmg.physicalDamage} physical, {dmg.trueDamage} true
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-800 p-4 border-t border-gray-700">
          <div className="flex justify-between items-center text-text-secondary text-sm">
            <span>Total Events: {events.length}</span>
            <span>Showing: {filteredEvents.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FrameEventsModal;
