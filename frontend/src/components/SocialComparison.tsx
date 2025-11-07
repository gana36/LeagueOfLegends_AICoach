import React, { useState } from 'react';
import { Card } from './dashboard/ui/card';
import { Badge } from './dashboard/ui/badge';
import { Button } from './dashboard/ui/button';

const API_BASE_URL = 'http://localhost:8000';

interface SocialComparisonProps {
  puuid1?: string;
  puuid2?: string;
}

export const SocialComparison: React.FC<SocialComparisonProps> = ({ puuid1, puuid2 }) => {
  const [player1Id, setPlayer1Id] = useState(puuid1 || '');
  const [player2Id, setPlayer2Id] = useState(puuid2 || '');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = async () => {
    if (!player1Id || !player2Id) {
      setError('Please enter both player PUUIDs');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/social/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          puuid1: player1Id,
          puuid2: player2Id,
          match_count: 50
        })
      });
      if (!response.ok) throw new Error('Failed to compare players');
      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatStat = (value: number, suffix: string = '') => {
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}${suffix}`;
  };

  const getStatColor = (value: number) => {
    return value > 0 ? 'text-green-400' : value < 0 ? 'text-red-400' : 'text-white';
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Player Comparison</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-text-secondary mb-2">Player 1 PUUID</label>
            <input
              type="text"
              value={player1Id}
              onChange={(e) => setPlayer1Id(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              placeholder="Enter PUUID..."
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-2">Player 2 PUUID</label>
            <input
              type="text"
              value={player2Id}
              onChange={(e) => setPlayer2Id(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              placeholder="Enter PUUID..."
            />
          </div>
        </div>

        <Button
          onClick={handleCompare}
          disabled={loading}
          className="w-full bg-primary-gold text-bg-dark hover:bg-yellow-500"
        >
          {loading ? 'Comparing...' : 'Compare Players'}
        </Button>

        {error && (
          <div className="mt-4 p-4 bg-red-900/20 border border-red-700 rounded-lg text-red-400">
            {error}
          </div>
        )}
      </Card>

      {data && (
        <>
          {/* Compatibility Score */}
          <Card className="p-6 bg-gradient-to-br from-purple-900/20 to-purple-800/10 border-purple-700/50">
            <h3 className="text-xl font-bold text-white mb-4">Playstyle Compatibility</h3>
            <div className="text-center mb-4">
              <div className="text-6xl font-bold text-purple-400 mb-2">
                {data.compatibility?.score || 0}%
              </div>
              <p className="text-text-secondary">{data.compatibility?.recommendation || ''}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="text-center p-3 bg-gray-800 rounded-lg">
                <div className="text-sm text-text-secondary mb-1">Role Compatible</div>
                <Badge className={data.compatibility?.role_compatible ? 'bg-green-600' : 'bg-red-600'}>
                  {data.compatibility?.role_compatible ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="text-center p-3 bg-gray-800 rounded-lg">
                <div className="text-sm text-text-secondary mb-1">Skill Level</div>
                <Badge className={data.compatibility?.skill_level_similar ? 'bg-green-600' : 'bg-yellow-600'}>
                  {data.compatibility?.skill_level_similar ? 'Similar' : 'Different'}
                </Badge>
              </div>
              <div className="text-center p-3 bg-gray-800 rounded-lg">
                <div className="text-sm text-text-secondary mb-1">Playstyle</div>
                <Badge className={data.compatibility?.playstyle_complementary ? 'bg-green-600' : 'bg-yellow-600'}>
                  {data.compatibility?.playstyle_complementary ? 'Complementary' : 'Similar'}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Comparison Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Player 1 Stats */}
            <Card className="p-6">
              <h3 className="text-xl font-bold text-white mb-4">Player 1 Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Win Rate</span>
                  <span className="text-white font-semibold">{data.player1?.win_rate?.toFixed(1) || 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Avg KDA</span>
                  <span className="text-white font-semibold">{data.player1?.avg_kda?.toFixed(2) || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Damage/Min</span>
                  <span className="text-white font-semibold">{data.player1?.damage_per_min?.toFixed(0) || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">CS/Min</span>
                  <span className="text-white font-semibold">{data.player1?.cs_per_min?.toFixed(1) || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Main Role</span>
                  <Badge>{data.player1?.main_role || 'N/A'}</Badge>
                </div>
              </div>
            </Card>

            {/* Player 2 Stats */}
            <Card className="p-6">
              <h3 className="text-xl font-bold text-white mb-4">Player 2 Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Win Rate</span>
                  <span className="text-white font-semibold">{data.player2?.win_rate?.toFixed(1) || 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Avg KDA</span>
                  <span className="text-white font-semibold">{data.player2?.avg_kda?.toFixed(2) || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Damage/Min</span>
                  <span className="text-white font-semibold">{data.player2?.damage_per_min?.toFixed(0) || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">CS/Min</span>
                  <span className="text-white font-semibold">{data.player2?.cs_per_min?.toFixed(1) || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Main Role</span>
                  <Badge>{data.player2?.main_role || 'N/A'}</Badge>
                </div>
              </div>
            </Card>
          </div>

          {/* Differences */}
          <Card className="p-6">
            <h3 className="text-xl font-bold text-white mb-4">Comparison (Player 1 vs Player 2)</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                <span className="text-text-secondary">Win Rate Difference</span>
                <span className={`font-semibold ${getStatColor(data.comparison?.win_rate_diff || 0)}`}>
                  {formatStat(data.comparison?.win_rate_diff || 0, '%')}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                <span className="text-text-secondary">KDA Difference</span>
                <span className={`font-semibold ${getStatColor(data.comparison?.kda_diff || 0)}`}>
                  {formatStat(data.comparison?.kda_diff || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                <span className="text-text-secondary">Damage/Min Difference</span>
                <span className={`font-semibold ${getStatColor(data.comparison?.damage_diff || 0)}`}>
                  {formatStat(data.comparison?.damage_diff || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                <span className="text-text-secondary">CS/Min Difference</span>
                <span className={`font-semibold ${getStatColor(data.comparison?.cs_diff || 0)}`}>
                  {formatStat(data.comparison?.cs_diff || 0)}
                </span>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

