import React, { useState, useEffect } from 'react';
import { getChampionImageUrl } from '../utils/championImages';
import { API_URL } from '../config';
import './MatchSelector.css';

const MatchSelector = ({ puuid, onMatchSelect, currentMatchId, onDropdownChange, forceClose }) => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (puuid) {
      fetchMatches();
    }
  }, [puuid]);

  // Close dropdown when parent requests it
  useEffect(() => {
    if (forceClose && isOpen) {
      setIsOpen(false);
      if (onDropdownChange) onDropdownChange(false);
    }
  }, [forceClose, isOpen, onDropdownChange]);

  const fetchMatches = async () => {
    if (!puuid) {
      console.warn('No PUUID provided to MatchSelector');
      setError('No player selected');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Check cache first
      const cacheKey = `matches_${puuid}`;
      const cachedData = localStorage.getItem(cacheKey);
      const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
      
      // Cache valid for 5 minutes
      const CACHE_DURATION = 5 * 60 * 1000;
      const now = Date.now();
      
      if (cachedData && cacheTimestamp) {
        const age = now - parseInt(cacheTimestamp);
        if (age < CACHE_DURATION) {
          console.log('Using cached matches (age:', Math.round(age / 1000), 'seconds)');
          const cached = JSON.parse(cachedData);
          setMatches(cached);
          
          // Auto-select first match if none selected
          if (cached.length > 0 && !currentMatchId) {
            console.log('Auto-selecting first match:', cached[0].matchId);
            onMatchSelect(cached[0]);
          }
          
          setLoading(false);
          return;
        } else {
          console.log('Cache expired (age:', Math.round(age / 1000), 'seconds), fetching fresh data');
        }
      }

      console.log('Fetching matches for PUUID:', puuid);
      const url = `${API_URL}/api/player/matches/${puuid}`;
      console.log('Fetching from:', url);

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response not OK:', response.status, errorText);
        throw new Error(`Failed to fetch matches: ${response.status}`);
      }

      const data = await response.json();
      console.log('Matches fetched:', data);

      if (data.success) {
        setMatches(data.matches);
        
        // Cache the matches
        localStorage.setItem(cacheKey, JSON.stringify(data.matches));
        localStorage.setItem(`${cacheKey}_timestamp`, now.toString());
        console.log('Matches cached for 5 minutes');

        // Auto-select first match if none selected
        if (data.matches.length > 0 && !currentMatchId) {
          console.log('Auto-selecting first match:', data.matches[0].matchId);
          onMatchSelect(data.matches[0]);
        }
      } else {
        throw new Error('Failed to load matches');
      }
    } catch (err) {
      console.error('Error fetching matches:', err);
      setError(`Failed to load matches: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMatchClick = (match) => {
    onMatchSelect(match);
    setIsOpen(false);
    if (onDropdownChange) onDropdownChange(false);
  };

  const handleRefresh = (e) => {
    e.stopPropagation();
    // Clear cache and refetch
    const cacheKey = `matches_${puuid}`;
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(`${cacheKey}_timestamp`);
    console.log('Cache cleared, refreshing matches...');
    fetchMatches();
  };

  if (loading) {
    return <div className="match-selector loading">Loading matches...</div>;
  }

  if (error) {
    return <div className="match-selector error">Error: {error}</div>;
  }

  if (matches.length === 0) {
    return <div className="match-selector empty">No matches found</div>;
  }

  const currentMatch = matches.find(m => m.matchId === currentMatchId) || matches[0];

  return (
    <div className="match-selector">
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          className="match-selector-button"
          onClick={() => {
            const newState = !isOpen;
            setIsOpen(newState);
            if (onDropdownChange) onDropdownChange(newState);
          }}
          style={{ flex: 1 }}
        >
          <div className="current-match-display">
            <span className="champion-name">{currentMatch?.championName}</span>
            <span className={`result ${currentMatch?.win ? 'win' : 'loss'}`}>
              {currentMatch?.win ? 'Victory' : 'Defeat'}
            </span>
            <span className="kda">
              {currentMatch?.kills}/{currentMatch?.deaths}/{currentMatch?.assists}
            </span>
            <span className="match-id">{currentMatch?.matchId}</span>
          </div>
          <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
        </button>
        <button
          onClick={handleRefresh}
          title="Refresh matches"
          style={{
            padding: '8px 12px',
            background: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '4px',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '14px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          Refresh
        </button>
      </div>

      {isOpen && (
        <>
          <div className="match-selector-overlay" onClick={() => {
            setIsOpen(false);
            if (onDropdownChange) onDropdownChange(false);
          }} />
          <div className="match-selector-dropdown">
            <div className="match-list-header">
              <h3>Select Match ({matches.length} available)</h3>
            </div>
            <div className="match-list">
              {matches.map((match) => (
                <div
                  key={match.matchId}
                  className={`match-item ${match.matchId === currentMatchId ? 'selected' : ''}`}
                  onClick={() => handleMatchClick(match)}
                >
                  <div className="match-champion">
                    <img
                      src={getChampionImageUrl(match.championName)}
                      alt={match.championName}
                      className="champion-icon"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <span className="champion-name">{match.championName}</span>
                  </div>

                  <div className="match-info">
                    <span className={`match-result ${match.win ? 'win' : 'loss'}`}>
                      {match.win ? 'W' : 'L'}
                    </span>
                    <span className="match-kda">
                      {match.kills}/{match.deaths}/{match.assists}
                    </span>
                    <span className="match-role">{match.role || 'N/A'}</span>
                  </div>

                  <div className="match-meta">
                    <span className="match-duration">
                      {formatDuration(match.gameDuration)}
                    </span>
                    <span className="match-date">
                      {formatDate(match.gameCreation)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MatchSelector;
