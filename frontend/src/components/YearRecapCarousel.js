import React, { useState, useEffect, useRef } from 'react';

const YearRecapCarousel = ({ cachedNarrativeData }) => {
  const [narrativeData, setNarrativeData] = useState(cachedNarrativeData || null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [direction, setDirection] = useState('next');
  const carouselRef = useRef(null);
  const [touchStartX, setTouchStartX] = useState(0);

  // Use cached data if provided
  useEffect(() => {
    if (cachedNarrativeData) {
      setNarrativeData(cachedNarrativeData);
    }
  }, [cachedNarrativeData]);

  const nextCard = () => {
    if (narrativeData && currentCardIndex < narrativeData.cards.length - 1) {
      setDirection('next');
      setCurrentCardIndex(prev => prev + 1);
    }
  };

  const prevCard = () => {
    if (currentCardIndex > 0) {
      setDirection('prev');
      setCurrentCardIndex(prev => prev - 1);
    }
  };

  const goToCard = (index) => {
    setDirection(index > currentCardIndex ? 'next' : 'prev');
    setCurrentCardIndex(index);
  };

  // Touch handlers for swipe
  const handleTouchStart = (e) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > 50) { // Minimum swipe distance
      if (diff > 0) {
        nextCard();
      } else {
        prevCard();
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') nextCard();
      if (e.key === 'ArrowLeft') prevCard();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentCardIndex, narrativeData]);

  if (!narrativeData || !narrativeData.cards) {
    return null;
  }

  const currentCard = narrativeData.cards[currentCardIndex];
  const progress = ((currentCardIndex + 1) / narrativeData.cards.length) * 100;

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      ref={carouselRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Dynamic Background */}
      <div className={`absolute inset-0 transition-all duration-1000 ${getThemeBackground(currentCard.theme)}`}>
        <HextechPattern />
        {/* Glowing orbs for atmosphere */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#C89B3C] rounded-full blur-[150px] opacity-10 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#0397AB] rounded-full blur-[150px] opacity-10 animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      {/* Progress Bar */}
      <div className="absolute top-0 left-0 right-0 z-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            {narrativeData.cards.map((card, index) => (
              <div
                key={index}
                className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden cursor-pointer hover:bg-white/30 transition-all group"
                onClick={() => goToCard(index)}
                title={`Card ${index + 1}: ${card.title || card.type}`}
              >
                <div
                  className={`h-full bg-white transition-all duration-500 group-hover:bg-yellow-300 ${
                    index <= currentCardIndex ? 'rounded-full' : ''
                  }`}
                  style={{
                    width: index < currentCardIndex ? '100%' :
                           index === currentCardIndex ? '100%' : '0%'
                  }}
                />
              </div>
            ))}
          </div>

          {/* Card Counter & Title */}
          <div className="text-white/80 text-sm mt-3 text-center font-medium">
            <span className="text-white">{currentCardIndex + 1}</span> / {narrativeData.cards.length}
            {currentCard.title && (
              <span className="ml-2 text-white/60">• {currentCard.title}</span>
            )}
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-20 md:px-8">
        <div
          key={currentCardIndex}
          className={`
            w-full max-w-3xl
            animate-fade-in
            ${direction === 'next' ? 'animate-slide-left' : 'animate-slide-right'}
          `}
        >
          <CardRenderer card={currentCard} />
        </div>
      </div>

      {/* Navigation Arrows - Side positioned */}
      <div className="absolute inset-y-0 left-0 right-0 z-50 flex items-center justify-between px-4 pointer-events-none">
        <button
          onClick={prevCard}
          disabled={currentCardIndex === 0}
          className={`
            pointer-events-auto w-12 h-12 rounded-full font-semibold transition-all backdrop-blur-sm
            ${currentCardIndex === 0
              ? 'bg-white/5 text-white/20 cursor-not-allowed'
              : 'bg-white/20 text-white hover:bg-white/30 hover:scale-110'
            }
          `}
          aria-label="Previous card"
        >
          <svg className="w-6 h-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={nextCard}
          disabled={currentCardIndex === narrativeData.cards.length - 1}
          className={`
            pointer-events-auto w-12 h-12 rounded-full font-semibold transition-all backdrop-blur-sm
            ${currentCardIndex === narrativeData.cards.length - 1
              ? 'bg-white/5 text-white/20 cursor-not-allowed'
              : 'bg-white/20 text-white hover:bg-white/30 hover:scale-110'
            }
          `}
          aria-label="Next card"
        >
          <svg className="w-6 h-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Swipe Hint - Only show on first card */}
      {currentCardIndex === 0 && (
        <div className="absolute bottom-8 left-0 right-0 text-center text-white/50 text-sm animate-pulse">
          <div className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            <span>Swipe or use arrow keys</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};

// League of Legends Theme backgrounds
const getThemeBackground = (theme) => {
  const themes = {
    // Dark blue with gold accents - League signature colors
    'gradient-purple': 'bg-gradient-to-br from-[#0a1428] via-[#0d1b2a] to-[#1b263b]',
    'gradient-red': 'bg-gradient-to-br from-[#1a0e0e] via-[#2d1515] to-[#1b263b]',
    'gradient-blue': 'bg-gradient-to-br from-[#0a1428] via-[#1e3a5f] to-[#0d1b2a]',
    'gradient-gold': 'bg-gradient-to-br from-[#2a1810] via-[#3d2817] to-[#1b263b]',
    'gradient-cyan': 'bg-gradient-to-br from-[#0a2a2a] via-[#0d1b2a] to-[#1b263b]',
    'gradient-green': 'bg-gradient-to-br from-[#0f1e0f] via-[#1b2a1b] to-[#0d1b2a]',
    'gradient-orange': 'bg-gradient-to-br from-[#2a1510] via-[#1b263b] to-[#0d1b2a]',
    'gradient-rainbow': 'bg-gradient-to-br from-[#1a0e2e] via-[#0d1b2a] to-[#2a1810]'
  };
  return themes[theme] || themes['gradient-purple'];
};

// Hextech pattern overlay component
const HextechPattern = () => (
  <div className="absolute inset-0 opacity-5 pointer-events-none">
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="hextech" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
          <path d="M50 0 L93.3 25 L93.3 75 L50 100 L6.7 75 L6.7 25 Z" fill="none" stroke="currentColor" strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hextech)" />
    </svg>
  </div>
);

