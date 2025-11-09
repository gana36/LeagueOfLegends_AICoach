import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { getChampionImageUrl } from '../utils/championImages';
import { MatchContextExtractor } from '../utils/matchContextExtractor';
import { API_URL } from '../config';

const CHAMPION_IMAGE_BASE = 'https://ddragon.leagueoflegends.com/cdn/12.4.1/img/champion';

const RightSidebar = ({ 
  currentFrame, 
  selectedPlayer, 
  pinnedPlayers, 
  onPinPlayer, 
  onClose, 
  participantSummary = {}, 
  mainParticipantId = 1,
  matchData,
  matchSummary,
  currentFrameIndex,
  onNavigateToFrame,
  eventToggles,
  onToggleEvent,
  onOpenPlayerModal,
  onOpenFrameEventsModal,
  onSetPlayerFilter
}) => {
  const [isChatOpen, setIsChatOpen] = React.useState(false);
  const [chatInput, setChatInput] = React.useState('');
  const [chatMessages, setChatMessages] = React.useState([
    {
      id: 'welcome',
      role: 'assistant',
      author: 'Rift Copilot',
      timestamp: 'Just now',
      content: 'Ping me when you need quick analysis or a next-step suggestion.'
    }
  ]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [conversationHistory, setConversationHistory] = React.useState([]);
  const chatScrollRef = React.useRef(null);
  const lastMessageRef = React.useRef(null);
  const chatInputRef = React.useRef(null);

  // Initialize context extractor
  const contextExtractor = React.useMemo(() => {
    if (!matchData?.info?.frames?.length) return null;
    return new MatchContextExtractor(matchData, matchSummary, mainParticipantId);
  }, [matchData, matchSummary, mainParticipantId]);

  React.useEffect(() => {
    if (!isChatOpen) return;
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [chatMessages, isChatOpen]);

  React.useEffect(() => {
    if (isChatOpen && chatInputRef.current) {
      chatInputRef.current.focus();
    }
  }, [isChatOpen]);

  const hasUserMessages = React.useMemo(
    () => chatMessages.some(message => message.role === 'user'),
    [chatMessages]
  );
  const showWelcome = !hasUserMessages && chatMessages.length <= 1;
  const suggestedTasks = React.useMemo(
    () => (
      [
        { id: 'first-blood', label: 'Show me first blood', eta: '' },
        { id: 'first-dragon', label: 'When was the first dragon?', eta: '' },
        { id: 'my-kda', label: 'What was my KDA?', eta: '' }
      ]
    ),
    []
  );

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
    const championImageUrl = championName ? getChampionImageUrl(championName) : null;
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

  const handleSendChatMessage = async (event) => {
    event.preventDefault();
    const message = chatInput.trim();
    if (!message || !contextExtractor) return;

    // Add user message
    const userMessage = {
      id: Date.now(),
      role: 'user',
      author: 'You',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: message
    };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsLoading(true);

    // Add thinking indicator
    const thinkingMessage = {
      id: 'thinking',
      role: 'assistant',
      author: 'Rift Copilot',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: '',
      isThinking: true
    };
    setChatMessages(prev => [...prev, thinkingMessage]);

    try {
      // Build context
      const context = contextExtractor.buildChatContext(currentFrameIndex, selectedPlayer);

      // Call backend with conversation history
      const response = await fetch(`${API_URL}/api/chat/match-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message, 
          context,
          conversation_history: conversationHistory 
        })
      });

      const data = await response.json();

      // Update conversation history
      if (data.conversation_history) {
        setConversationHistory(data.conversation_history);
      }

      // Remove thinking indicator and add AI response
      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        author: 'Rift Copilot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: data.response,
        action: data.action // Attach action to message for inline display
      };
      setChatMessages(prev => prev.filter(m => m.id !== 'thinking').concat(aiMessage));
      
      // Auto-execute actions that don't require permission
      if (data.action && !data.action.requiresPermission) {
        executeAction(data.action);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        author: 'Rift Copilot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: 'Sorry, I encountered an error. Please try again.'
      };
      setChatMessages(prev => prev.filter(m => m.id !== 'thinking').concat(errorMessage));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCard = (params) => {
    console.log('Opening card:', params);
    
    if (params.cardType === 'player' && params.data) {
      // Find participant ID from player data
      const participantId = params.data.id;
      if (participantId && onOpenPlayerModal) {
        onOpenPlayerModal(participantId);
      }
    } else if (params.cardType === 'frame_events') {
      if (onOpenFrameEventsModal) {
        onOpenFrameEventsModal();
      }
    } else if (params.cardType === 'dragon' || params.cardType === 'kill') {
      // For dragon/kill cards, navigate to the event and open frame events modal
      if (params.data?.frameIndex !== undefined && onNavigateToFrame) {
        onNavigateToFrame(params.data.frameIndex);
        // Small delay to let navigation complete, then open modal
        setTimeout(() => {
          if (onOpenFrameEventsModal) {
            onOpenFrameEventsModal();
          }
        }, 100);
      }
    }
  };

  const postActionMessage = (markdownContent) => {
    if (!markdownContent) return;
    const actionMessage = {
      id: `${Date.now()}-action`,
      role: 'assistant',
      author: 'Rift Copilot',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: markdownContent
    };
    setChatMessages(prev => [...prev, actionMessage]);
  };

  const executeAction = (action) => {
    if (action.type === 'multi_action') {
      // Execute multiple actions in sequence
      action.actions.forEach(subAction => {
        executeAction(subAction);
      });
      return;
    }

    switch(action.type) {
      case 'navigate_timeline':
        if (onNavigateToFrame && action.params.frameIndex !== undefined) {
          onNavigateToFrame(action.params.frameIndex);
        }
        break;
      
      case 'toggle_event':
        if (onToggleEvent && action.params.eventType) {
          onToggleEvent(action.params.eventType, action.params.enabled);
        }
        break;
      
      case 'toggle_map_filter':
        if (onSetPlayerFilter && action.params.filter) {
          const filterMap = {
            'my_team': 'team',
            'enemy_team': 'opponents',
            'all': 'all',
            'blue_team': 'blueTeam',
            'red_team': 'redTeam'
          };
          const mappedFilter = filterMap[action.params.filter] || action.params.filter;
          onSetPlayerFilter(mappedFilter);
        }
        break;
      
      case 'open_card':
        // Handle card views
        handleOpenCard(action.params);
        break;
      
      case 'display_players': {
        const { players = [], filter, sortBy } = action.params || {};
        if (players.length) {
          const header = `**${filter === 'my_team' ? 'Your Team' : 'Players'} (sorted by ${sortBy || 'kda'})**`;
          const listLines = players.map(player => `- **${player.name}** (${player.champion}) — ${player.stats?.kda?.kills ?? 0}/${player.stats?.kda?.deaths ?? 0}/${player.stats?.kda?.assists ?? 0} KDA`);
          postActionMessage([header, '', ...listLines].join('\n'));
        }
        break;
      }
      
      case 'display_event_timeline': {
        const { eventType, events = [] } = action.params || {};
        if (events.length) {
          const header = `**${eventType?.toUpperCase() || 'Events'} Timeline**`;
          const listLines = events.map((event, idx) => `- ${idx + 1}. ${event.timestamp?.toFixed?.(1) ?? event.timestamp ?? '—'} min — ${event.description || event.summary || ''}`);
          postActionMessage([header, '', ...listLines].join('\n'));
        }
        break;
      }
      
      case 'select_player':
        // Handle player selection
        break;
    }
  };

  return (
    <div className="relative w-[320px] bg-surface h-full overflow-y-auto" style={{ overflowY: isChatOpen ? 'hidden' : 'auto' }}>
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
          <PlayerStatsCard participantId={mainParticipantId} isPinned={false} />
        )}
      </div>

      {/* Floating Chat Button */}
      <button
        type="button"
        onClick={() => setIsChatOpen(true)}
        className={`fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-20 flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-primary-gold text-bg-dark shadow-lg transition-transform hover:scale-105 ${isChatOpen ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
        aria-label="Open Rift Copilot chat"
      >
        💬
      </button>

      {isChatOpen && (
        <div className="absolute inset-0 z-30 bg-[#0d0d0d]/98 backdrop-blur-2xl flex flex-col">
            {/* Top bar */}
            <div className="px-4 py-3.5 border-b border-white/[0.08] flex items-center justify-between sticky top-0 bg-[#0d0d0d]/98 backdrop-blur-2xl">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-gold/20 to-primary-gold/5 border border-primary-gold/25 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary-gold">RC</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Rift Copilot</p>
                  <p className="text-[11px] text-white/40">AI match insights</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsChatOpen(false)}
                className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/50 hover:text-white/80 transition-all flex items-center justify-center"
                aria-label="Close chat"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="stroke-current">
                  <path d="M1 1L11 11M11 1L1 11" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 flex flex-col">
              {showWelcome ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-5 px-5 py-6">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-gold/15 to-primary-gold/5 border border-primary-gold/25 flex items-center justify-center">
                      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                        <path d="M14 3L17 10L24 14L17 18L14 25L11 18L4 14L11 10L14 3Z" fill="currentColor" className="text-primary-gold/60"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-base font-semibold text-white mb-1">Rift Copilot</p>
                      <p className="text-xs text-white/40 max-w-[240px]">Ask anything about the match. Get instant insights.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div ref={chatScrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3 space-y-3">
                  {chatMessages.map((message, index) => {
                    const isLastMessage = index === chatMessages.length - 1;
                    return (
                    <div
                      key={message.id}
                      ref={isLastMessage ? lastMessageRef : null}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[90%] ${
                        message.role === 'user'
                          ? 'bg-primary-gold/10 border border-primary-gold/20 text-white rounded-xl px-3.5 py-2.5'
                          : 'space-y-2'
                      }`}>
                        {message.role === 'user' ? (
                          <>
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-[11px] font-medium text-white">{message.author}</span>
                              <span className="text-[10px] text-white/30">{message.timestamp}</span>
                            </div>
                            <p className="text-[13px] leading-relaxed">{message.content}</p>
                          </>
                        ) : (
                          <>
                            <div className="bg-white/[0.04] border border-white/[0.08] text-white/90 rounded-xl px-3.5 py-2.5">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-[11px] font-medium text-primary-gold">{message.author}</span>
                                <span className="text-[10px] text-white/30">{message.timestamp}</span>
                              </div>
                              {message.isThinking ? (
                                <div className="flex items-center gap-2">
                                  <div className="flex gap-1">
                                    <div className="w-2 h-2 bg-primary-gold/60 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-2 h-2 bg-primary-gold/60 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-2 h-2 bg-primary-gold/60 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
                                  </div>
                                  <span className="text-[13px] text-white/40">Thinking...</span>
                                </div>
                              ) : (
                                <div className="prose prose-invert prose-sm max-w-none">
                                  <ReactMarkdown
                                    components={{
                                      p: ({node, ...props}) => <p className="text-[13px] leading-relaxed mb-2 last:mb-0" {...props} />,
                                      strong: ({node, ...props}) => <strong className="text-primary-gold font-semibold" {...props} />,
                                      ul: ({node, ...props}) => <ul className="text-[13px] list-disc list-inside space-y-1 my-2" {...props} />,
                                      ol: ({node, ...props}) => <ol className="text-[13px] list-decimal list-inside space-y-1 my-2" {...props} />,
                                      li: ({node, ...props}) => <li className="text-[13px]" {...props} />,
                                      code: ({node, inline, ...props}) => 
                                        inline ? 
                                          <code className="bg-white/10 px-1.5 py-0.5 rounded text-[12px] text-primary-gold" {...props} /> :
                                          <code className="block bg-white/10 p-2 rounded text-[12px] my-2" {...props} />
                                    }}
                                  >
                                    {message.content}
                                  </ReactMarkdown>
                                </div>
                              )}
                            </div>
                            
                            {/* Inline action buttons */}
                            {message.action && message.action.requiresPermission && (
                              <div className="flex gap-2 pl-2">
                                <button
                                  onClick={() => {
                                    executeAction(message.action);
                                    // Remove action after execution
                                    setChatMessages(prev => prev.map(m => 
                                      m.id === message.id ? { ...m, action: null } : m
                                    ));
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-gold/90 hover:bg-primary-gold text-bg-dark rounded-md text-xs font-medium transition-colors"
                                >
                                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="stroke-current">
                                    <path d="M6 2L6 10M6 10L3 7M6 10L9 7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                  {message.action.type === 'multi_action' ? 'Show me' : `Jump to ${message.action.params?.frameIndex ? Math.floor(message.action.params.frameIndex) + ':00' : 'moment'}`}
                                </button>
                                <button
                                  onClick={() => {
                                    // Remove action on cancel
                                    setChatMessages(prev => prev.map(m => 
                                      m.id === message.id ? { ...m, action: null } : m
                                    ));
                                  }}
                                  className="px-3 py-1.5 bg-white/[0.08] hover:bg-white/[0.12] text-white/70 hover:text-white rounded-md text-xs font-medium transition-colors"
                                >
                                  Dismiss
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}

              {/* Only show suggested tasks if no user messages yet */}
              {!hasUserMessages && (
                <div className="px-4 pb-3">
                  <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-white/30 mb-2 font-medium">Suggested</p>
                    <div className="space-y-1">
                      {suggestedTasks.map(task => (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => {
                            setChatInput(task.label);
                            if (chatInputRef.current) chatInputRef.current.focus();
                          }}
                          className="w-full text-left rounded-md bg-white/[0.02] hover:bg-white/[0.06] px-2.5 py-2 text-xs text-white/70 hover:text-white/90 transition-all"
                        >
                          <span className="truncate">{task.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSendChatMessage} className="px-4 pb-4">
              <div className="flex items-center gap-2.5 rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-2.5 focus-within:border-white/[0.2] transition-colors">
                <input
                  type="text"
                  value={chatInput}
                  onChange={event => setChatInput(event.target.value)}
                  placeholder="Ask Rift Copilot..."
                  ref={chatInputRef}
                  className="flex-1 bg-transparent text-[13px] text-white placeholder:text-white/30 focus:outline-none caret-primary-gold"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="flex items-center justify-center w-7 h-7 rounded-md bg-primary-gold/90 hover:bg-primary-gold text-bg-dark transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="stroke-current">
                    <path d="M2 7H12M12 7L8 3M12 7L8 11" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </form>
        </div>
      )}
    </div>
  );
};

export default RightSidebar;
