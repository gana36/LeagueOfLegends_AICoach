import React, { useState } from 'react';
import { StrengthsWeaknessesPanel } from './StrengthsWeaknessesPanel';
import { ProgressVisualization } from './ProgressVisualization';
import { SocialComparison } from './SocialComparison';
import { ShareableMoments } from './ShareableMoments';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './dashboard/ui/tabs';

const SNEAKY_PUUID = 'BQD2G_OKDrt_YjF9A5qJvfzClUx0Fe2fPzQm8cqLQWnATfQmzBta-JAW3ZOGABb07RmYrpJ_AXr-cg';

export const FeaturesPage: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState('strengths');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 overflow-auto">
      <div className="relative">
        {/* Background glow effects */}
        <div className="fixed top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

        {/* Main Content */}
        <div className="relative z-10 p-6">
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-white mb-2">Player Insights & Analytics</h1>
            <p className="text-text-secondary">
              Comprehensive analysis of your League of Legends performance
            </p>
          </div>

          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-gray-900 border border-gray-700">
              <TabsTrigger value="strengths" className="data-[state=active]:bg-primary-gold data-[state=active]:text-bg-dark">
                Strengths & Weaknesses
              </TabsTrigger>
              <TabsTrigger value="progress" className="data-[state=active]:bg-primary-gold data-[state=active]:text-bg-dark">
                Progress
              </TabsTrigger>
              <TabsTrigger value="social" className="data-[state=active]:bg-primary-gold data-[state=active]:text-bg-dark">
                Social Comparison
              </TabsTrigger>
              <TabsTrigger value="shareable" className="data-[state=active]:bg-primary-gold data-[state=active]:text-bg-dark">
                Shareable Moments
              </TabsTrigger>
            </TabsList>

            <TabsContent value="strengths" className="mt-6">
              <StrengthsWeaknessesPanel puuid={SNEAKY_PUUID} />
            </TabsContent>

            <TabsContent value="progress" className="mt-6">
              <ProgressVisualization puuid={SNEAKY_PUUID} />
            </TabsContent>

            <TabsContent value="social" className="mt-6">
              <SocialComparison />
            </TabsContent>

            <TabsContent value="shareable" className="mt-6">
              <ShareableMoments puuid={SNEAKY_PUUID} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

