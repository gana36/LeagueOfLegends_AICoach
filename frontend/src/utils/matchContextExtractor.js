/**
 * Match Context Extractor
 * Pre-processes match data for fast queries and builds context for AI chat
 */

export class MatchContextExtractor {
  constructor(matchData, matchSummary, mainParticipantId) {
    this.frames = matchData?.info?.frames || [];
    this.summary = matchSummary?.info || {};
    this.mainParticipantId = mainParticipantId;
    this.gameDuration = matchSummary?.info?.gameDuration ? matchSummary.info.gameDuration / 60 : this.frames.length;
    
    this.participants = this._buildParticipantMap();
    this.teamStats = this._buildTeamStats();
    this.timelineSlices = this._buildTimelineSlices();
    this.eventIndex = this._buildEventIndex();
  }

  _buildParticipantMap() {
    const map = {};
    const participants = this.summary.participants || [];
    
    participants.forEach(p => {
      const cs = (p.totalMinionsKilled || 0) + (p.neutralMinionsKilled || 0);
      map[p.participantId] = {
        id: p.participantId,
        name: p.summonerName || `Player ${p.participantId}`,
        champion: p.championName,
        role: p.teamPosition || p.individualPosition,
        team: p.teamId === 100 ? 'blue' : 'red',
        puuid: p.puuid,
        stats: {
          kda: {
            kills: p.kills,
            deaths: p.deaths,
            assists: p.assists,
            ratio: p.deaths === 0 ? p.kills + p.assists : Number(((p.kills + p.assists) / Math.max(1, p.deaths)).toFixed(2))
          },
          gold: {
            earned: p.goldEarned,
            spent: p.goldSpent
          },
          cs,
          damage: {
            dealt: p.totalDamageDealtToChampions,
            taken: p.totalDamageTaken,
            share: p.challenges?.teamDamagePercentage ? Number((p.challenges.teamDamagePercentage * 100).toFixed(1)) : null
          },
          vision: {
            score: p.visionScore,
            wardsPlaced: p.wardsPlaced,
            wardsKilled: p.wardsKilled,
            controlWards: p.visionWardsBoughtInGame
          },
          objectives: {
            dragons: p.dragonKills,
            barons: p.baronKills,
            towers: p.towerKills,
            heralds: p.riftHeraldKills
          },
          damagePerMinute: p.challenges?.damagePerMinute,
          goldPerMinute: p.challenges?.goldPerMinute,
          xpPerMinute: p.challenges?.experiencePerMinute
        },
        timeline: []
      };
    });
    
    return map;
  }

  _buildTeamStats() {
    const teams = {
      blue: {
        teamId: 100,
        name: 'Blue Team',
        kills: 0,
        deaths: 0,
        assists: 0,
        gold: 0,
        cs: 0,
        damage: 0,
        objectives: { dragons: 0, barons: 0, towers: 0, heralds: 0 },
        players: []
      },
      red: {
        teamId: 200,
        name: 'Red Team',
        kills: 0,
        deaths: 0,
        assists: 0,
        gold: 0,
        cs: 0,
        damage: 0,
        objectives: { dragons: 0, barons: 0, towers: 0, heralds: 0 },
        players: []
      }
    };

    Object.values(this.participants).forEach(player => {
      const summary = this.getPlayerSummary(player.id) || {};
      const team = teams[player.team];
      if (!team) return;

      team.players.push(player.id);
      team.kills += summary.kills || 0;
      team.deaths += summary.deaths || 0;
      team.assists += summary.assists || 0;
      team.gold += summary.goldEarned || 0;
      team.cs += (summary.totalMinionsKilled || 0) + (summary.neutralMinionsKilled || 0);
      team.damage += summary.totalDamageDealtToChampions || 0;
      team.objectives.dragons += summary.dragonKills || 0;
      team.objectives.barons += summary.baronKills || 0;
      team.objectives.towers += summary.towerKills || 0;
      team.objectives.heralds += summary.riftHeraldKills || 0;
    });

    return teams;
  }

