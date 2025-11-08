import React, { useState } from 'react';
import { MONSTER_ICONS } from '../constants/monsterIcons';
import { getChampionImageUrl } from '../utils/championImages';

const CHAMPION_IMAGE_BASE = 'https://ddragon.leagueoflegends.com/cdn/12.4.1/img/champion';
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

const ParticipantDetailsModal = ({ participant, participantId, onClose, currentFrame, allFrames, currentFrameIndex, participantSummaryMap = {}, mainParticipantId = 1 }) => {
  const [activeTab, setActiveTab] = useState('overview');

  if (!participant || !currentFrame) return null;

  const frameData = currentFrame.participantFrames?.[participantId];
  if (!frameData) return null;

  const { championStats, damageStats, position, currentGold, goldPerSecond, jungleMinionsKilled, level, minionsKilled, timeEnemySpentControlled, totalGold, xp } = frameData;

  // Get participant's events in current frame
  const participantEvents = currentFrame.events?.filter(event => 
    event.killerId === participantId || 
    event.victimId === participantId || 
    event.assistingParticipantIds?.includes(participantId) ||
    event.participantId === participantId
  ) || [];

  // Calculate stats over time
  const getStatsHistory = () => {
    const history = [];
    for (let i = 0; i <= currentFrameIndex; i++) {
      const frame = allFrames[i];
      const pFrame = frame?.participantFrames?.[participantId];
      if (pFrame) {
        history.push({
          frameIndex: i,
          timestamp: frame.timestamp,
          gold: pFrame.totalGold,
          xp: pFrame.xp,
          level: pFrame.level,
          cs: (pFrame.minionsKilled || 0) + (pFrame.jungleMinionsKilled || 0)
        });
      }
    }
    return history;
  };

  const statsHistory = getStatsHistory();
  const latestStats = statsHistory[statsHistory.length - 1] || {};

  const generateSvgId = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

  const createGradientIcon = ({ stops, borderColor, glyph, className = 'w-12 h-12' }) => {
    const gradientId = generateSvgId('participant-event-gradient');
    const glowId = generateSvgId('participant-event-glow');

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

  const getTimelinePolylinePoints = (data, valueAccessor) => {
    if (!data || data.length < 2) return '';

    const values = data.map(valueAccessor);
    const maxValue = Math.max(...values);
    const safeMax = maxValue > 0 ? maxValue : 1;

    return data
      .map((stat, idx) => {
        const x = (idx / (data.length - 1)) * 100;
        const value = valueAccessor(stat) || 0;
        const normalized = Math.min(Math.max(value / safeMax, 0), 1);
        const y = 100 - normalized * 80;
        return `${x},${y}`;
      })
      .join(' ');
  };

  const goldPolylinePoints = getTimelinePolylinePoints(statsHistory, (stat) => stat.gold || 0);
  const csPolylinePoints = getTimelinePolylinePoints(statsHistory, (stat) => stat.cs || 0);

  // Get all events involving this participant
  const getAllParticipantEvents = () => {
    const events = [];
    for (let i = 0; i <= currentFrameIndex; i++) {
      const frame = allFrames[i];
      if (frame.events) {
        frame.events.forEach(event => {
          if (event.killerId === participantId || 
              event.victimId === participantId || 
              event.assistingParticipantIds?.includes(participantId) ||
              event.participantId === participantId) {
            events.push({ ...event, frameIndex: i, timestamp: frame.timestamp });
          }
        });
      }
    }
    return events;
  };

  const allEvents = getAllParticipantEvents();

  const isTeammate = participantId <= 5;
  const borderColor = participantId === mainParticipantId ? 'border-primary-gold' : isTeammate ? 'border-team-blue' : 'border-enemy-red';
  const teamAccent = isTeammate ? 'text-team-blue' : 'text-enemy-red';
  const teamLabel = isTeammate ? 'Blue Team' : 'Red Team';

  const participantSummary = participantSummaryMap?.[participantId] || {};
  const championName = participantSummary.championName || `Player ${participantId}`;
  const championImage = participantSummary.championName && participantSummary.championName !== ''
    ? getChampionImageUrl(participantSummary.championName)
    : null;
  const summonerName = participantSummary.summonerName || `Player ${participantId}`;
  const role = participantSummary.teamPosition || participantSummary.individualPosition || participantSummary.lane || 'Unknown Role';
  const kills = participantSummary.kills ?? frameData.kills ?? 0;
  const deaths = participantSummary.deaths ?? frameData.deaths ?? 0;
  const assists = participantSummary.assists ?? frameData.assists ?? 0;
  const kdaRatio = deaths === 0 ? 'Perfect' : ((kills + assists) / (deaths || 1)).toFixed(2);
  const damageToChampions = participantSummary.totalDamageDealtToChampions ?? damageStats?.totalDamageDoneToChampions ?? 0;
  const visionScore = participantSummary.visionScore ?? 0;

  const getParticipantSummary = (pid) => participantSummaryMap?.[pid] || {};
  const getParticipantDisplay = (pid) => {
    if (!pid) return 'Unknown Player';
    const summary = getParticipantSummary(pid);
    if (summary.summonerName && summary.championName) {
      return `${summary.summonerName} (${summary.championName})`;
    }
    if (summary.championName) return summary.championName;
    if (summary.summonerName) return summary.summonerName;
    return `Player ${pid}`;
  };

  const getItemIcon = (itemId, size = 'w-12 h-12') => {
    if (!itemId) return null;
    return (
      <img
        src={`${ITEM_IMAGE_BASE}/${itemId}.png`}
        alt={`Item ${itemId}`}
        className={`${size} rounded-lg border border-primary-gold/40 bg-black/40 object-contain shadow-md`}
        loading="lazy"
      />
    );
  };

  const getEventIcon = (event) => {
    if (!event) return null;

    if (event.type === 'ITEM_UNDO') {
      return (
        <div className="flex items-center gap-2">
          {getItemIcon(event.beforeId, 'w-10 h-10')}
          <span className="text-primary-gold font-bold">→</span>
          {getItemIcon(event.afterId, 'w-10 h-10')}
        </div>
      );
    }

    if (event.type?.includes('ITEM')) {
      return getItemIcon(event.itemId, 'w-12 h-12');
    }

    if (event.type === 'CHAMPION_KILL') {
      return renderKillIcon();
    }

    if (event.type === 'ELITE_MONSTER_KILL') {
      const monsterKey = event.monsterSubType || event.monsterType;
      const iconSrc = monsterKey ? MONSTER_ICONS[monsterKey] : undefined;

      if (iconSrc) {
        return (
          <img
            src={iconSrc}
            alt={monsterKey?.replace(/_/g, ' ') || 'Monster'}
            className="w-12 h-12 rounded-lg border border-primary-gold/40 bg-black/40 object-cover shadow-md"
            loading="lazy"
          />
        );
      }

      return (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
        </svg>
      );
    }

    if (event.type === 'BUILDING_KILL') {
      return renderBuildingIcon();
    }

    if (event.type === 'SKILL_LEVEL_UP') {
      return (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 14l5-5 5 5z" />
        </svg>
      );
    }

    if (event.type?.includes('WARD')) {
      return (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
        </svg>
      );
    }

    return renderDefaultEventIcon();
  };

  const normalizeSpellKey = (spellName) => {
    if (!spellName) return '';
    return spellName.trim().toLowerCase();
  };

  const formatSpellLabel = (spellName, damage = {}) => {
    if (!spellName) {
      if (damage.basic) return 'Basic Attack';
      return 'Unknown Ability';
    }

    const key = normalizeSpellKey(spellName);
    if (SUMMONER_SPELLS[key]) {
      return SUMMONER_SPELLS[key].label;
    }

    const cleaned = spellName
      .replace(/[_-]/g, ' ')
      .replace(/\d+/g, '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .trim();

    return cleaned.length > 0
      ? cleaned.replace(/\b\w/g, (l) => l.toUpperCase())
      : 'Unknown Ability';
  };

  const renderSpellChip = (participantId, spellName, damage = {}, keySuffix = '') => {
    const label = formatSpellLabel(spellName, damage);
    const normalized = normalizeSpellKey(spellName);
    const summonerSpell = SUMMONER_SPELLS[normalized];

    return (
      <span
        key={`${participantId || 'unknown'}-${spellName || 'basic'}-${keySuffix}`}
        className="flex items-center gap-1 px-2 py-1 text-[10px] uppercase tracking-wide rounded-full bg-gray-900/80 border border-gray-700/50 text-text-secondary transition-colors duration-200 hover:border-primary-gold/60 hover:text-white"
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

    if (event.victimDamageDealt) {
      event.victimDamageDealt.forEach((dmg, idx) => {
        const key = `${dmg.participantId || 'unknown'}-${dmg.spellName || (dmg.basic ? 'basic' : 'unknown')}-dealt-${idx}`;
        if (!seen.has(key)) {
          seen.add(key);
          chips.push(renderSpellChip(dmg.participantId, dmg.spellName, dmg, `dealt-${idx}`));
        }
      });
    }

    if (event.victimDamageReceived) {
      event.victimDamageReceived.forEach((dmg, idx) => {
        const key = `${dmg.participantId || 'unknown'}-${dmg.spellName || (dmg.basic ? 'basic' : 'unknown')}-received-${idx}`;
        if (!seen.has(key)) {
          seen.add(key);
          chips.push(renderSpellChip(dmg.participantId, dmg.spellName, dmg, `received-${idx}`));
        }
      });
    }

    return chips;
  };

  const getEventDescription = (event) => {
    if (!event) return 'Event';

    if (event.type === 'CHAMPION_KILL') {
      const killerName = getParticipantDisplay(event.killerId);
      const victimName = getParticipantDisplay(event.victimId);
      const assists = event.assistingParticipantIds?.length || 0;
      return `${killerName} eliminated ${victimName}${assists ? ` with ${assists} assist${assists > 1 ? 's' : ''}` : ''}`;
    }

    if (event.type === 'ELITE_MONSTER_KILL') {
      const killerName = getParticipantDisplay(event.killerId);
      const monsterName = event.monsterType === 'DRAGON'
        ? 'Dragon'
        : event.monsterType === 'BARON_NASHOR'
          ? 'Baron Nashor'
          : event.monsterType === 'RIFTHERALD'
            ? 'Rift Herald'
            : event.monsterType;
      return `${killerName} secured ${monsterName}${event.monsterSubType ? ` (${event.monsterSubType.replace(/_/g, ' ')})` : ''}`;
    }

    if (event.type === 'BUILDING_KILL') {
      const killerName = getParticipantDisplay(event.killerId);
      const buildingName = event.buildingType === 'TOWER_BUILDING'
        ? 'Turret'
        : event.buildingType === 'INHIBITOR_BUILDING'
          ? 'Inhibitor'
          : (event.buildingType || '').replace(/_/g, ' ');
      return `${buildingName} destroyed${event.killerId ? ` by ${killerName}` : ''}`;
    }

    if (event.type === 'ITEM_PURCHASED') {
      const buyer = getParticipantDisplay(event.participantId);
      return `${buyer} purchased Item ${event.itemId}`;
    }

    if (event.type === 'ITEM_SOLD') {
      const seller = getParticipantDisplay(event.participantId);
      return `${seller} sold Item ${event.itemId}`;
    }

    if (event.type === 'ITEM_DESTROYED') {
      const owner = getParticipantDisplay(event.participantId);
      return `${owner}'s Item ${event.itemId} consumed`;
    }

    if (event.type === 'ITEM_UNDO') {
      const owner = getParticipantDisplay(event.participantId);
      return `${owner} refunded Item ${event.itemId}`;
    }

    if (event.type === 'SKILL_LEVEL_UP') {
      const owner = getParticipantDisplay(event.participantId);
      const skillNames = { 1: 'Q', 2: 'W', 3: 'E', 4: 'R' };
      return `${owner} leveled ${skillNames[event.skillSlot] || event.skillSlot}`;
    }

    if (event.type === 'WARD_PLACED') {
      const creator = getParticipantDisplay(event.creatorId);
      const wardName = event.wardType === 'YELLOW_TRINKET' || event.wardType === 'SIGHT_WARD'
        ? 'Stealth Ward'
        : event.wardType === 'CONTROL_WARD'
          ? 'Control Ward'
          : (event.wardType || '').replace(/_/g, ' ');
      return `${creator} placed ${wardName}`;
    }

    if (event.type === 'WARD_KILL') {
      const killerName = getParticipantDisplay(event.killerId);
      return `${killerName} destroyed a ward`;
    }

    return (event.type || 'Event').replace(/_/g, ' ');
  };

  const getEventSurfaceClasses = (event) => {
    if (!event) return 'bg-gradient-to-br from-slate-950/80 via-slate-900/40 to-gray-900/80 border border-gray-700/60';

    if (event.type === 'CHAMPION_KILL') {
      if (event.killerId === participantId) {
        return 'bg-gradient-to-br from-emerald-900/80 via-emerald-800/40 to-gray-900/80 border border-emerald-600/60';
      }
      if (event.victimId === participantId) {
        return 'bg-gradient-to-br from-rose-900/80 via-rose-800/40 to-gray-900/80 border border-rose-700/60';
      }
      if (event.assistingParticipantIds?.includes(participantId)) {
        return 'bg-gradient-to-br from-sky-900/80 via-sky-800/40 to-gray-900/80 border border-sky-600/60';
      }
      return 'bg-gradient-to-br from-red-950/80 via-red-900/40 to-gray-900/80 border border-red-700/60';
    }

    if (event.type === 'ELITE_MONSTER_KILL') {
      return 'bg-gradient-to-br from-purple-950/80 via-purple-900/40 to-gray-900/80 border border-purple-700/60';
    }

    if (event.type === 'BUILDING_KILL') {
      return 'bg-gradient-to-br from-amber-900/80 via-amber-800/40 to-gray-900/80 border border-amber-600/60';
    }

    if (event.type?.includes('ITEM')) {
      return 'bg-gradient-to-br from-indigo-950/80 via-indigo-900/40 to-gray-900/80 border border-indigo-700/60';
    }

    if (event.type?.includes('WARD')) {
      return 'bg-gradient-to-br from-pink-950/80 via-pink-900/40 to-gray-900/80 border border-pink-700/60';
    }

    if (event.type === 'SKILL_LEVEL_UP') {
      return 'bg-gradient-to-br from-teal-950/80 via-teal-900/40 to-gray-900/80 border border-teal-700/60';
    }

    return 'bg-gradient-to-br from-slate-950/80 via-slate-900/40 to-gray-900/80 border border-gray-700/60';
  };

  const StatRow = ({ label, value, subtext }) => (
    <div className="flex justify-between items-center py-2 border-b border-gray-700">
      <span className="text-text-secondary text-sm">{label}</span>
      <div className="text-right">
        <span className="text-white font-semibold">{value}</span>
        {subtext && <span className="text-text-secondary text-xs ml-2">{subtext}</span>}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[1100] p-4" onClick={onClose}>
      <div 
        className={`bg-surface rounded-lg shadow-2xl border-2 ${borderColor} max-w-4xl w-full h-[85vh] overflow-hidden flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gray-800 p-4 flex justify-between items-center border-b border-gray-700">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <div className={`w-24 h-24 rounded-2xl border-4 ${borderColor} overflow-hidden shadow-2xl bg-black/60`}
                style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.6)' }}
              >
                {championImage ? (
                  <img src={championImage} alt={championName} className="w-full h-full object-cover" />
                ) : (
                  <div 
                    className="w-full h-full flex items-center justify-center text-3xl font-bold text-white"
                    style={{ backgroundColor: participantId === mainParticipantId ? '#FFD700' : isTeammate ? '#00D9FF' : '#FF4655' }}
                  >
                    P{participantId}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <div className="text-sm uppercase tracking-widest text-text-secondary">{teamLabel}</div>
                <h2 className="text-3xl font-extrabold text-white flex items-center gap-3 drop-shadow-lg">
                  {summonerName}
                  <span className="text-xs px-3 py-1 bg-gray-800/80 rounded-full uppercase tracking-wide border border-white/10">{role}</span>
                </h2>
                <p className="text-primary-gold text-base font-semibold tracking-wide">{championName}</p>
                <div className="flex items-center gap-4 text-xs text-text-secondary mt-1">
                  <span className="flex items-center gap-1"><span className="text-white font-semibold">Level {level}</span></span>
                  <span className="flex items-center gap-1"><span className="text-white font-semibold">{(latestStats.cs || 0)} CS</span></span>
                  <span className="flex items-center gap-1"><span className="text-white font-semibold">{totalGold}g</span></span>
                  <span className="flex items-center gap-1"><span className="text-white font-semibold">KDA {kills}/{deaths}/{assists}</span></span>
                  <span className="flex items-center gap-1"><span className="text-white font-semibold">Ratio {kdaRatio}</span></span>
                </div>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white hover:text-primary-gold text-3xl font-bold transition-colors"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 bg-gray-800">
          {['overview', 'combat', 'economy', 'events', 'timeline'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === tab 
                  ? 'text-primary-gold border-b-2 border-primary-gold' 
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Current Status */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-bold text-white mb-4">Champion Snapshot</h3>
                <div className="grid grid-cols-3 gap-4">
                  <StatHighlight title="Champion" value={championName} subvalue={summonerName} accent={teamAccent} />
                  <StatHighlight title="K / D / A" value={`${kills} / ${deaths} / ${assists}`} subvalue={kdaRatio === 'Perfect' ? 'Perfect KDA' : `${kdaRatio} Ratio`} />
                  <StatHighlight title="Damage to Champs" value={damageToChampions.toLocaleString()} subvalue="Total" />
                  <StatHighlight title="Vision Score" value={visionScore} subvalue="Game Vision" />
                  <StatHighlight title="Role" value={role} subvalue={teamLabel} />
                  <StatHighlight title="Gold" value={`${totalGold}g`} subvalue={`+${(goldPerSecond || 0).toFixed(2)} g/s`} />
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-bold text-white mb-4">Current Status</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <StatRow label="Level" value={level} />
                    <StatRow label="Total Gold" value={`${totalGold}g`} />
                    <StatRow label="Current Gold" value={`${currentGold}g`} />
                    <StatRow label="Gold/Second" value={goldPerSecond?.toFixed(2) || '0'} />
                    <StatRow label="Experience" value={xp} />
                  </div>
                  <div>
                    <StatRow label="Minions Killed" value={minionsKilled || 0} />
                    <StatRow label="Jungle Monsters" value={jungleMinionsKilled || 0} />
                    <StatRow label="Total CS" value={(minionsKilled || 0) + (jungleMinionsKilled || 0)} />
                    <StatRow label="Enemy CC Time" value={`${timeEnemySpentControlled || 0}s`} />
                    {position && <StatRow label="Position" value={`(${Math.round(position.x)}, ${Math.round(position.y)})`} />}
                  </div>
                </div>
              </div>

              {/* Health & Resources */}
              {championStats && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-white mb-4">Health & Resources</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-text-secondary">Health</span>
                        <span className="text-white">{championStats.health} / {championStats.healthMax}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-green-500 to-green-400 h-3 rounded-full transition-all"
                          style={{ width: `${(championStats.health / championStats.healthMax) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-text-secondary">Mana/Energy</span>
                        <span className="text-white">{championStats.power} / {championStats.powerMax}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-blue-400 h-3 rounded-full transition-all"
                          style={{ width: `${(championStats.power / championStats.powerMax) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <StatRow label="Health Regen" value={championStats.healthRegen?.toFixed(1)} />
                      <StatRow label="Resource Regen" value={championStats.powerRegen?.toFixed(1)} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'combat' && championStats && (
            <div className="space-y-6">
              {/* Offensive Stats */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-bold text-white mb-4">Offensive Stats</h3>
                <div className="grid grid-cols-2 gap-x-8">
                  <StatRow label="Attack Damage" value={championStats.attackDamage} />
                  <StatRow label="Ability Power" value={championStats.abilityPower} />
                  <StatRow label="Attack Speed" value={`${championStats.attackSpeed}%`} />
                  <StatRow label="Ability Haste" value={championStats.abilityHaste} />
                  <StatRow label="Lifesteal" value={`${championStats.lifesteal}%`} />
                  <StatRow label="Omnivamp" value={`${championStats.omnivamp}%`} />
                  <StatRow label="Physical Vamp" value={`${championStats.physicalVamp}%`} />
                  <StatRow label="Spell Vamp" value={`${championStats.spellVamp}%`} />
                </div>
              </div>

              {/* Defensive Stats */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-bold text-white mb-4">Defensive Stats</h3>
                <div className="grid grid-cols-2 gap-x-8">
                  <StatRow label="Armor" value={championStats.armor} />
                  <StatRow label="Magic Resist" value={championStats.magicResist} />
                  <StatRow label="Movement Speed" value={championStats.movementSpeed} />
                  <StatRow label="CC Reduction" value={`${championStats.ccReduction}%`} />
                  <StatRow label="Cooldown Reduction" value={`${championStats.cooldownReduction}%`} />
                </div>
              </div>

              {/* Penetration Stats */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-bold text-white mb-4">Penetration</h3>
                <div className="grid grid-cols-2 gap-x-8">
                  <StatRow label="Armor Pen (Flat)" value={championStats.armorPen} />
                  <StatRow label="Armor Pen (%)" value={`${championStats.armorPenPercent}%`} />
                  <StatRow label="Bonus Armor Pen (%)" value={`${championStats.bonusArmorPenPercent}%`} />
                  <StatRow label="Magic Pen (Flat)" value={championStats.magicPen} />
                  <StatRow label="Magic Pen (%)" value={`${championStats.magicPenPercent}%`} />
                  <StatRow label="Bonus Magic Pen (%)" value={`${championStats.bonusMagicPenPercent}%`} />
                </div>
              </div>

              {/* Damage Stats */}
              {damageStats && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-white mb-4">Damage Stats</h3>
                  <div className="grid grid-cols-2 gap-x-8">
                    <StatRow label="Magic Damage Done" value={damageStats.magicDamageDone || 0} />
                    <StatRow label="Magic Damage Taken" value={damageStats.magicDamageDoneToChampions || 0} />
                    <StatRow label="Physical Damage Done" value={damageStats.physicalDamageDone || 0} />
                    <StatRow label="Physical Damage Taken" value={damageStats.physicalDamageDoneToChampions || 0} />
                    <StatRow label="True Damage Done" value={damageStats.trueDamageDone || 0} />
                    <StatRow label="True Damage Taken" value={damageStats.trueDamageDoneToChampions || 0} />
                    <StatRow label="Total Damage Done" value={damageStats.totalDamageDone || 0} />
                    <StatRow label="Total Damage To Champions" value={damageStats.totalDamageDoneToChampions || 0} />
                    <StatRow label="Total Damage Taken" value={damageStats.totalDamageTaken || 0} />
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'economy' && (
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-bold text-white mb-4">Gold Statistics</h3>
                <div className="space-y-4">
                  <StatRow label="Total Gold Earned" value={`${totalGold}g`} />
                  <StatRow label="Current Gold" value={`${currentGold}g`} />
                  <StatRow label="Gold Per Second" value={`${goldPerSecond?.toFixed(2) || 0}g/s`} />
                  <StatRow label="Gold Spent" value={`${(totalGold - currentGold)}g`} />
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-bold text-white mb-4">Farm Statistics</h3>
                <div className="space-y-4">
                  <StatRow label="Lane Minions" value={minionsKilled || 0} />
                  <StatRow label="Jungle Monsters" value={jungleMinionsKilled || 0} />
                  <StatRow label="Total CS" value={(minionsKilled || 0) + (jungleMinionsKilled || 0)} />
                  <StatRow label="CS Per Minute" value={((((minionsKilled || 0) + (jungleMinionsKilled || 0)) / (currentFrameIndex + 1)) || 0).toFixed(1)} />
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-bold text-white mb-4">Experience</h3>
                <div className="space-y-4">
                  <StatRow label="Total XP" value={xp} />
                  <StatRow label="Current Level" value={level} />
                  <StatRow label="XP Per Minute" value={((xp / (currentFrameIndex + 1)) || 0).toFixed(1)} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'events' && (
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-bold text-white mb-4">All Events ({allEvents.length})</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {allEvents.length === 0 ? (
                    <p className="text-text-secondary text-center py-4">No events recorded</p>
                  ) : (
                    allEvents.map((event, idx) => {
                      const minutes = Math.floor(event.timestamp / 60000);
                      const seconds = Math.floor((event.timestamp % 60000) / 1000);
                      const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

                      const spellChips = collectSpellChips(event);

                      return (
                        <div
                          key={idx}
                          className={`${getEventSurfaceClasses(event)} rounded-xl p-4 flex items-center gap-4 border border-opacity-50 shadow-lg backdrop-blur-sm transition-transform hover:-translate-y-1 hover:border-primary-gold/60`}
                        >
                          <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center rounded-lg bg-black/40 border border-white/10 shadow-inner">
                            {getEventIcon(event)}
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-semibold text-lg leading-snug">{getEventDescription(event)}</p>
                            {(event.killerId || event.victimId) && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {event.killerId && <ParticipantTag label="Killer" name={getParticipantDisplay(event.killerId)} />}
                                {event.victimId && <ParticipantTag label="Victim" name={getParticipantDisplay(event.victimId)} intent="danger" />}
                                {event.assistingParticipantIds?.length > 0 && (
                                  <ParticipantTag label="Assists" name={event.assistingParticipantIds.map(id => getParticipantDisplay(id)).join(', ')} intent="assist" />
                                )}
                              </div>
                            )}
                            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-text-secondary">
                              {spellChips.length > 0 && (
                                <div className="col-span-2">
                                  <div className="text-[10px] uppercase tracking-wide text-primary-gold mb-1">Spell Usage</div>
                                  <div className="flex flex-wrap gap-2">
                                    {spellChips}
                                  </div>
                                </div>
                              )}
                              {event.itemId && (
                                <div className="flex items-center gap-2">
                                  {getItemIcon(event.itemId, 'w-8 h-8')}
                                  <span>Item {event.itemId}</span>
                                </div>
                              )}
                              {event.position && (
                                <div className="flex items-center gap-2">
                                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                                  </svg>
                                  ({Math.round(event.position.x)}, {Math.round(event.position.y)})
                                </div>
                              )}
                              {event.bounty !== undefined && (
                                <div className="flex items-center gap-2 text-primary-gold">
                                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                    <circle cx="12" cy="12" r="8" />
                                  </svg>
                                  Bounty: {event.bounty}g
                                </div>
                              )}
                              {event.shutdownBounty !== undefined && (
                                <div className="flex items-center gap-2 text-primary-gold">
                                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                  </svg>
                                  Shutdown: {event.shutdownBounty}g
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className="text-text-secondary text-sm font-mono">{timeStr}</span>
                            {event.itemId && (
                              <div className="w-10 h-10">{getItemIcon(event.itemId, 'w-10 h-10')}</div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-bold text-white mb-4">Current Frame Events ({participantEvents.length})</h3>
                <div className="space-y-2">
                  {participantEvents.length === 0 ? (
                    <p className="text-text-secondary text-center py-4">No events in this frame</p>
                  ) : (
                    participantEvents.map((event, idx) => {
                      const spellChips = collectSpellChips(event);

                      return (
                        <div
                          key={idx}
                          className={`${getEventSurfaceClasses(event)} rounded-lg p-3 flex items-center gap-3 border border-opacity-50 shadow-md backdrop-blur-sm`}
                        >
                          <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg bg-black/40 border border-white/10 shadow-inner">
                            {getEventIcon(event)}
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-semibold text-sm leading-snug">{getEventDescription(event)}</p>
                            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-text-secondary uppercase tracking-wide">
                              {event.killerId && <ParticipantTag inline label="Killer" name={getParticipantDisplay(event.killerId)} />}
                              {event.victimId && <ParticipantTag inline label="Victim" name={getParticipantDisplay(event.victimId)} intent="danger" />}
                              {event.assistingParticipantIds?.length > 0 && (
                                <ParticipantTag inline label="Assists" name={event.assistingParticipantIds.map(id => getParticipantDisplay(id)).join(', ')} intent="assist" />
                              )}
                            </div>
                            {spellChips.length > 0 && (
                              <div className="mt-2">
                                <div className="text-[10px] uppercase tracking-wide text-primary-gold mb-1">Spell Usage</div>
                                <div className="flex flex-wrap gap-2">
                                  {spellChips}
                                </div>
                              </div>
                            )}
                            <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-text-secondary">
                              {event.itemId && (
                                <div className="flex items-center gap-2">
                                  {getItemIcon(event.itemId, 'w-6 h-6')}
                                  <span>Item {event.itemId}</span>
                                </div>
                              )}
                              {event.position && (
                                <div className="flex items-center gap-1">
                                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                                  </svg>
                                  ({Math.round(event.position.x)}, {Math.round(event.position.y)})
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-bold text-white mb-4">Stats Over Time</h3>
                <div className="space-y-6">
                  {/* Gold Chart */}
                  <div>
                    <h4 className="text-white font-semibold mb-2">Gold Progression</h4>
                    <div className="relative h-32 bg-gray-700 rounded">
                      <svg
                        width="100%"
                        height="100%"
                        className="absolute inset-0"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                      >
                        {goldPolylinePoints && (
                          <polyline
                            points={goldPolylinePoints}
                            fill="none"
                            stroke="#FFD700"
                            strokeWidth="2"
                          />
                        )}
                      </svg>
                      <div className="absolute bottom-2 left-2 text-text-secondary text-xs">
                        0g
                      </div>
                      <div className="absolute top-2 right-2 text-primary-gold text-xs font-semibold">
                        {latestStats.gold}g
                      </div>
                    </div>
                  </div>

                  {/* Level Chart */}
                  <div>
                    <h4 className="text-white font-semibold mb-2">Level Progression</h4>
                    <div className="flex items-end gap-1 h-32 bg-gray-700 rounded p-2">
                      {statsHistory.map((stat, i) => (
                        <div 
                          key={i}
                          className="flex-1 bg-team-blue rounded-t"
                          style={{ height: `${(stat.level / 18) * 100}%` }}
                          title={`Frame ${i}: Level ${stat.level}`}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between mt-1 text-text-secondary text-xs">
                      <span>Level 1</span>
                      <span>Level {latestStats.level}</span>
                    </div>
                  </div>

                  {/* CS Chart */}
                  <div>
                    <h4 className="text-white font-semibold mb-2">CS Progression</h4>
                    <div className="relative h-32 bg-gray-700 rounded">
                      <svg width="100%" height="100%" className="absolute inset-0">
                        {csPolylinePoints && (
                          <polyline
                            points={csPolylinePoints}
                            fill="none"
                            stroke="#00D9FF"
                            strokeWidth="2"
                          />
                        )}
                      </svg>
                      <div className="absolute bottom-2 left-2 text-text-secondary text-xs">
                        0 CS
                      </div>
                      <div className="absolute top-2 right-2 text-team-blue text-xs font-semibold">
                        {latestStats.cs} CS
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatHighlight = ({ title, value, subvalue, accent }) => (
  <div className="bg-gray-900 rounded-lg p-3 border border-gray-700 shadow-md">
    <div className="text-[10px] uppercase tracking-wide text-text-secondary mb-1">{title}</div>
    <div className={`text-lg font-semibold text-white ${accent || ''}`}>{value}</div>
    {subvalue && <div className="text-xs text-text-secondary mt-1">{subvalue}</div>}
  </div>
);

const ParticipantTag = ({ label, name, intent = 'default', inline = false }) => {
  const intentClasses = intent === 'danger'
    ? 'bg-enemy-red/20 text-enemy-red border border-enemy-red/40'
    : intent === 'assist'
      ? 'bg-team-blue/20 text-team-blue border border-team-blue/40'
      : 'bg-gray-900 text-white border border-gray-700';

  return (
    <span className={`${intentClasses} ${inline ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'} rounded-full uppercase tracking-wide`}
      title={name}
    >
      <span className="opacity-70 mr-1">{label}:</span>
      {name}
    </span>
  );
};

export default ParticipantDetailsModal;