// Card Renderer - renders different card types
const CardRenderer = ({ card }) => {
  switch (card.type) {
    case 'hero':
      return <HeroCard card={card} />;
    case 'stats':
      return <StatsCard card={card} />;
    case 'champion_showcase':
      return <ChampionShowcaseCard card={card} />;
    case 'achievements':
      return <AchievementsCard card={card} />;
    case 'time_stats':
      return <TimeStatsCard card={card} />;
    case 'support_stats':
      return <SupportStatsCard card={card} />;
    case 'highlight':
      return <HighlightCard card={card} />;
    case 'narrative':
      return <NarrativeCard card={card} />;
    case 'finale':
      return <FinaleCard card={card} />;
    default:
      return <div className="text-white">Unknown card type</div>;
  }
};

// Hero Card (Opening) - League themed
const HeroCard = ({ card }) => (
  <div className="text-center text-white space-y-6 animate-fade-in-up relative">
    {/* League-style corner accents */}
    <div className="absolute top-0 left-0 w-24 h-24 border-l-4 border-t-4 border-[#C89B3C] opacity-50"></div>
    <div className="absolute top-0 right-0 w-24 h-24 border-r-4 border-t-4 border-[#C89B3C] opacity-50"></div>
    <div className="absolute bottom-0 left-0 w-24 h-24 border-l-4 border-b-4 border-[#C89B3C] opacity-50"></div>
    <div className="absolute bottom-0 right-0 w-24 h-24 border-r-4 border-b-4 border-[#C89B3C] opacity-50"></div>

    <div className="space-y-4 relative z-10">
      <div className="inline-block px-6 py-2 bg-[#C89B3C]/20 border border-[#C89B3C]/50 rounded-sm mb-2">
        <span className="text-[#C89B3C] text-sm font-bold tracking-[0.2em] uppercase">Victory</span>
      </div>
      <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-tight tracking-tight text-shadow-lg uppercase" style={{textShadow: '0 0 20px rgba(200, 155, 60, 0.5)'}}>
        {card.title}
      </h1>
      <p className="text-xl sm:text-2xl md:text-3xl text-[#C89B3C] font-bold tracking-widest uppercase">
        {card.subtitle}
      </p>
    </div>

    <div className="mt-8 relative z-10">
      <div className="relative inline-block group">
        {/* Hexagonal border effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-[#C89B3C] via-[#0397AB] to-[#C89B3C] opacity-75 blur-sm group-hover:opacity-100 transition-opacity"></div>

        <div className="relative bg-gradient-to-b from-[#0a1428] to-[#1b263b] rounded-lg p-8 md:p-10 border-2 border-[#C89B3C] shadow-2xl">
          <div className="text-5xl md:text-6xl mb-3 drop-shadow-[0_0_10px_rgba(200,155,60,0.5)]">{card.primary_stat.icon}</div>
          <div className="text-5xl md:text-6xl font-black mb-2 text-[#C89B3C]" style={{textShadow: '0 0 20px rgba(200, 155, 60, 0.8)'}}>{card.primary_stat.value}</div>
          <div className="text-lg md:text-xl text-white/90 font-bold tracking-[0.1em] uppercase">
            {card.primary_stat.label}
          </div>

          {/* Decorative lines */}
          <div className="absolute top-4 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#C89B3C]/50 to-transparent"></div>
          <div className="absolute bottom-4 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#C89B3C]/50 to-transparent"></div>
        </div>
      </div>
    </div>

    {card.secondary_stats && (
      <div className="flex justify-center gap-8 md:gap-12 mt-8 relative z-10">
        {card.secondary_stats.map((stat, idx) => (
          <div key={idx} className="text-center group">
            <div className="text-3xl md:text-4xl font-black mb-1 text-[#C89B3C] group-hover:scale-110 transition-transform" style={{textShadow: '0 0 10px rgba(200, 155, 60, 0.5)'}}>{stat.value}</div>
            <div className="text-sm md:text-base text-white/80 font-bold uppercase tracking-wider">{stat.label}</div>
          </div>
        ))}
      </div>
    )}
  </div>
);

