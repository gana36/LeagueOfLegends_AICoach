import React, { useState } from 'react';
import './PlayerSearch.css';

interface PlayerSearchProps {
  onPlayerFound?: (playerData: any) => void;
}

const PlayerSearch: React.FC<PlayerSearchProps> = ({ onPlayerFound }) => {
  const [gameName, setGameName] = useState('');
  const [tagLine, setTagLine] = useState('');
  const [matchCount, setMatchCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [progress, setProgress] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!gameName || !tagLine) {
      setError('Please enter both game name and tag line');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setProgress('Searching for player...');

    try {
      // Step 1: Fetch and upload player data
      setProgress('Fetching data from Riot API...');
      const response = await fetch('http://localhost:8000/api/player/fetch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameName,
          tagLine,
          matchCount,
          saveLocal: true
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch player data');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to process player');
      }

      setProgress('Data uploaded successfully!');
      setSuccess(`✅ Successfully loaded ${gameName}#${tagLine}!`);

      // Step 2: Fetch the uploaded data from DynamoDB
      setProgress('Loading player data...');
      const puuid = result.data.puuid;

      const playerDataResponse = await fetch(`http://localhost:8000/api/player/data/${puuid}`);

      if (!playerDataResponse.ok) {
        throw new Error('Failed to load player data');
      }

      const playerData = await playerDataResponse.json();

      // Notify parent component
      if (onPlayerFound) {
        onPlayerFound({
          puuid,
          gameName,
          tagLine,
          ...playerData.data
        });
      }

      // Clear form
      setGameName('');
      setTagLine('');
      setProgress('');

    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setProgress('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="player-search-container">
      <div className="player-search-card">
        <h2>Search Player</h2>
        <p className="subtitle">Enter player name to fetch and load their data</p>

        <form onSubmit={handleSearch} className="search-form">
          <div className="input-group">
            <label htmlFor="gameName">Game Name</label>
            <input
              id="gameName"
              type="text"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              placeholder="e.g., Sneaky"
              disabled={loading}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="tagLine">Tag Line</label>
            <input
              id="tagLine"
              type="text"
              value={tagLine}
              onChange={(e) => setTagLine(e.target.value)}
              placeholder="e.g., NA1"
              disabled={loading}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="matchCount">Number of Matches</label>
            <select
              id="matchCount"
              value={matchCount}
              onChange={(e) => setMatchCount(parseInt(e.target.value))}
              disabled={loading}
            >
              <option value={5}>Last 5 matches</option>
              <option value={10}>Last 10 matches</option>
              <option value={20}>Last 20 matches</option>
              <option value={50}>Last 50 matches</option>
            </select>
          </div>

          <button
            type="submit"
            className="search-button"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Search & Load Player'}
          </button>
        </form>

        {loading && progress && (
          <div className="progress-message">
            <div className="spinner"></div>
            <p>{progress}</p>
          </div>
        )}

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        {success && (
          <div className="success-message">
            <span className="success-icon">✅</span>
            {success}
          </div>
        )}

        <div className="info-box">
          <h3>What happens when you search?</h3>
          <ul>
            <li>✓ Fetches player data from Riot API</li>
            <li>✓ Saves data locally in organized folders</li>
            <li>✓ Uploads match summaries to AWS DynamoDB</li>
            <li>✓ Uploads timelines to MongoDB Atlas</li>
            <li>✓ Updates frontend with new data</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PlayerSearch;
