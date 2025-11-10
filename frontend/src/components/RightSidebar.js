import React from 'react';
import ReactMarkdown from 'react-markdown';
import { getChampionImageUrl } from '../utils/championImages';
import { MatchContextExtractor } from '../utils/matchContextExtractor';
import { API_URL } from '../config';
import html2canvas from 'html2canvas';

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
  onSetPlayerFilter,
  onShowEventCard
}) => {
  const [isChatOpen, setIsChatOpen] = React.useState(false);
  const [chatWidth, setChatWidth] = React.useState(320); // Default width
  const [isResizing, setIsResizing] = React.useState(false);
  const [sidebarBounds, setSidebarBounds] = React.useState({ top: 0, height: 0 });
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
  const [_isLoading, setIsLoading] = React.useState(false);
  const [conversationHistory, setConversationHistory] = React.useState([]);
  const [displayedCards, setDisplayedCards] = React.useState([mainParticipantId]); // Main player always first
  const [showAddCardMenu, setShowAddCardMenu] = React.useState(false);
  const chatScrollRef = React.useRef(null);
  const lastMessageRef = React.useRef(null);
  const chatInputRef = React.useRef(null);
  const sidebarRef = React.useRef(null);

  // Ensure main player card is always displayed when mainParticipantId changes
  React.useEffect(() => {
    setDisplayedCards(prev => {
      // If main player is already first, no change needed
      if (prev[0] === mainParticipantId) return prev;
      // Otherwise, put main player first and remove any duplicates
      return [mainParticipantId, ...prev.filter(id => id !== mainParticipantId)];
    });
  }, [mainParticipantId]);

  // Initialize context extractor
  const contextExtractor = React.useMemo(() => {
    if (!matchData?.info?.frames?.length) return null;
    return new MatchContextExtractor(matchData, matchSummary, mainParticipantId);
  }, [matchData, matchSummary, mainParticipantId]);

  // Card management functions
  const addPlayerCard = (participantId) => {
    if (!displayedCards.includes(participantId)) {
      setDisplayedCards([...displayedCards, participantId]);
    }
    setShowAddCardMenu(false);
  };

  const removePlayerCard = (participantId) => {
    // Don't allow removing the main participant card - it must always be displayed
    if (participantId === mainParticipantId) return;
    
    setDisplayedCards(displayedCards.filter(id => id !== participantId));
  };

  // Get available players for adding cards
  const getAvailablePlayers = () => {
    if (!participantFrames) return [];
    return Object.keys(participantFrames)
      .map(id => parseInt(id))
      .filter(id => !displayedCards.includes(id))
      .sort((a, b) => a - b);
  };

  // Share functionality with screenshot
  const handleSharePlayer = async (participantId) => {
    const cardElement = document.getElementById(`player-card-${participantId}`);
    if (!cardElement) return;

    try {
      // Show loading state
      const originalButton = document.querySelector(`#share-btn-${participantId}`);
      if (originalButton) {
        originalButton.textContent = '📸';
        originalButton.disabled = true;
      }

      // Generate screenshot
      const canvas = await html2canvas(cardElement, {
        backgroundColor: '#1a1a1a',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true
      });

      // Convert to blob
      canvas.toBlob(async (blob) => {
        const file = new File([blob], `player-stats-${participantId}.png`, { type: 'image/png' });
        
        // Reset button
        if (originalButton) {
          originalButton.textContent = '📤';
          originalButton.disabled = false;
        }

        try {
          if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            // Use native share with file
            await navigator.share({
              title: `Player Stats - RIFT Analyzer`,
              text: `Check out these player stats from RIFT Analyzer!`,
              files: [file]
            });
          } else {
            // Fallback: download the image
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `player-stats-${participantId}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            alert('Player stats screenshot saved!');
          }
        } catch (err) {
          console.error('Error sharing screenshot:', err);
          // Final fallback: just download
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `player-stats-${participantId}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    } catch (err) {
      console.error('Error generating screenshot:', err);
      alert('Failed to generate screenshot. Please try again.');
    }
  };

  React.useEffect(() => {
    if (!isChatOpen) return;
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [chatMessages, isChatOpen]);

  React.useEffect(() => {
    if (isChatOpen) {
      // Reset sidebar scroll to top when chat opens
      if (sidebarRef.current) {
        sidebarRef.current.scrollTop = 0;
        
        // Get sidebar position for fixed positioning
        const rect = sidebarRef.current.getBoundingClientRect();
        setSidebarBounds({ top: rect.top, height: rect.height });
      }
      // Focus chat input
      if (chatInputRef.current) {
        chatInputRef.current.focus();
      }
    }
  }, [isChatOpen]);

  // Handle chat resize
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  React.useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      
      // Calculate new width based on mouse position from right edge
      const newWidth = window.innerWidth - e.clientX;
      
      // Constrain width between 320px (min) and 800px (max)
      const constrainedWidth = Math.min(Math.max(newWidth, 320), 800);
      setChatWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

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
    
    // Calculate additional valuable stats
    const totalCS = (player.minionsKilled || 0) + (player.jungleMinionsKilled || 0);
    const csPerMinute = currentFrameIndex > 0 ? (totalCS / (currentFrameIndex / 10)).toFixed(1) : '0.0';
    const goldPerMinute = currentFrameIndex > 0 ? Math.round(player.totalGold / (currentFrameIndex / 10)) : 0;
    const killParticipation = summary.kills || summary.assists ? 
      Math.round(((summary.kills + summary.assists) / Math.max(1, summary.teamKills || 1)) * 100) : 0;
    const visionScore = summary.wardsPlaced || 0;
    const damageDealt = summary.totalDamageDealt || 0;
    const damageTaken = summary.totalDamageTaken || 0;

    return (
      <div id={`player-card-${participantId}`} className="bg-bg-dark rounded-xl p-4 mb-3 border border-gray-700">
        <div className="flex items-start justify-between mb-3 gap-2">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary-gold bg-gray-700 flex items-center justify-center shadow-lg flex-shrink-0">
              {championImageUrl ? (
                <img
                  src={championImageUrl}
                  alt={championName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-bold text-sm">P{participantId}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-semibold text-sm uppercase tracking-wide leading-tight truncate">
                {championName || `Player ${participantId}`}
              </div>
              <div className="text-primary-gold text-xs font-bold leading-tight truncate">
                {summonerName}
              </div>
              <div className="text-xs text-text-secondary flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className={`px-1.5 py-0.5 rounded-full border text-[9px] uppercase tracking-wide font-semibold whitespace-nowrap ${teamPillClasses}`}>
                  {teamName}
                </span>
                <span className="text-white/80 whitespace-nowrap">Lv {player.level}</span>
                <span className="text-white font-semibold whitespace-nowrap">{kda}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            <button
              id={`share-btn-${participantId}`}
              onClick={() => handleSharePlayer(participantId)}
              className="w-7 h-7 bg-gray-700 rounded flex items-center justify-center hover:bg-gray-600 transition-colors text-text-secondary flex-shrink-0"
              title="Share Player Stats"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
            </button>
            <button
              onClick={() => onPinPlayer(participantId)}
              className={`w-7 h-7 rounded flex items-center justify-center transition-colors flex-shrink-0 ${
                isPinned ? 'bg-primary-gold text-bg-dark' : 'bg-gray-700 text-text-secondary hover:bg-gray-600'
              }`}
              title={isPinned ? 'Unpin' : 'Pin'}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
            {displayedCards.length > 1 && participantId !== mainParticipantId && (
              <button
                onClick={() => removePlayerCard(participantId)}
                className="w-7 h-7 bg-red-600 rounded flex items-center justify-center hover:bg-red-700 transition-colors text-white flex-shrink-0"
                title="Remove Card"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
          <div>
            <div className="text-xs text-text-secondary">Gold</div>
            <div className="text-primary-gold font-semibold">{player.totalGold?.toLocaleString() || 0}</div>
            <div className="text-[10px] text-text-secondary">{goldPerMinute}/min</div>
          </div>
          <div>
            <div className="text-xs text-text-secondary">CS</div>
            <div className="text-white font-semibold">{totalCS}</div>
            <div className="text-[10px] text-text-secondary">{csPerMinute}/min</div>
          </div>
          <div>
            <div className="text-xs text-text-secondary">Kill Participation</div>
            <div className="text-white font-semibold">{killParticipation}%</div>
          </div>
          <div>
            <div className="text-xs text-text-secondary">Vision Score</div>
            <div className="text-white font-semibold">{visionScore}</div>
          </div>
          <div>
            <div className="text-xs text-text-secondary">Damage Dealt</div>
            <div className="text-white font-semibold">{damageDealt?.toLocaleString() || 0}</div>
          </div>
          <div>
            <div className="text-xs text-text-secondary">Damage Taken</div>
            <div className="text-white font-semibold">{damageTaken?.toLocaleString() || 0}</div>
          </div>
        </div>

        {/* Combat Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
          <div>
            <div className="text-xs text-text-secondary mb-1">AD</div>
            <div className="text-white font-semibold">{Math.round(stats.attackDamage || 0)}</div>
          </div>
          <div>
            <div className="text-xs text-text-secondary mb-1">AP</div>
            <div className="text-white font-semibold">{Math.round(stats.abilityPower || 0)}</div>
          </div>
          <div>
            <div className="text-xs text-text-secondary mb-1">Speed</div>
            <div className="text-white font-semibold">{Math.round(stats.movementSpeed || 0)}</div>
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
    } else if (['dragon', 'kill', 'tower', 'baron', 'herald'].includes(params.cardType)) {
      const eventData = params.data;
      if (eventData?.frameIndex !== undefined && onNavigateToFrame) {
        onNavigateToFrame(eventData.frameIndex);
      }

      if (onShowEventCard) {
        onShowEventCard({
          ...eventData,
          cardType: params.cardType
        });
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

  const ensureSentence = (text) => {
    if (!text) return '';
    const trimmed = text.trim();
    if (!trimmed) return '';
    return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
  };

  const capitalizeWord = (word) => {
    if (!word) return '';
    return word.charAt(0).toUpperCase() + word.slice(1);
  };

  const formatLabel = (value) => {
    if (!value) return null;
    return value
      .toString()
      .toLowerCase()
      .split('_')
      .map(capitalizeWord)
      .join(' ');
  };

  const getTeamName = (teamId) => {
    if (teamId === 100) return 'Blue Team';
    if (teamId === 200) return 'Red Team';
    return null;
  };

  const formatMinutes = (value) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
    const totalSeconds = Math.max(0, Math.round(Number(value) * 60));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTimestampFromData = (data = {}, fallbackFrameIndex, fallbackMinutes) => {
    if (data.timestamp !== undefined && data.timestamp !== null) {
      return formatMinutes(data.timestamp);
    }
    if (data.timestampMillis !== undefined && data.timestampMillis !== null) {
      return formatMinutes(data.timestampMillis / 60000);
    }
    if (fallbackMinutes !== undefined && fallbackMinutes !== null) {
      return formatMinutes(fallbackMinutes);
    }
    if (fallbackFrameIndex !== undefined && fallbackFrameIndex !== null) {
      return formatMinutes(fallbackFrameIndex);
    }
    return null;
  };

  const getParticipantDisplayName = (participantId) => {
    if (participantId === null || participantId === undefined) return null;
    const summary = participantSummary[participantId];
    return summary?.summonerName || summary?.championName || `Player ${participantId}`;
  };

  const formatAssistSuffix = (participantIds = []) => {
    const names = participantIds
      .map(getParticipantDisplayName)
      .filter(Boolean);
    if (!names.length) return '';
    if (names.length === 1) {
      return ` (assisted by ${names[0]})`;
    }
    return ` (assisted by ${names.join(', ')})`;
  };

  const formatOpenCardSummary = (params = {}) => {
    const { cardType, data = {}, index } = params;
    if (!cardType) {
      return ensureSentence(params.description || 'Opened the card');
    }

    const time = getTimestampFromData(data, data.frameIndex, params.minutes);
    const timeText = time ? ` at ${time}` : '';
    const assistSuffix = formatAssistSuffix(data.assistingParticipantIds);

    switch (cardType) {
      case 'kill': {
        const killLabel = index !== undefined && index !== null ? `Kill #${index + 1}` : 'Kill';
        const killerName = getParticipantDisplayName(data.killerId) || data.killerName || 'Unknown killer';
        const victimName = getParticipantDisplayName(data.victimId) || data.victimName || 'their target';
        let summary = `${killLabel}${timeText} — ${killerName} eliminated ${victimName}${assistSuffix}`;
        if (data.bounty) {
          summary += ` (${data.bounty}g bounty)`;
        }
        return ensureSentence(summary);
      }
      case 'dragon': {
        const dragonType = formatLabel(data.monsterSubType || data.dragonType) || 'Dragon';
        const dragonLabel = index !== undefined && index !== null
          ? `Dragon #${index + 1}${dragonType ? ` (${dragonType})` : ''}`
          : dragonType;
        const killerName = getParticipantDisplayName(data.killerId) || getTeamName(data.teamId) || 'their team';
        const summary = `${dragonLabel}${timeText} secured by ${killerName}${assistSuffix}`;
        return ensureSentence(summary);
      }
      case 'baron': {
        const killerName = getParticipantDisplayName(data.killerId) || getTeamName(data.teamId) || 'their team';
        const summary = `Baron Nashor${timeText} secured by ${killerName}${assistSuffix}`;
        return ensureSentence(summary);
      }
      case 'herald': {
        const killerName = getParticipantDisplayName(data.killerId) || getTeamName(data.teamId) || 'their team';
        const summary = `Rift Herald${timeText} secured by ${killerName}${assistSuffix}`;
        return ensureSentence(summary);
      }
      case 'tower': {
        const laneLabel = formatLabel(data.laneType) || 'Tower';
        const killerName = getParticipantDisplayName(data.killerId) || getTeamName(data.teamId) || 'their team';
        const summary = `${laneLabel} tower${timeText} destroyed by ${killerName}${assistSuffix}`;
        return ensureSentence(summary);
      }
      case 'player': {
        const name = data.summonerName || getParticipantDisplayName(data.id) || 'that player';
        return ensureSentence(`Opened player card for ${name}`);
      }
      case 'frame_events': {
        const frameIndex = params.frameIndex ?? data.frameIndex;
        const frameLabel = frameIndex !== undefined && frameIndex !== null ? `frame ${frameIndex}` : 'this moment';
        return ensureSentence(`Opened frame events for ${frameLabel}`);
      }
      default:
        return ensureSentence(`Opened the ${cardType} card`);
    }
  };

  const formatActionSummary = (action) => {
    if (!action) return '';

    const wrapResult = (text) => text ? `**Result:** ${ensureSentence(text)}` : '';

    switch (action.type) {
      case 'multi_action': {
        const subSummaries = (action.actions || [])
          .map(formatActionSummary)
          .filter(Boolean)
          .map(summary => summary.startsWith('**Result:**') ? summary.replace('**Result:**', '').trim() : summary)
          .map(item => item.startsWith('- ') ? item : `- ${item}`);
        if (subSummaries.length) {
          const uniqueSummaries = Array.from(new Set(subSummaries));
          return ['**Result:**', ...uniqueSummaries].join('\n');
        }
        return '**Result:** Completed the requested action.';
      }
      case 'navigate_timeline': {
        const { frameIndex, minutes } = action.params || {};
        const time = minutes !== undefined && minutes !== null
          ? formatMinutes(minutes)
          : frameIndex !== undefined && frameIndex !== null
            ? formatMinutes(frameIndex)
            : null;
        return wrapResult(time ? `Jumped to ${time} on the timeline` : 'Jumped on the timeline');
      }
      case 'toggle_event': {
        const eventType = action.params?.eventType;
        const labelMap = {
          kills: 'kill markers on the map',
          objectives: 'objective markers on the map',
          wards: 'ward markers on the map',
          items: 'item markers on the map'
        };
        const label = labelMap[eventType] || `${formatLabel(eventType) || 'selected'} markers`;
        const verb = action.params?.enabled === false ? 'Disabled' : 'Enabled';
        return wrapResult(`${verb} ${label}`);
      }
      case 'toggle_map_filter': {
        const filter = action.params?.filter;
        const filterLabels = {
          my_team: 'your team',
          enemy_team: 'the enemy team',
          blue_team: 'the blue team',
          red_team: 'the red team',
          all: 'all players'
        };
        const label = filterLabels[filter] || filter || 'selected players';
        return wrapResult(`Showing ${label} on the map`);
      }
      case 'open_card':
        return wrapResult(formatOpenCardSummary(action.params));
      case 'display_players':
        return wrapResult('Shared the player list you asked for');
      case 'display_event_timeline': {
        const eventType = action.params?.eventType;
        const label = eventType ? `${formatLabel(eventType)} timeline` : 'event timeline';
        return wrapResult(`Shared the ${label}`);
      }
      case 'select_player': {
        const participantId = action.params?.participantId;
        const name = getParticipantDisplayName(participantId);
        if (name) {
          return wrapResult(`Focused on ${name}`);
        }
        return wrapResult('Focused on the selected player');
      }
      default:
        return wrapResult('Completed the requested action');
    }
  };

  const executeAction = (action, { suppressConclusion = false } = {}) => {
    if (action.type === 'multi_action') {
      // Execute multiple actions in sequence
      action.actions.forEach(subAction => {
        executeAction(subAction, { suppressConclusion: true });
      });
      if (!suppressConclusion) {
        concludeAction(action);
      }
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

    if (!suppressConclusion) {
      concludeAction(action);
    }
  };

  const concludeAction = (action) => {
    if (!action) return;

    const summary = formatActionSummary(action) || ensureSentence('Completed the requested action');

    if (summary) {
      postActionMessage(summary);
    }
  };

  return (
    <div ref={sidebarRef} className="relative w-[320px] bg-surface h-full overflow-auto" style={{ overflow: isChatOpen ? 'hidden' : 'auto' }}>
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
        
        {/* Add Player Button */}
        {displayedCards.length < 10 && getAvailablePlayers().length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowAddCardMenu(!showAddCardMenu)}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white rounded-lg p-3 flex items-center justify-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-sm font-medium">Add Player Card</span>
            </button>
            
            {/* Add Player Menu */}
            {showAddCardMenu && (
              <div className="mt-2 bg-gray-800 rounded-lg border border-gray-700 max-h-64 overflow-y-auto">
                {getAvailablePlayers().map(participantId => {
                  const player = participantFrames[participantId];
                  const summary = participantSummary[participantId] || {};
                  const championName = summary.championName;
                  const championImageUrl = championName ? getChampionImageUrl(championName) : null;
                  const summonerName = summary.summonerName || `Player ${participantId}`;
                  const teamName = participantId <= 5 ? 'Blue Team' : 'Red Team';
                  const teamPillClasses = participantId <= 5 ? 'bg-team-blue/20 text-team-blue border-team-blue/40' : 'bg-enemy-red/20 text-enemy-red border-enemy-red/40';
                  
                  return (
                    <button
                      key={participantId}
                      onClick={() => addPlayerCard(participantId)}
                      className="w-full text-left p-3 hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-b-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-600 bg-gray-700 flex-shrink-0">
                          {championImageUrl ? (
                            <img
                              src={championImageUrl}
                              alt={championName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-white font-bold text-xs">P{participantId}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="text-white text-sm font-medium truncate">
                              {championName || `Player ${participantId}`}
                            </div>
                            <span className={`px-1.5 py-0.5 rounded-full border text-[9px] uppercase tracking-wide font-medium ${teamPillClasses}`}>
                              {teamName}
                            </span>
                          </div>
                          <div className="text-gray-400 text-xs truncate">
                            {summonerName}
                          </div>
                        </div>
                        <div className="text-gray-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Display Player Cards */}
        {displayedCards.map(participantId => (
          <PlayerStatsCard 
            key={participantId}
            participantId={participantId} 
            isPinned={pinnedPlayers.includes(participantId)}
          />
        ))}
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
        <div 
          className="fixed right-0 z-50 bg-[#0d0d0d] flex flex-col shadow-2xl"
          style={{ 
            width: `${chatWidth}px`,
            top: `${sidebarBounds.top}px`,
            height: `${sidebarBounds.height}px`
          }}
        >
            {/* Resize Handle */}
            <div
              onMouseDown={handleMouseDown}
              className={`absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-primary-gold/30 transition-colors group ${isResizing ? 'bg-primary-gold/50' : 'bg-transparent'}`}
              style={{ zIndex: 60 }}
            >
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-16 bg-primary-gold/40 rounded-r group-hover:bg-primary-gold/60 group-hover:h-24 transition-all" />
            </div>

            {/* Top bar */}
            <div className="px-4 py-3.5 border-b border-white/[0.08] flex items-center justify-between bg-[#0d0d0d]">
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

      {/* Floating Chat Button - Only show when chat is closed */}
      {!isChatOpen && (
        <button
          type="button"
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-20 flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-primary-gold text-bg-dark shadow-lg transition-transform hover:scale-105"
          aria-label="Open Rift Copilot chat"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default RightSidebar;
