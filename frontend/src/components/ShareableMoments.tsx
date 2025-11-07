import React, { useState, useEffect } from 'react';
import { Card } from './dashboard/ui/card';
import { Button } from './dashboard/ui/button';

const API_BASE_URL = 'http://localhost:8000';
const SNEAKY_PUUID = 'BQD2G_OKDrt_YjF9A5qJvfzClUx0Fe2fPzQm8cqLQWnATfQmzBta-JAW3ZOGABb07RmYrpJ_AXr-cg';

interface ShareableMomentsProps {
  puuid?: string;
}

export const ShareableMoments: React.FC<ShareableMomentsProps> = ({ puuid = SNEAKY_PUUID }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchShareableMoments();
  }, [puuid]);

  const fetchShareableMoments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/social/shareable-moments`, {
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

  const handleShare = (card: any) => {
    const text = `${card.title}\n${card.subtitle}\n${card.stat}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&hashtags=LeagueOfLegends,RiftRewind`;
    window.open(url, '_blank');
  };

  const handleCopyImage = async (card: any) => {
    // In a real implementation, you would generate an image here
    // For now, we'll copy the text to clipboard
    const text = `${card.title}\n${card.subtitle}\n${card.stat}`;
    await navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-gold mx-auto mb-4"></div>
          <p className="text-text-secondary">Generating shareable moments...</p>
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

  const shareableCards = data.shareable_cards || [];

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Shareable Moments</h2>
        <p className="text-text-secondary mb-6">
          Show off your achievements! Share these moments on social media.
        </p>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {shareableCards.map((card: any, idx: number) => (
          <Card
            key={idx}
            className="p-6 relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${card.color}15 0%, ${card.color}05 100%)`,
              borderColor: `${card.color}50`
            }}
          >
            <div className="absolute top-4 right-4 text-4xl">{card.emoji}</div>
            <div className="mb-4">
              <h3 className="text-xl font-bold text-white mb-2">{card.title}</h3>
              <p className="text-text-secondary text-sm mb-3">{card.subtitle}</p>
              <div className="text-3xl font-bold" style={{ color: card.color }}>
                {card.stat}
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                onClick={() => handleShare(card)}
                className="flex-1 bg-primary-gold text-bg-dark hover:bg-yellow-500 text-sm"
              >
                Share on X
              </Button>
              <Button
                onClick={() => handleCopyImage(card)}
                variant="outline"
                className="flex-1 border-gray-700 text-white hover:bg-gray-800 text-sm"
              >
                Copy
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {shareableCards.length === 0 && (
        <Card className="p-6">
          <div className="text-center py-8 text-text-secondary">
            <p>No shareable moments found. Play more games to generate moments!</p>
          </div>
        </Card>
      )}
    </div>
  );
};