  _buildEventIndex() {
    const index = {
      kills: [],
      dragons: [],
      barons: [],
      towers: [],
      heralds: [],
      objectives: []
    };

    this.frames.forEach((frame, frameIndex) => {
      const timestamp = frame.timestamp / 60000;
      
      (frame.events || []).forEach(event => {
        if (event.type === 'CHAMPION_KILL') {
          const killer = this.participants[event.killerId];
          const victim = this.participants[event.victimId];
          const participantsInvolved = new Set();
          if (event.killerId) participantsInvolved.add(event.killerId);
          if (event.victimId) participantsInvolved.add(event.victimId);
          (event.assistingParticipantIds || []).forEach(id => {
            if (id) participantsInvolved.add(id);
          });
          index.kills.push({
            frameIndex,
            timestamp,
            killer: event.killerId,
            victim: event.victimId,
            assisters: event.assistingParticipantIds || [],
            position: event.position,
            killerName: killer?.name,
            victimName: victim?.name,
            killerTeam: killer?.team,
            victimTeam: victim?.team,
            bounty: event.bounty || null,
            participants: Array.from(participantsInvolved)
          });
        } else if (event.type === 'ELITE_MONSTER_KILL') {
          const killer = this.participants[event.killerId];
          const participantsInvolved = new Set();
          if (event.killerId) participantsInvolved.add(event.killerId);
          (event.assistingParticipantIds || []).forEach(id => {
            if (id) participantsInvolved.add(id);
          });
          
          const assisters = (event.assistingParticipantIds || []).map(id => {
            const assister = this.participants[id];
            return assister ? assister.name : `Player ${id}`;
          });
          
          const objective = {
            frameIndex,
            timestamp,
            killer: event.killerId,
            killerName: killer?.name,
            team: killer?.team,
            position: event.position,
            monsterType: event.monsterType,
            monsterSubType: event.monsterSubType,
            assisters: assisters,
            participants: Array.from(participantsInvolved)
          };
          if (event.monsterType === 'DRAGON') {
            const dragonEvent = { ...objective, dragonType: event.monsterSubType };
            index.dragons.push(dragonEvent);
            index.objectives.push(dragonEvent);
          } else if (event.monsterType === 'BARON_NASHOR') {
            index.barons.push(objective);
            index.objectives.push(objective);
          } else if (event.monsterType === 'RIFTHERALD') {
            const heraldEvent = { ...objective, monsterType: 'RIFT_HERALD' };
            index.heralds.push(heraldEvent);
            index.objectives.push(heraldEvent);
          }
        } else if (event.type === 'BUILDING_KILL' && event.buildingType === 'TOWER_BUILDING') {
          const killer = this.participants[event.killerId];
          const participantsInvolved = new Set();
          if (event.killerId) participantsInvolved.add(event.killerId);
          (event.assistingParticipantIds || []).forEach(id => {
            if (id) participantsInvolved.add(id);
          });
          const towerEvent = {
            frameIndex,
            timestamp,
            laneType: event.laneType,
            teamId: event.teamId,
            killer: event.killerId,
            killerName: killer?.name,
            killerTeam: killer?.team,
            team: killer?.team,
            position: event.position,
            participants: Array.from(participantsInvolved)
          };
          index.towers.push(towerEvent);
          index.objectives.push({ ...towerEvent, monsterType: 'TOWER' });
        }
      });
    });

    return index;
  }

  _buildTimelineSlices() {
    if (!this.frames.length) return [];

    const slices = [];

    this.frames.forEach((frame, frameIndex) => {
      const minute = frame.timestamp ? Math.round(frame.timestamp / 60000) : frameIndex;
      const teams = {
        blue: { gold: 0, xp: 0, cs: 0, kills: 0 },
        red: { gold: 0, xp: 0, cs: 0, kills: 0 }
      };

      Object.entries(frame.participantFrames || {}).forEach(([id, data]) => {
        const participantId = Number(id);
        const player = this.participants[participantId];
        if (!player) return;
        const teamBucket = teams[player.team];

        const cs = (data.minionsKilled || 0) + (data.jungleMinionsKilled || 0);
        teamBucket.gold += data.totalGold || 0;
        teamBucket.xp += data.xp || 0;
        teamBucket.cs += cs;

        // update player timeline
        player.timeline.push({
          minute,
          gold: data.totalGold || 0,
          xp: data.xp || 0,
          cs,
          level: data.level || 1
        });
      });

      const killsInFrame = (frame.events || []).filter(evt => evt.type === 'CHAMPION_KILL');
      killsInFrame.forEach(evt => {
        const killer = this.participants[evt.killerId];
        if (killer) {
          teams[killer.team].kills += 1;
        }
      });

      slices.push({
        minute,
        frameIndex,
        teams,
        goldDiff: teams.blue.gold - teams.red.gold,
        notableEvents: killsInFrame.map(evt => ({
          type: 'kill',
          killer: evt.killerId,
          victim: evt.victimId,
          frameIndex
        }))
      });
    });

    return slices;
  }

