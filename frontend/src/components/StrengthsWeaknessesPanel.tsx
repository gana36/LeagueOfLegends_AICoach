import React, { useState, useEffect } from 'react';
import { Card } from './dashboard/ui/card';
import { Badge } from './dashboard/ui/badge';
import { Progress } from './dashboard/ui/progress';

const API_BASE_URL = 'http://localhost:8000';
const SNEAKY_PUUID = 'BQD2G_OKDrt_YjF9A5qJvfzClUx0Fe2fPzQm8cqLQWnATfQmzBta-JAW3ZOGABb07RmYrpJ_AXr-cg';

interface StrengthsWeaknessesPanelProps {
  puuid?: string;
}

export const StrengthsWeaknessesPanel: React.FC<StrengthsWeaknessesPanelProps> = ({ puuid = SNEAKY_PUUID }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStrengthsWeaknesses();
  }, [puuid]);

  const fetchStrengthsWeaknesses = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/analysis/strengths-weaknesses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ puuid, match_count: 50 })
      });
      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-gold mx-auto mb-4"></div>
          <p className="text-text-secondary">Analyzing strengths and weaknesses...</p>
        </div>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-6">
        <div className="text-center py-8 text-red-500">
          <p>Error loading data: {error || 'No data available'}</p>
        </div>
      </Card>
    );
  }

  const { strengths, weaknesses, improvement_tips, detailed_metrics, stats } = data;

  return (
    <div className="space-y-6">
      {/* Strengths Section */}
      <Card className="p-6 bg-gradient-to-br from-green-900/20 to-green-800/10 border-green-700/50">
        <h2 className="text-2xl font-bold text-green-400 mb-4 flex items-center gap-2">
          <span>💪</span> Persistent Strengths
        </h2>
        <div className="space-y-3">
          {strengths?.map((strength: string, idx: number) => (
            <div key={idx} className="flex items-start gap-3 p-3 bg-green-900/20 rounded-lg">
              <Badge className="bg-green-600 text-white">✓</Badge>
              <p className="text-white flex-1">{strength}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Weaknesses Section */}
      <Card className="p-6 bg-gradient-to-br from-red-900/20 to-red-800/10 border-red-700/50">
        <h2 className="text-2xl font-bold text-red-400 mb-4 flex items-center gap-2">
          <span>⚠️</span> Areas for Improvement
        </h2>
        <div className="space-y-3">
          {weaknesses?.map((weakness: string, idx: number) => (
            <div key={idx} className="flex items-start gap-3 p-3 bg-red-900/20 rounded-lg">
              <Badge className="bg-red-600 text-white">!</Badge>
              <p className="text-white flex-1">{weakness}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Detailed Metrics */}
      {detailed_metrics && (
        <Card className="p-6">
          <h2 className="text-xl font-bold text-white mb-4">Performance Breakdown</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Early Game */}
            {detailed_metrics.early_game && (
              <div className="p-4 bg-gray-800 rounded-lg">
                <h3 className="text-sm font-semibold text-text-secondary mb-2">Early Game (0-15 min)</h3>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-text-secondary">Avg Kills</span>
                      <span className="text-white">{detailed_metrics.early_game.avg_kills?.toFixed(1) || 0}</span>
                    </div>
                    <Progress value={(detailed_metrics.early_game.avg_kills || 0) * 10} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-text-secondary">Avg Deaths</span>
                      <span className="text-white">{detailed_metrics.early_game.avg_deaths?.toFixed(1) || 0}</span>
                    </div>
                    <Progress value={(detailed_metrics.early_game.avg_deaths || 0) * 10} className="h-2" />
                  </div>
                </div>
              </div>
            )}

            {/* Mid Game */}
            {detailed_metrics.mid_game && (
              <div className="p-4 bg-gray-800 rounded-lg">
                <h3 className="text-sm font-semibold text-text-secondary mb-2">Mid Game (15-30 min)</h3>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-text-secondary">Avg Kills</span>
                      <span className="text-white">{detailed_metrics.mid_game.avg_kills?.toFixed(1) || 0}</span>
                    </div>
                    <Progress value={(detailed_metrics.mid_game.avg_kills || 0) * 10} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-text-secondary">Avg Assists</span>
                      <span className="text-white">{detailed_metrics.mid_game.avg_assists?.toFixed(1) || 0}</span>
                    </div>
                    <Progress value={(detailed_metrics.mid_game.avg_assists || 0) * 5} className="h-2" />
                  </div>
                </div>
              </div>
            )}

            {/* Consistency */}
            {detailed_metrics.consistency && (
              <div className="p-4 bg-gray-800 rounded-lg">
                <h3 className="text-sm font-semibold text-text-secondary mb-2">Consistency</h3>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-text-secondary">Max Win Streak</span>
                      <span className="text-green-400">{detailed_metrics.consistency.max_win_streak || 0}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-text-secondary">Max Loss Streak</span>
                      <span className="text-red-400">{detailed_metrics.consistency.max_loss_streak || 0}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-text-secondary">KDA Variance</span>
                      <span className="text-white">{detailed_metrics.consistency.kda_variance?.toFixed(2) || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Improvement Tips */}
      {improvement_tips && improvement_tips.length > 0 && (
        <Card className="p-6 bg-gradient-to-br from-blue-900/20 to-blue-800/10 border-blue-700/50">
          <h2 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
            <span>💡</span> Improvement Tips
          </h2>
          <div className="space-y-2">
            {improvement_tips.map((tip: string, idx: number) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-blue-900/20 rounded-lg">
                <span className="text-blue-400 text-lg">→</span>
                <p className="text-white flex-1">{tip}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

