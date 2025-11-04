import React, { useState } from 'react';

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
      return (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6.92 5L5 6.92l2.05 2.05L5.5 10.5l1.42 1.42L8.5 10.3l2.05 2.05L12 10.9l1.45 1.45 2.05-2.05 1.58 1.58L18.5 10.3l-1.45-1.45L19 7.4 17.58 6l-1.45 1.45-2.05-2.05L12.63 6.85 10.58 4.8 9.13 6.25 7.08 4.2 6.92 5z"/>
        </svg>
      );
    }
    if (event.type === 'ELITE_MONSTER_KILL') {
      return (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
        </svg>
      );
    }
    if (event.type === 'BUILDING_KILL') {
      return (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3L2 9v11h20V9l-10-6zm8 16h-4v-4h-4v4H8v-7l4-3 4 3v7z"/>
        </svg>
      );
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
    return (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    );
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
        className="flex items-center gap-1 px-2 py-1 text-[10px] uppercase tracking-wide rounded-full bg-black/40 border border-white/10 text-text-secondary transition-colors duration-200 hover:border-primary-gold/60 hover:text-white"
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

  const getEventColor = (event) => {
    if (event.type === 'CHAMPION_KILL') return 'bg-gradient-to-br from-red-950/80 via-red-900/40 to-gray-900/80 border-red-700/60 shadow-lg backdrop-blur-sm';
    if (event.type === 'ELITE_MONSTER_KILL') return 'bg-gradient-to-br from-purple-950/80 via-purple-900/40 to-gray-900/80 border-purple-700/60 shadow-lg backdrop-blur-sm';
    if (event.type === 'BUILDING_KILL') return 'bg-gradient-to-br from-amber-900/80 via-amber-800/40 to-gray-900/80 border-amber-600/60 shadow-lg backdrop-blur-sm';
    if (event.type.includes('ITEM')) return 'bg-gradient-to-br from-indigo-950/80 via-indigo-900/40 to-gray-900/80 border-indigo-700/60 shadow-lg backdrop-blur-sm';
    if (event.type.includes('WARD')) return 'bg-gradient-to-br from-pink-950/80 via-pink-900/40 to-gray-900/80 border-pink-700/60 shadow-lg backdrop-blur-sm';
    if (event.type === 'SKILL_LEVEL_UP') return 'bg-gradient-to-br from-teal-950/80 via-teal-900/40 to-gray-900/80 border-teal-700/60 shadow-lg backdrop-blur-sm';
    return 'bg-gradient-to-br from-slate-950/80 via-slate-900/40 to-gray-900/80 border-gray-700/60 shadow-md backdrop-blur-sm';
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
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
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
                    className={`relative overflow-hidden ${getEventColor(event)} border rounded-xl p-4 transition-transform transform hover:-translate-y-1 hover:scale-[1.01] hover:border-primary-gold/60 ${
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
