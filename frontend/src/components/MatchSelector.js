import React, { useState, useEffect } from 'react';
import { getChampionImageUrl } from '../utils/championImages';
import './MatchSelector.css';

const MatchSelector = ({ puuid, onMatchSelect, currentMatchId }) => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (puuid) {
      fetchMatches();
    }
  }, [puuid]);

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

      console.log('Fetching matches for PUUID:', puuid);
      const url = `http://localhost:8000/api/player/matches/${puuid}`;
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
      <button
        className="match-selector-button"
        onClick={() => setIsOpen(!isOpen)}
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

      {isOpen && (
        <>
          <div className="match-selector-overlay" onClick={() => setIsOpen(false)} />
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