  getPlayerSummary(participantId) {
    return this.summary.participants?.find(p => p.participantId === participantId);
  }

  getPlayerStats(participantId) {
    const player = this.participants[participantId];
    if (!player) return null;
    const summary = this.getPlayerSummary(participantId) || {};

    return {
      ...player,
      stats: player.stats,
      summary: {
        level: summary.champLevel,
        spells: [summary.summoner1Id, summary.summoner2Id],
        items: [summary.item0, summary.item1, summary.item2, summary.item3, summary.item4, summary.item5, summary.item6],
        runes: summary.perks,
        challenges: summary.challenges
      },
      timeline: player.timeline
    };
  }

  getTeamStats(teamKey) {
    return this.teamStats[teamKey];
  }

  getTimelineSnapshot(frameIndex) {
    return this.timelineSlices[frameIndex] || null;
  }

  getRecentEvents(frameIndex, window = 2) {
    return {
      kills: this.eventIndex.kills.filter(event => Math.abs(event.frameIndex - frameIndex) <= window),
      objectives: this.eventIndex.objectives.filter(event => Math.abs(event.frameIndex - frameIndex) <= window)
    };
  }

  buildChatContext(currentFrameIndex, selectedPlayer) {
    const mainPlayer = this.participants[this.mainParticipantId];
    const mainSummary = this.getPlayerSummary(this.mainParticipantId);

    if (!mainPlayer || !mainSummary) return null;

    const selectedPlayerInfo = selectedPlayer ? this.getPlayerStats(selectedPlayer) : null;
    const currentTimeline = this.getTimelineSnapshot(currentFrameIndex) || {};
    const sampledTimeline = this.timelineSlices.filter(slice => slice.minute % 5 === 0 || Math.abs(slice.frameIndex - currentFrameIndex) <= 1);

    const players = Object.values(this.participants).map(player => ({
      id: player.id,
      name: player.name,
      champion: player.champion,
      role: player.role,
      team: player.team,
      stats: player.stats,
      timeline: player.timeline.filter(point => point.minute % 5 === 0)
    }));

    const quickFacts = this._buildQuickFacts(players);

    return {
      matchId: this.summary.gameId,
      durationMinutes: Number(this.gameDuration?.toFixed ? this.gameDuration.toFixed(1) : this.gameDuration),
      currentFrame: currentFrameIndex,
      currentTime: this._formatTime(currentTimeline.minute ?? currentFrameIndex),
      mainPlayer: {
        id: this.mainParticipantId,
        name: mainPlayer.name,
        champion: mainPlayer.champion,
        role: mainPlayer.role,
        team: mainPlayer.team,
        stats: mainPlayer.stats
      },
      selectedPlayer: selectedPlayerInfo,
      teams: this.teamStats,
      timeline: {
        current: currentTimeline,
        summary: sampledTimeline
      },
      events: {
        totals: {
          kills: this.eventIndex.kills.length,
          dragons: this.eventIndex.dragons.length,
          barons: this.eventIndex.barons.length,
          towers: this.eventIndex.towers.length,
          heralds: this.eventIndex.heralds.length
        },
        firstBlood: this.eventIndex.kills[0] || null,
        firstBaron: this.eventIndex.barons[0] || null,
        firstTower: this.eventIndex.towers[0] || null,
        dragons: this.eventIndex.dragons,
        barons: this.eventIndex.barons,
        towers: this.eventIndex.towers,
        kills: this.eventIndex.kills,
        recent: this.getRecentEvents(currentFrameIndex)
      },
      eventSummary: {
        totalKills: this.eventIndex.kills.length,
        firstBlood: this.eventIndex.kills[0] || null,
        firstBaron: this.eventIndex.barons[0] || null,
        firstTower: this.eventIndex.towers[0] || null,
        dragons: this.eventIndex.dragons,
        barons: this.eventIndex.barons,
        towers: this.eventIndex.towers,
        kills: this.eventIndex.kills,
        heralds: this.eventIndex.heralds,
        recent: this.getRecentEvents(currentFrameIndex)
      },
      players,
      quickFacts
    };
  }

