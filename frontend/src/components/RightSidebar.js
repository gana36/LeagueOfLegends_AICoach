import React from 'react';

const CHAMPION_IMAGE_BASE = 'https://ddragon.leagueoflegends.com/cdn/12.4.1/img/champion';

const RightSidebar = ({ currentFrame, selectedPlayer, pinnedPlayers, onPinPlayer, onClose, participantSummary = {} }) => {
  if (!currentFrame || !currentFrame.participantFrames) {
    return <div className="w-[320px] bg-surface h-full" />;
  }

  const participantFrames = currentFrame.participantFrames;
  
  // Calculate team stats
  const calculateTeamStats = () => {
    const blueTeam = { kills: 0, gold: 0, towers: 0, dragons: 0 };
    const redTeam = { kills: 0, gold: 0, towers: 0, dragons: 0 };
    
    Object.values(participantFrames).forEach(player => {
      const isBlue = player.participantId <= 5;
      const team = isBlue ? blueTeam : redTeam;
      team.gold += player.totalGold || 0;
    });
    
    return { blueTeam, redTeam };
  };

  const { blueTeam, redTeam } = calculateTeamStats();
  const goldDiff = blueTeam.gold - redTeam.gold;
  const totalGold = blueTeam.gold + redTeam.gold;
  const blueGoldPercent = totalGold > 0 ? (blueTeam.gold / totalGold) * 100 : 50;

  // Get current time from frame
  const getCurrentTime = () => {
    if (!currentFrame.timestamp) return '0:00';
    const totalSeconds = Math.floor(currentFrame.timestamp / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const PlayerStatsCard = ({ participantId, isPinned }) => {
    const player = participantFrames[participantId];
    if (!player) return null;

    const stats = player.championStats || {};
    const healthPercent = stats.healthMax > 0 ? (stats.health / stats.healthMax) * 100 : 100;
    const manaPercent = stats.powerMax > 0 ? (stats.power / stats.powerMax) * 100 : 100;
    const summary = participantSummary[participantId] || {};
    const championName = summary.championName;
    const championImageUrl = championName ? `${CHAMPION_IMAGE_BASE}/${championName}.png` : null;
    const summonerName = summary.summonerName || `Player ${participantId}`;
    const kda = `${summary.kills ?? player.kills ?? 0}/${summary.deaths ?? player.deaths ?? 0}/${summary.assists ?? player.assists ?? 0}`;
    const teamName = participantId <= 5 ? 'Blue Team' : 'Red Team';
    const teamPillClasses = participantId <= 5 ? 'bg-team-blue/20 text-team-blue border-team-blue/40' : 'bg-enemy-red/20 text-enemy-red border-enemy-red/40';

    return (
      <div className="bg-bg-dark rounded-xl p-4 mb-3 border border-gray-700">
        <div className="flex items-start justify-between mb-3 gap-3">
          <div className="flex items-start gap-3">
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-primary-gold bg-gray-700 flex items-center justify-center shadow-lg flex-shrink-0">
              {championImageUrl ? (
                <img
                  src={championImageUrl}
                  alt={championName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-bold text-lg">P{participantId}</span>
              )}
            </div>
            <div className="flex-1">
              <div className="text-white font-semibold text-sm uppercase tracking-wide leading-tight">
                {championName || `Player ${participantId}`}
              </div>
              <div className="text-primary-gold text-sm font-bold leading-tight truncate">
                {summonerName}
              </div>
              <div className="text-xs text-text-secondary flex flex-wrap items-center gap-2 mt-2">
                <span className={`px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wide font-semibold ${teamPillClasses}`}>
                  {teamName}
                </span>
                <span className="text-white/80">Level {player.level}</span>
                <span className="text-white font-semibold">KDA {kda}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onPinPlayer(participantId)}
              className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
                isPinned ? 'bg-primary-gold text-bg-dark' : 'bg-gray-700 text-text-secondary hover:bg-gray-600'
              }`}
              title={isPinned ? 'Unpin' : 'Pin'}
            >
              📌
            </button>
            {selectedPlayer === participantId && (
              <button
                onClick={onClose}
                className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center hover:bg-gray-600 transition-colors text-text-secondary"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
          <div>
            <div className="text-xs text-text-secondary">Gold</div>
            <div className="text-primary-gold font-semibold">{player.totalGold?.toLocaleString() || 0}</div>
          </div>
          <div>
            <div className="text-xs text-text-secondary">CS</div>
            <div className="text-white font-semibold">
              {(player.minionsKilled || 0) + (player.jungleMinionsKilled || 0)}
            </div>
          </div>
          <div>
            <div className="text-xs text-text-secondary">Attack Damage</div>
            <div className="text-white font-semibold">{Math.round(stats.attackDamage || 0)}</div>
          </div>
          <div>
            <div className="text-xs text-text-secondary">Ability Power</div>
            <div className="text-white font-semibold">{Math.round(stats.abilityPower || 0)}</div>
          </div>
          <div>
            <div className="text-xs text-text-secondary">Armor</div>
            <div className="text-white font-semibold">{Math.round(stats.armor || 0)}</div>
          </div>
          <div>
            <div className="text-xs text-text-secondary">Magic Resist</div>
            <div className="text-white font-semibold">{Math.round(stats.magicResist || 0)}</div>
          </div>
        </div>

        {/* Health Bar */}
        <div className="mb-3">
          <div className="flex justify-between text-[11px] mb-1 text-text-secondary">
            <span className="text-text-secondary">Health</span>
            <span className="text-white font-medium">{Math.round(stats.health || 0)} / {Math.round(stats.healthMax || 0)}</span>
          </div>
          <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all"
              style={{ width: `${healthPercent}%` }}
            />
          </div>
        </div>

        {/* Mana Bar */}
        <div className="mb-3">
          <div className="flex justify-between text-[11px] mb-1 text-text-secondary">
            <span className="text-text-secondary">Mana</span>
            <span className="text-white font-medium">{Math.round(stats.power || 0)} / {Math.round(stats.powerMax || 0)}</span>
          </div>
          <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all"
              style={{ width: `${manaPercent}%` }}
            />
          </div>
        </div>

        {/* Combat Stats */}
        <div className="pt-3 border-t border-gray-700">
          <div className="text-xs text-text-secondary mb-2 uppercase tracking-wide">Combat Snapshot</div>
          <div className="grid grid-cols-2 gap-2 text-xs text-white/90">
            <div className="flex justify-between">
              <span className="text-text-secondary">Attack Speed</span>
              <span className="text-white">{stats.attackSpeed || 0}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Move Speed</span>
              <span className="text-white">{Math.round(stats.movementSpeed || 0)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-[320px] bg-surface h-full overflow-y-auto">
      {/* Frame Summary */}
      <div className="p-4 border-b border-gray-700">
        <div className="text-center mb-4">
          <div className="text-primary-gold text-2xl font-bold">{getCurrentTime()}</div>
        </div>

        {/* Gold Difference Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-team-blue font-semibold">{blueTeam.gold.toLocaleString()}g</span>
            <span className={`font-semibold ${goldDiff >= 0 ? 'text-team-blue' : 'text-enemy-red'}`}>
              {goldDiff >= 0 ? '+' : ''}{goldDiff.toLocaleString()}g
            </span>
            <span className="text-enemy-red font-semibold">{redTeam.gold.toLocaleString()}g</span>
          </div>
          <div className="h-3 bg-gray-700 rounded-full overflow-hidden flex">
            <div 
              className="bg-team-blue transition-all"
              style={{ width: `${blueGoldPercent}%` }}
            />
            <div 
              className="bg-enemy-red transition-all"
              style={{ width: `${100 - blueGoldPercent}%` }}
            />
          </div>
        </div>

        {/* Objectives */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <div className="text-text-secondary">Towers</div>
            <div className="text-white font-semibold">5 - 3</div>
          </div>
          <div>
            <div className="text-text-secondary">Dragons</div>
            <div className="text-white font-semibold">2 - 1</div>
          </div>
          <div>
            <div className="text-text-secondary">Barons</div>
            <div className="text-white font-semibold">0 - 0</div>
          </div>
        </div>
      </div>

      {/* Player Stats Cards */}
      <div className="p-4">
        <h3 className="text-white font-semibold text-sm mb-3">Player Details</h3>
        
        {/* Selected Player */}
        {selectedPlayer && (
          <PlayerStatsCard 
            participantId={selectedPlayer} 
            isPinned={pinnedPlayers.includes(selectedPlayer)}
          />
        )}

        {/* Pinned Players */}
        {pinnedPlayers.filter(id => id !== selectedPlayer).map(participantId => (
          <PlayerStatsCard 
            key={participantId}
            participantId={participantId} 
            isPinned={true}
          />
        ))}

        {/* Default: Show main player if nothing selected */}
        {!selectedPlayer && pinnedPlayers.length === 0 && (
          <PlayerStatsCard participantId={1} isPinned={false} />
        )}
      </div>
    </div>
  );
};

export default RightSidebar;
