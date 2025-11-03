import React from 'react';

const LeftSidebar = ({ playerFilter, setPlayerFilter, eventToggles, setEventToggles }) => {
  const filterOptions = [
    { id: 'solo', label: 'Solo', icon: '●' },
    { id: 'team', label: 'My Team', icon: '▲' },
    { id: 'opponents', label: 'Opponents', icon: '▼' },
    { id: 'all', label: 'All Players', icon: '■' }
  ];

  const eventOptions = [
    { id: 'kills', label: 'Kills/Deaths', icon: '⚔' },
    { id: 'objectives', label: 'Objectives', icon: '🐉' },
    { id: 'wards', label: 'Wards', icon: '👁' },
    { id: 'items', label: 'Items', icon: '🛒' }
  ];

  const handleToggle = (eventId) => {
    setEventToggles(prev => ({
      ...prev,
      [eventId]: !prev[eventId]
    }));
  };

  return (
    <div className="w-[280px] bg-surface h-full flex flex-col overflow-hidden">
      {/* Match Selection Section */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-white font-bold text-base mb-3">Match History</h2>
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          <div className="bg-bg-dark p-3 rounded border-2 border-primary-gold cursor-pointer hover:bg-opacity-80 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center text-white text-xs">
                CH
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-team-blue font-semibold text-sm">Victory</span>
                  <span className="text-text-secondary text-xs">5/2/8</span>
                </div>
                <div className="text-text-secondary text-xs">2 hours ago</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Player Filter Section */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-white font-semibold text-sm mb-3">Display Players</h3>
        <div className="space-y-2">
          {filterOptions.map(option => (
            <label 
              key={option.id}
              className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-all h-10 ${
                playerFilter === option.id 
                  ? 'bg-primary-gold bg-opacity-20 border border-primary-gold' 
                  : 'hover:bg-gray-700 hover:bg-opacity-30'
              }`}
            >
              <input
                type="radio"
                name="playerFilter"
                value={option.id}
                checked={playerFilter === option.id}
                onChange={(e) => setPlayerFilter(e.target.value)}
                className="hidden"
              />
              <span className={`text-lg ${playerFilter === option.id ? 'text-primary-gold' : 'text-text-secondary'}`}>
                {option.icon}
              </span>
              <span className={`text-sm ${playerFilter === option.id ? 'text-white font-medium' : 'text-text-secondary'}`}>
                {option.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Event Overlays Section */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-white font-semibold text-sm mb-3">Show Events</h3>
        <div className="space-y-2">
          {eventOptions.map(option => (
            <label 
              key={option.id}
              className="flex items-center justify-between p-2 rounded cursor-pointer hover:bg-gray-700 hover:bg-opacity-30 transition-all h-9"
            >
              <div className="flex items-center gap-3">
                <span className="text-base">{option.icon}</span>
                <span className="text-sm text-text-secondary">{option.label}</span>
              </div>
              <div 
                onClick={() => handleToggle(option.id)}
                className={`w-11 h-6 rounded-full transition-all cursor-pointer ${
                  eventToggles[option.id] ? 'bg-primary-gold' : 'bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full mt-0.5 transition-transform ${
                  eventToggles[option.id] ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Heatmap Options */}
      <div className="p-4">
        <h3 className="text-white font-semibold text-sm mb-3">Trails & Heatmaps</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Movement Trail Duration</label>
            <select className="w-full bg-bg-dark text-white text-sm p-2 rounded border border-gray-600 focus:border-primary-gold focus:outline-none">
              <option>30 seconds</option>
              <option>1 minute</option>
              <option>All</option>
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-primary-gold" />
            <span className="text-sm text-text-secondary">Death locations</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-primary-gold" />
            <span className="text-sm text-text-secondary">Combat zones</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default LeftSidebar;