// Stats Card (Combat Stats) - League themed
const StatsCard = ({ card }) => (
  <div className="text-center text-white space-y-8 relative">
    <div className="relative z-10">
      <div className="inline-block px-6 py-2 bg-[#C89B3C]/20 border border-[#C89B3C]/50 rounded-sm mb-4">
        <span className="text-[#C89B3C] text-sm font-bold tracking-[0.2em] uppercase">Combat Stats</span>
      </div>
      <h2 className="text-4xl md:text-5xl font-black mb-12 uppercase tracking-wide" style={{textShadow: '0 0 20px rgba(200, 155, 60, 0.5)'}}>{card.title}</h2>
    </div>

    <div className="grid grid-cols-2 gap-4 md:gap-6 relative z-10">
      {card.stats.map((stat, idx) => (
        <div
          key={idx}
          className="relative group"
        >
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#C89B3C] to-[#0397AB] opacity-50 blur group-hover:opacity-75 transition-opacity"></div>
          <div className="relative bg-gradient-to-b from-[#0a1428] to-[#1b263b] rounded-lg p-6 md:p-8 border-2 border-[#C89B3C]/50 hover:border-[#C89B3C] transition-all">
            <div className="text-4xl md:text-5xl mb-4 drop-shadow-[0_0_10px_rgba(200,155,60,0.5)]">{stat.icon}</div>
            <div className="text-3xl md:text-4xl font-black mb-2 text-[#C89B3C]" style={{textShadow: '0 0 10px rgba(200, 155, 60, 0.5)'}}>{stat.value}</div>
            <div className="text-base md:text-lg text-white/90 font-bold uppercase tracking-wide">{stat.label}</div>

            {/* Decorative line */}
            <div className="absolute bottom-2 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#C89B3C]/30 to-transparent"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Champion Showcase Card - League themed
const ChampionShowcaseCard = ({ card }) => (
  <div className="text-center text-white space-y-8 relative">
    <div className="relative z-10">
      <div className="inline-block px-6 py-2 bg-[#C89B3C]/20 border border-[#C89B3C]/50 rounded-sm mb-4">
        <span className="text-[#C89B3C] text-sm font-bold tracking-[0.2em] uppercase">Champion Mastery</span>
      </div>
      <h2 className="text-4xl md:text-5xl font-black mb-8 uppercase tracking-wide" style={{textShadow: '0 0 20px rgba(200, 155, 60, 0.5)'}}>{card.title}</h2>
    </div>

    <div className="relative group z-10">
      <div className="absolute -inset-1 bg-gradient-to-r from-[#C89B3C] via-[#0397AB] to-[#C89B3C] opacity-75 blur group-hover:opacity-100 transition-opacity"></div>
      <div className="relative bg-gradient-to-b from-[#0a1428] to-[#1b263b] rounded-lg p-12 border-2 border-[#C89B3C]">
        <div className="text-6xl font-black mb-4 uppercase tracking-wide" style={{textShadow: '0 0 20px rgba(200, 155, 60, 0.5)'}}>{card.main_champion.name}</div>
        <div className="text-3xl text-[#C89B3C] mb-2 font-bold">{card.main_champion.games} games</div>
        <div className="text-xl text-white/70 font-semibold">{card.main_champion.percentage}% of your matches</div>

        {/* Decorative lines */}
        <div className="absolute top-4 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#C89B3C]/50 to-transparent"></div>
        <div className="absolute bottom-4 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#C89B3C]/50 to-transparent"></div>
      </div>
    </div>

    <div className="mt-8 space-y-4 relative z-10">
      <p className="text-[#C89B3C]/80 font-bold uppercase tracking-wider text-sm">Your Top Champions:</p>
      <div className="flex justify-center gap-6">
        {card.top_champions.slice(0, 3).map((champ, idx) => (
          <div key={idx} className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#C89B3C]/50 to-[#0397AB]/50 opacity-50 blur group-hover:opacity-75 transition-opacity"></div>
            <div className="relative bg-gradient-to-b from-[#0a1428] to-[#1b263b] rounded-lg p-4 border-2 border-[#C89B3C]/50 hover:border-[#C89B3C] transition-all">
              <div className="text-xl font-black uppercase">{champ.name}</div>
              <div className="text-sm text-[#C89B3C]/80 font-semibold">{champ.games} games</div>
            </div>
          </div>
        ))}
      </div>
    </div>

    <p className="text-white/60 mt-8 font-semibold uppercase text-sm tracking-wider relative z-10">
      Played {card.total_champions} different champions • Favorite role: {card.favorite_role}
    </p>
  </div>
);

// Achievements Card (Milestones) - League themed
const AchievementsCard = ({ card }) => (
  <div className="text-center text-white space-y-8 relative">
    <div className="relative z-10">
      <div className="inline-block px-6 py-2 bg-[#C89B3C]/20 border border-[#C89B3C]/50 rounded-sm mb-4">
        <span className="text-[#C89B3C] text-sm font-bold tracking-[0.2em] uppercase">Achievements</span>
      </div>
      <h2 className="text-4xl md:text-5xl font-black mb-2 uppercase tracking-wide" style={{textShadow: '0 0 20px rgba(200, 155, 60, 0.5)'}}>{card.title}</h2>
      <p className="text-lg text-[#C89B3C]/80 font-semibold">{card.subtitle}</p>
    </div>

    <div className="space-y-4 mt-12 relative z-10">
      {card.milestones.map((milestone, idx) => {
        const rarityColors = {
          'legendary': { border: 'border-[#FFD700]', glow: 'shadow-[0_0_20px_rgba(255,215,0,0.5)]', bg: 'bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/20' },
          'rare': { border: 'border-[#9D4EDD]', glow: 'shadow-[0_0_20px_rgba(157,78,221,0.5)]', bg: 'bg-gradient-to-r from-[#9D4EDD]/20 to-[#7209B7]/20' },
          'uncommon': { border: 'border-[#0397AB]', glow: 'shadow-[0_0_15px_rgba(3,151,171,0.4)]', bg: 'bg-gradient-to-r from-[#0397AB]/20 to-[#06283D]/20' },
          'common': { border: 'border-[#C89B3C]/50', glow: '', bg: 'bg-[#C89B3C]/10' }
        };
        const colors = rarityColors[milestone.rarity] || rarityColors['common'];

        return (
          <div
            key={idx}
            className="relative group"
          >
            <div className={`absolute -inset-1 ${colors.glow} ${colors.bg} blur opacity-50 group-hover:opacity-75 transition-opacity`}></div>
            <div className={`relative bg-gradient-to-b from-[#0a1428] to-[#1b263b] rounded-lg p-5 md:p-6 border-2 ${colors.border} transition-all hover:scale-[1.02]`}>
              <div className="flex items-center gap-4">
                <div className="text-4xl md:text-5xl drop-shadow-[0_0_10px_rgba(200,155,60,0.5)]">{milestone.icon}</div>
                <div className="text-left flex-1">
                  <div className="text-xl md:text-2xl font-black mb-1 uppercase tracking-wide" style={{textShadow: '0 0 10px rgba(200, 155, 60, 0.3)'}}>{milestone.title}</div>
                  <div className="text-base md:text-lg text-white/80 font-medium">{milestone.description}</div>
                  <div className={`inline-block mt-2 px-3 py-1 text-xs font-black uppercase tracking-wider rounded-sm ${colors.bg} ${colors.border} border`}>
                    {milestone.rarity}
                  </div>
                </div>
              </div>

              {/* Decorative corner accents */}
              <div className={`absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 ${colors.border}`}></div>
              <div className={`absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 ${colors.border}`}></div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

// Time Stats Card - League themed
const TimeStatsCard = ({ card }) => (
  <div className="text-center text-white space-y-8 relative">
    <div className="relative z-10">
      <div className="inline-block px-6 py-2 bg-[#C89B3C]/20 border border-[#C89B3C]/50 rounded-sm mb-4">
        <span className="text-[#C89B3C] text-sm font-bold tracking-[0.2em] uppercase">Time on the Rift</span>
      </div>
      <h2 className="text-4xl md:text-5xl font-black mb-12 uppercase tracking-wide" style={{textShadow: '0 0 20px rgba(200, 155, 60, 0.5)'}}>{card.title}</h2>
    </div>

    <div className="relative group z-10">
      <div className="absolute -inset-1 bg-gradient-to-r from-[#C89B3C] via-[#0397AB] to-[#C89B3C] opacity-75 blur group-hover:opacity-100 transition-opacity"></div>
      <div className="relative bg-gradient-to-b from-[#0a1428] to-[#1b263b] rounded-lg p-12 border-2 border-[#C89B3C]">
        <div className="text-7xl font-black mb-4 text-[#C89B3C]" style={{textShadow: '0 0 20px rgba(200, 155, 60, 0.8)'}}>{card.main_stat.value}</div>
        <div className="text-3xl text-white/90 mb-2 font-bold uppercase tracking-wide">{card.main_stat.label}</div>
        <div className="text-lg text-[#C89B3C]/80 font-semibold">{card.main_stat.sublabel}</div>

        {/* Decorative lines */}
        <div className="absolute top-4 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#C89B3C]/50 to-transparent"></div>
        <div className="absolute bottom-4 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#C89B3C]/50 to-transparent"></div>
      </div>
    </div>

    <div className="grid grid-cols-3 gap-4 mt-12 relative z-10">
      {card.details.map((detail, idx) => (
        <div key={idx} className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#C89B3C]/50 to-[#0397AB]/50 opacity-50 blur group-hover:opacity-75 transition-opacity"></div>
          <div className="relative bg-gradient-to-b from-[#0a1428] to-[#1b263b] rounded-lg p-6 border-2 border-[#C89B3C]/50 hover:border-[#C89B3C] transition-all">
            <div className="text-2xl font-black mb-1 text-[#C89B3C]">{detail.value}</div>
            <div className="text-sm text-white/80 font-semibold uppercase tracking-wide">{detail.label}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Support Stats Card (Vision) - League themed
const SupportStatsCard = ({ card }) => (
  <div className="text-center text-white space-y-8 relative">
    <div className="relative z-10">
      <div className="inline-block px-6 py-2 bg-[#C89B3C]/20 border border-[#C89B3C]/50 rounded-sm mb-4">
        <span className="text-[#C89B3C] text-sm font-bold tracking-[0.2em] uppercase">Vision Control</span>
      </div>
      <h2 className="text-4xl md:text-5xl font-black mb-12 uppercase tracking-wide" style={{textShadow: '0 0 20px rgba(200, 155, 60, 0.5)'}}>{card.title}</h2>
    </div>

    <div className="relative group z-10">
      <div className="absolute -inset-1 bg-gradient-to-r from-[#C89B3C] via-[#0397AB] to-[#C89B3C] opacity-75 blur group-hover:opacity-100 transition-opacity"></div>
      <div className="relative bg-gradient-to-b from-[#0a1428] to-[#1b263b] rounded-lg p-12 border-2 border-[#C89B3C]">
        <div className="text-6xl mb-4 drop-shadow-[0_0_15px_rgba(200,155,60,0.5)]">{card.main_stat.icon}</div>
        <div className="text-6xl font-black mb-2 text-[#C89B3C]" style={{textShadow: '0 0 20px rgba(200, 155, 60, 0.8)'}}>{card.main_stat.value}</div>
        <div className="text-2xl text-white/90 font-bold uppercase tracking-wide">{card.main_stat.label}</div>

        {/* Decorative lines */}
        <div className="absolute top-4 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#C89B3C]/50 to-transparent"></div>
        <div className="absolute bottom-4 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#C89B3C]/50 to-transparent"></div>
      </div>
    </div>

    <div className="space-y-6 mt-12 relative z-10">
      {card.secondary_stats.map((stat, idx) => (
        <div key={idx} className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#C89B3C]/50 to-[#0397AB]/50 opacity-50 blur group-hover:opacity-75 transition-opacity"></div>
          <div className="relative bg-gradient-to-b from-[#0a1428] to-[#1b263b] rounded-lg p-6 border-2 border-[#C89B3C]/50 hover:border-[#C89B3C] transition-all">
            <div className="text-3xl font-black mb-1 text-[#C89B3C]">{stat.value}</div>
            <div className="text-lg text-white/90 mb-1 font-bold uppercase tracking-wide">{stat.label}</div>
            <div className="text-sm text-[#C89B3C]/70 font-semibold">{stat.description}</div>

            {/* Decorative corner accent */}
            <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-[#C89B3C]/50"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Highlight Card (Best Month) - League themed
const HighlightCard = ({ card }) => (
  <div className="text-center text-white space-y-8 relative">
    <div className="relative z-10">
      <div className="inline-block px-6 py-2 bg-[#C89B3C]/20 border border-[#C89B3C]/50 rounded-sm mb-4">
        <span className="text-[#C89B3C] text-sm font-bold tracking-[0.2em] uppercase">Highlight</span>
      </div>
      <h2 className="text-4xl md:text-5xl font-black mb-4 uppercase tracking-wide" style={{textShadow: '0 0 20px rgba(200, 155, 60, 0.5)'}}>{card.title}</h2>
      <p className="text-3xl text-[#C89B3C] font-bold uppercase tracking-wider">{card.month}</p>
    </div>

    <div className="relative group mt-12 z-10">
      <div className="absolute -inset-1 bg-gradient-to-r from-[#C89B3C] via-[#0397AB] to-[#C89B3C] opacity-75 blur group-hover:opacity-100 transition-opacity"></div>
      <div className="relative bg-gradient-to-b from-[#0a1428] to-[#1b263b] rounded-lg p-12 border-2 border-[#C89B3C]">
        <p className="text-2xl text-white/90 mb-8 font-semibold">{card.description}</p>
        {card.stats && (
          <div className="grid grid-cols-2 gap-6">
            <div className="relative">
              <div className="text-4xl font-black text-[#C89B3C] mb-2" style={{textShadow: '0 0 10px rgba(200, 155, 60, 0.5)'}}>{card.stats.games}</div>
              <div className="text-white/80 font-bold uppercase tracking-wide">Games Played</div>
              {/* Vertical divider */}
              <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-[#C89B3C]/50 to-transparent"></div>
            </div>
            <div>
              <div className="text-4xl font-black text-[#C89B3C] mb-2" style={{textShadow: '0 0 10px rgba(200, 155, 60, 0.5)'}}>{card.stats.wins}</div>
              <div className="text-white/80 font-bold uppercase tracking-wide">Wins</div>
            </div>
          </div>
        )}

        {/* Decorative lines */}
        <div className="absolute top-4 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#C89B3C]/50 to-transparent"></div>
        <div className="absolute bottom-4 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#C89B3C]/50 to-transparent"></div>

        {/* Corner accents */}
        <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#C89B3C]/50"></div>
        <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#C89B3C]/50"></div>
        <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#C89B3C]/50"></div>
        <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#C89B3C]/50"></div>
      </div>
    </div>
  </div>
);

// Narrative Card (AI Summary) - League themed
const NarrativeCard = ({ card }) => (
  <div className="text-center text-white space-y-8 max-w-3xl mx-auto relative">
    <div className="relative z-10">
      <div className="inline-block px-6 py-2 bg-[#C89B3C]/20 border border-[#C89B3C]/50 rounded-sm mb-4">
        <span className="text-[#C89B3C] text-sm font-bold tracking-[0.2em] uppercase">Your Journey</span>
      </div>
      <h2 className="text-4xl md:text-5xl font-black mb-12 uppercase tracking-wide" style={{textShadow: '0 0 20px rgba(200, 155, 60, 0.5)'}}>{card.title}</h2>
    </div>

    <div className="relative group z-10">
      <div className="absolute -inset-1 bg-gradient-to-r from-[#C89B3C] via-[#0397AB] to-[#C89B3C] opacity-75 blur group-hover:opacity-100 transition-opacity"></div>
      <div className="relative bg-gradient-to-b from-[#0a1428] to-[#1b263b] rounded-lg p-12 border-2 border-[#C89B3C]">
        {/* Quote marks decoration */}
        <div className="absolute top-6 left-6 text-[#C89B3C]/30 text-6xl font-serif leading-none">"</div>

        <p className="text-2xl leading-relaxed text-white/90 font-medium px-8 py-4">
          {card.narrative}
        </p>

        <div className="absolute bottom-6 right-6 text-[#C89B3C]/30 text-6xl font-serif leading-none">"</div>

        {/* Decorative lines */}
        <div className="absolute top-4 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#C89B3C]/50 to-transparent"></div>
        <div className="absolute bottom-4 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#C89B3C]/50 to-transparent"></div>

        {/* Side accents */}
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 w-px h-32 bg-gradient-to-b from-transparent via-[#C89B3C]/50 to-transparent"></div>
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 w-px h-32 bg-gradient-to-b from-transparent via-[#C89B3C]/50 to-transparent"></div>
      </div>
    </div>
  </div>
);

// Finale Card (Closing) - League themed
const FinaleCard = ({ card }) => (
  <div className="text-center text-white space-y-12 relative">
    {/* League-style corner accents */}
    <div className="absolute top-0 left-0 w-32 h-32 border-l-4 border-t-4 border-[#C89B3C] opacity-50"></div>
    <div className="absolute top-0 right-0 w-32 h-32 border-r-4 border-t-4 border-[#C89B3C] opacity-50"></div>
    <div className="absolute bottom-0 left-0 w-32 h-32 border-l-4 border-b-4 border-[#C89B3C] opacity-50"></div>
    <div className="absolute bottom-0 right-0 w-32 h-32 border-r-4 border-b-4 border-[#C89B3C] opacity-50"></div>

    {/* Central emblem effect */}
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#C89B3C] rounded-full blur-[200px] opacity-10 animate-pulse"></div>

    <div className="space-y-8 relative z-10">
      <div className="inline-block px-8 py-3 bg-[#C89B3C]/20 border-2 border-[#C89B3C] rounded-sm mb-4 animate-pulse">
        <span className="text-[#C89B3C] text-lg font-black tracking-[0.3em] uppercase">2024 Complete</span>
      </div>

      <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-tight uppercase" style={{textShadow: '0 0 30px rgba(200, 155, 60, 0.8)'}}>
        {card.title}
      </h1>

      <div className="max-w-2xl mx-auto space-y-4">
        <div className="h-px bg-gradient-to-r from-transparent via-[#C89B3C] to-transparent"></div>
        <p className="text-2xl sm:text-3xl text-[#C89B3C] font-bold tracking-wide">{card.message}</p>
        <div className="h-px bg-gradient-to-r from-transparent via-[#C89B3C] to-transparent"></div>
      </div>
    </div>

    <div className="mt-16 relative z-10">
      <div className="relative inline-block group">
        <div className="absolute -inset-1 bg-gradient-to-r from-[#C89B3C] via-[#0397AB] to-[#C89B3C] opacity-75 blur group-hover:opacity-100 transition-opacity"></div>
        <button className="relative bg-gradient-to-b from-[#0a1428] to-[#1b263b] text-white px-12 py-6 border-2 border-[#C89B3C] text-2xl font-black uppercase tracking-wider transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(200,155,60,0.5)]" style={{clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)'}}>
          <span className="drop-shadow-[0_0_10px_rgba(200,155,60,0.8)]">{card.call_to_action}</span>
        </button>
      </div>
    </div>

    <div className="mt-12 text-[#C89B3C]/80 text-xl font-bold tracking-wider uppercase relative z-10">
      See you on the Rift! ⚔️
    </div>

    {/* Decorative hextech corners */}
    <div className="absolute top-8 left-8 text-[#C89B3C]/30 text-6xl">⬡</div>
    <div className="absolute top-8 right-8 text-[#C89B3C]/30 text-6xl">⬡</div>
    <div className="absolute bottom-8 left-8 text-[#C89B3C]/30 text-6xl">⬡</div>
    <div className="absolute bottom-8 right-8 text-[#C89B3C]/30 text-6xl">⬡</div>
  </div>
);

export default YearRecapCarousel;