  _buildQuickFacts(players) {
    const bluePlayers = players.filter(p => p.team === 'blue');
    const redPlayers = players.filter(p => p.team === 'red');

    const getKDA = (p) => p.stats?.kda?.ratio || 0;
    const getKills = (p) => p.stats?.kda?.kills || 0;
    const getDeaths = (p) => p.stats?.kda?.deaths || 0;
    const getAssists = (p) => p.stats?.kda?.assists || 0;
    const getDamage = (p) => p.stats?.damage?.dealt || 0;
    const getGold = (p) => p.stats?.gold?.earned || 0;

    const sortByKDA = (a, b) => getKDA(b) - getKDA(a);
    const sortByKills = (a, b) => getKills(b) - getKills(a);
    const sortByDamage = (a, b) => getDamage(b) - getDamage(a);
    const sortByGold = (a, b) => getGold(b) - getGold(a);

    const formatPlayer = (p) => `${p.name} (${p.champion})`;
    const formatKDA = (p) => `${getKills(p)}/${getDeaths(p)}/${getAssists(p)} (${getKDA(p).toFixed(2)} KDA)`;

    return {
      teamLeaders: {
        blue: {
          highestKDA: bluePlayers.length > 0 ? {
            player: formatPlayer(bluePlayers.sort(sortByKDA)[0]),
            value: formatKDA(bluePlayers[0])
          } : null,
          mostKills: bluePlayers.length > 0 ? {
            player: formatPlayer(bluePlayers.sort(sortByKills)[0]),
            value: getKills(bluePlayers[0])
          } : null,
          mostDamage: bluePlayers.length > 0 ? {
            player: formatPlayer(bluePlayers.sort(sortByDamage)[0]),
            value: getDamage(bluePlayers[0])
          } : null,
          mostGold: bluePlayers.length > 0 ? {
            player: formatPlayer(bluePlayers.sort(sortByGold)[0]),
            value: getGold(bluePlayers[0])
          } : null
        },
        red: {
          highestKDA: redPlayers.length > 0 ? {
            player: formatPlayer(redPlayers.sort(sortByKDA)[0]),
            value: formatKDA(redPlayers[0])
          } : null,
          mostKills: redPlayers.length > 0 ? {
            player: formatPlayer(redPlayers.sort(sortByKills)[0]),
            value: getKills(redPlayers[0])
          } : null,
          mostDamage: redPlayers.length > 0 ? {
            player: formatPlayer(redPlayers.sort(sortByDamage)[0]),
            value: getDamage(redPlayers[0])
          } : null,
          mostGold: redPlayers.length > 0 ? {
            player: formatPlayer(redPlayers.sort(sortByGold)[0]),
            value: getGold(redPlayers[0])
          } : null
        },
        overall: {
          highestKDA: players.length > 0 ? {
            player: formatPlayer(players.sort(sortByKDA)[0]),
            value: formatKDA(players[0])
          } : null,
          mostKills: players.length > 0 ? {
            player: formatPlayer(players.sort(sortByKills)[0]),
            value: getKills(players[0])
          } : null,
          mostDamage: players.length > 0 ? {
            player: formatPlayer(players.sort(sortByDamage)[0]),
            value: getDamage(players[0])
          } : null
        }
      },
      objectives: {
        dragons: {
          total: this.eventIndex.dragons.length,
          blueTeam: this.eventIndex.dragons.filter(d => d.team === 'blue').length,
          redTeam: this.eventIndex.dragons.filter(d => d.team === 'red').length,
          first: this.eventIndex.dragons[0] ? `${this.eventIndex.dragons[0].team} team at ${this.eventIndex.dragons[0].timestamp?.toFixed(1)} min` : 'None'
        },
        barons: {
          total: this.eventIndex.barons.length,
          blueTeam: this.eventIndex.barons.filter(b => b.team === 'blue').length,
          redTeam: this.eventIndex.barons.filter(b => b.team === 'red').length,
          first: this.eventIndex.barons[0] ? `${this.eventIndex.barons[0].team} team at ${this.eventIndex.barons[0].timestamp?.toFixed(1)} min` : 'None'
        },
        towers: {
          total: this.eventIndex.towers.length,
          blueTeam: this.eventIndex.towers.filter(t => t.team === 'blue').length,
          redTeam: this.eventIndex.towers.filter(t => t.team === 'red').length,
          first: this.eventIndex.towers[0] ? `${this.eventIndex.towers[0].team} team at ${this.eventIndex.towers[0].timestamp?.toFixed(1)} min` : 'None'
        }
      },
      teamComparison: {
        kills: `Blue ${this.teamStats.blue.kills} - ${this.teamStats.red.kills} Red`,
        gold: `Blue ${this.teamStats.blue.gold} - ${this.teamStats.red.gold} Red`,
        damage: `Blue ${this.teamStats.blue.damage} - ${this.teamStats.red.damage} Red`
      }
    };
  }

  _formatTime(frameIndex) {
    const minutes = Math.floor(frameIndex);
    const seconds = Math.floor((frameIndex % 1) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
