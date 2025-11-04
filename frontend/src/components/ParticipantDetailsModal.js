import React, { useState } from 'react';

const CHAMPION_IMAGE_BASE = 'https://ddragon.leagueoflegends.com/cdn/12.4.1/img/champion';

const ParticipantDetailsModal = ({ participant, participantId, onClose, currentFrame, allFrames, currentFrameIndex, participantSummaryMap = {} }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedSections, setExpandedSections] = useState({});

  if (!participant || !currentFrame) return null;

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

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
  const borderColor = participantId === 1 ? 'border-primary-gold' : isTeammate ? 'border-team-blue' : 'border-enemy-red';
  const teamAccent = isTeammate ? 'text-team-blue' : 'text-enemy-red';
  const teamLabel = isTeammate ? 'Blue Team' : 'Red Team';

  const participantSummary = participantSummaryMap?.[participantId] || {};
  const championName = participantSummary.championName || `Player ${participantId}`;
  const championImage = participantSummary.championName
    ? `${CHAMPION_IMAGE_BASE}/${participantSummary.championName}.png`
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
  const getParticipantChampionName = (pid) => {
    if (!pid) return 'Unknown Player';
    const summary = getParticipantSummary(pid);
    return summary.championName || `Player ${pid}`;
  };
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

  const StatRow = ({ label, value, subtext }) => (
    <div className="flex justify-between items-center py-2 border-b border-gray-700">
      <span className="text-text-secondary text-sm">{label}</span>
      <div className="text-right">
        <span className="text-white font-semibold">{value}</span>
        {subtext && <span className="text-text-secondary text-xs ml-2">{subtext}</span>}
      </div>
    </div>
  );

  const SectionHeader = ({ title, count, sectionKey }) => (
    <div 
      className="flex justify-between items-center py-3 px-4 bg-gray-700 cursor-pointer hover:bg-gray-600 transition-colors"
      onClick={() => toggleSection(sectionKey)}
    >
      <h3 className="text-white font-semibold">{title}</h3>
      <div className="flex items-center gap-2">
        {count !== undefined && <span className="text-text-secondary text-sm">{count}</span>}
        <span className="text-white">{expandedSections[sectionKey] ? '▼' : '▶'}</span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className={`bg-surface rounded-lg shadow-2xl border-2 ${borderColor} max-w-4xl w-full h-[85vh] overflow-hidden flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gray-800 p-4 flex justify-between items-center border-b border-gray-700">
          <div className="flex items-center gap-4">
            <div className={`w-20 h-20 rounded-full border-4 ${borderColor} overflow-hidden shadow-xl`}>
              {championImage ? (
                <img src={championImage} alt={championName} className="w-full h-full object-cover" />
              ) : (
                <div 
                  className="w-full h-full flex items-center justify-center text-3xl font-bold text-white"
                  style={{ backgroundColor: participantId === 1 ? '#FFD700' : isTeammate ? '#00D9FF' : '#FF4655' }}
                >
                  P{participantId}
                </div>
              )}
            </div>
            <div>
              <div className="text-sm uppercase tracking-widest text-text-secondary">{teamLabel}</div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                {summonerName}
                <span className="text-xs px-2 py-0.5 bg-gray-700 rounded-full uppercase tracking-wide">{role}</span>
              </h2>
              <p className="text-primary-gold text-sm font-semibold">{championName}</p>
              <div className="flex items-center gap-3 text-xs text-text-secondary mt-1">
                <span>Level {level}</span>
                <span>{(latestStats.cs || 0)} CS</span>
                <span>{totalGold}g</span>
                <span>KDA {kills}/{deaths}/{assists}</span>
                <span>KDA Ratio {kdaRatio}</span>
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
                      
                      let eventDescription = '';
                      let eventColor = 'bg-gray-700';
                      
                      const formatEventType = (type) => {
                        return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
                      };

                      if (event.type === 'CHAMPION_KILL') {
                        const killerName = getParticipantDisplay(event.killerId);
                        const victimName = getParticipantDisplay(event.victimId);
                        if (event.killerId === participantId) {
                          eventDescription = `Eliminated ${victimName}`;
                          eventColor = 'bg-green-900 border-green-700';
                        } else if (event.victimId === participantId) {
                          eventDescription = `Eliminated by ${killerName}`;
                          eventColor = 'bg-red-900 border-red-700';
                        } else if (event.assistingParticipantIds?.includes(participantId)) {
                          eventDescription = `Assisted ${killerName} vs ${victimName}`;
                          eventColor = 'bg-blue-900 border-blue-700';
                        }
                      } else if (event.type === 'ELITE_MONSTER_KILL') {
                        const monsterName = event.monsterType === 'DRAGON' ? 'Dragon' : event.monsterType === 'BARON_NASHOR' ? 'Baron Nashor' : event.monsterType === 'RIFTHERALD' ? 'Rift Herald' : event.monsterType;
                        eventDescription = `Slayed ${monsterName}`;
                        eventColor = 'bg-purple-900 border-purple-700';
                      } else if (event.type === 'BUILDING_KILL') {
                        const buildingName = event.buildingType === 'TOWER_BUILDING' ? 'Turret' : event.buildingType === 'INHIBITOR_BUILDING' ? 'Inhibitor' : formatEventType(event.buildingType);
                        eventDescription = `Destroyed ${buildingName}`;
                        eventColor = 'bg-yellow-900 border-yellow-700';
                      } else if (event.type === 'ITEM_PURCHASED') {
                        eventDescription = `Purchased Item ${event.itemId}`;
                        eventColor = 'bg-indigo-900 border-indigo-700';
                      } else if (event.type === 'ITEM_SOLD') {
                        eventDescription = `Sold Item ${event.itemId}`;
                        eventColor = 'bg-orange-900 border-orange-700';
                      } else if (event.type === 'ITEM_DESTROYED') {
                        eventDescription = `Item ${event.itemId} consumed`;
                        eventColor = 'bg-red-800 border-red-600';
                      } else if (event.type === 'ITEM_UNDO') {
                        eventDescription = `Refunded Item ${event.itemId}`;
                        eventColor = 'bg-gray-600 border-gray-500';
                      } else if (event.type === 'SKILL_LEVEL_UP') {
                        const skillNames = { 1: 'Q', 2: 'W', 3: 'E', 4: 'R' };
                        eventDescription = `Leveled ${skillNames[event.skillSlot] || event.skillSlot}`;
                        eventColor = 'bg-teal-900 border-teal-700';
                      } else if (event.type === 'WARD_PLACED') {
                        const wardName = event.wardType === 'YELLOW_TRINKET' ? 'Stealth Ward' : event.wardType === 'SIGHT_WARD' ? 'Stealth Ward' : event.wardType === 'CONTROL_WARD' ? 'Control Ward' : formatEventType(event.wardType);
                        eventDescription = `Placed ${wardName}`;
                        eventColor = 'bg-pink-900 border-pink-700';
                      } else if (event.type === 'WARD_KILL') {
                        eventDescription = `Destroyed ward`;
                        eventColor = 'bg-pink-800 border-pink-600';
                      } else {
                        eventDescription = formatEventType(event.type);
                        eventColor = 'bg-gray-700 border-gray-600';
                      }
                      
                      const getEventIcon = () => {
                        if (event.type === 'CHAMPION_KILL') {
                          return (
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M6.92 5L5 6.92l2.05 2.05L5.5 10.5l1.42 1.42L8.5 10.3l2.05 2.05L12 10.9l1.45 1.45 2.05-2.05 1.58 1.58L18.5 10.3l-1.45-1.45L19 7.4 17.58 6l-1.45 1.45-2.05-2.05L12.63 6.85 10.58 4.8 9.13 6.25 7.08 4.2 6.92 5z"/>
                            </svg>
                          );
                        }
                        if (event.type === 'ELITE_MONSTER_KILL') {
                          return (
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                            </svg>
                          );
                        }
                        if (event.type === 'BUILDING_KILL') {
                          return (
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 3L2 9v11h20V9l-10-6zm8 16h-4v-4h-4v4H8v-7l4-3 4 3v7z"/>
                            </svg>
                          );
                        }
                        if (event.type.includes('ITEM')) {
                          return (
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                              <rect x="3" y="3" width="18" height="18" rx="2"/>
                            </svg>
                          );
                        }
                        if (event.type.includes('WARD')) {
                          return (
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                            </svg>
                          );
                        }
                        if (event.type === 'SKILL_LEVEL_UP') {
                          return (
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M7 14l5-5 5 5z"/>
                            </svg>
                          );
                        }
                        return (
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="12" r="8"/>
                          </svg>
                        );
                      };
                      
                      return (
                        <div key={idx} className={`${eventColor} rounded-lg p-3 flex items-center gap-3 border border-opacity-50`}>
                          <div className="flex-shrink-0 text-current">{getEventIcon()}</div>
                          <div className="flex-1">
                            <p className="text-white font-semibold">{eventDescription}</p>
                            {(event.killerId || event.victimId) && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {event.killerId && <ParticipantTag label="Killer" name={getParticipantDisplay(event.killerId)} />}
                                {event.victimId && <ParticipantTag label="Victim" name={getParticipantDisplay(event.victimId)} intent="danger" />}
                                {event.assistingParticipantIds?.length > 0 && (
                                  <ParticipantTag label="Assists" name={event.assistingParticipantIds.map(id => getParticipantDisplay(id)).join(', ')} intent="assist" />
                                )}
                              </div>
                            )}
                            {event.position && (
                              <p className="text-text-secondary text-xs flex items-center gap-1 mt-1">
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                                </svg>
                                ({Math.round(event.position.x)}, {Math.round(event.position.y)})
                              </p>
                            )}
                          </div>
                          <span className="text-text-secondary text-sm font-mono">{timeStr}</span>
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
                      const getEventIcon = () => {
                        if (event.type === 'CHAMPION_KILL') {
                          return (
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M6.92 5L5 6.92l2.05 2.05L5.5 10.5l1.42 1.42L8.5 10.3l2.05 2.05L12 10.9l1.45 1.45 2.05-2.05 1.58 1.58L18.5 10.3l-1.45-1.45L19 7.4 17.58 6l-1.45 1.45-2.05-2.05L12.63 6.85 10.58 4.8 9.13 6.25 7.08 4.2 6.92 5z"/>
                            </svg>
                          );
                        }
                        if (event.type === 'ELITE_MONSTER_KILL') {
                          return (
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                            </svg>
                          );
                        }
                        if (event.type === 'BUILDING_KILL') {
                          return (
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 3L2 9v11h20V9l-10-6zm8 16h-4v-4h-4v4H8v-7l4-3 4 3v7z"/>
                            </svg>
                          );
                        }
                        return (
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="12" r="8"/>
                          </svg>
                        );
                      };
                      
                      return (
                        <div key={idx} className="bg-gray-700 rounded-lg p-3 flex items-center gap-3 border border-gray-600">
                          <div className="flex-shrink-0 text-primary-gold">{getEventIcon()}</div>
                          <div className="flex-1">
                            <p className="text-white font-semibold">{event.type.replace(/_/g, ' ')}</p>
                            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-text-secondary uppercase tracking-wide">
                              {event.killerId && <ParticipantTag inline label="Killer" name={getParticipantDisplay(event.killerId)} />}
                              {event.victimId && <ParticipantTag inline label="Victim" name={getParticipantDisplay(event.victimId)} intent="danger" />}
                              {event.assistingParticipantIds?.length > 0 && (
                                <ParticipantTag inline label="Assists" name={event.assistingParticipantIds.map(id => getParticipantDisplay(id)).join(', ')} intent="assist" />
                              )}
                            </div>
                            {event.position && (
                              <p className="text-text-secondary text-xs flex items-center gap-1 mt-1">
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                                </svg>
                                ({Math.round(event.position.x)}, {Math.round(event.position.y)})
                              </p>
                            )}
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
                      <svg width="100%" height="100%" className="absolute inset-0">
                        {statsHistory.length > 1 && (
                          <polyline
                            points={statsHistory.map((stat, i) => {
                              const x = (i / (statsHistory.length - 1)) * 100;
                              const y = 100 - ((stat.gold / Math.max(...statsHistory.map(s => s.gold))) * 80);
                              return `${x}%,${y}%`;
                            }).join(' ')}
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
                        {statsHistory.length > 1 && (
                          <polyline
                            points={statsHistory.map((stat, i) => {
                              const x = (i / (statsHistory.length - 1)) * 100;
                              const y = 100 - ((stat.cs / Math.max(...statsHistory.map(s => s.cs))) * 80);
                              return `${x}%,${y}%`;
                            }).join(' ')}
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
