import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';

const HabitsSection = ({ puuid, rank = "GOLD", timeRange = null }) => {
  const [habitsData, setHabitsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchHabits = async () => {
      if (!puuid) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`${API_URL}/api/analytics/habits`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            puuid,
            rank,
            time_range: timeRange
          })
        });

        if (!response.ok) {
          throw new Error('Failed to fetch habits data');
        }

        const data = await response.json();

        if (data.success) {
          setHabitsData(data);
        } else {
          setError(data.error || 'Failed to load habits');
        }
      } catch (err) {
        console.error('Error fetching habits:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHabits();
  }, [puuid, rank, timeRange]);

  if (isLoading) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-700 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
        <div className="text-center text-text-secondary">
          <p className="text-sm">Unable to load habits data</p>
        </div>
      </div>
    );
  }

  if (!habitsData) {
    return null;
  }

  const goodHabits = habitsData.good_habits || [];
  const badHabits = habitsData.bad_habits || [];
  const totalHabits = goodHabits.length + badHabits.length;

  if (totalHabits === 0) {
    return null;
  }

  const strengthColor = (strength) => {
    switch (strength) {
      case 'excellent': return 'text-green-400';
      case 'good': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const severityColor = (severity) => {
    switch (severity) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700">
      <div
        className="p-4 cursor-pointer flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl font-semibold tracking-widest">GH</span>
          <div>
            <h3 className="text-lg font-semibold text-white">Gameplay Habits</h3>
            <p className="text-sm text-text-secondary">
              {goodHabits.length} strengths, {badHabits.length} areas to improve
            </p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Good Habits */}
          {goodHabits.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-green-400 mb-2 flex items-center gap-2">
                <span className="text-xs font-semibold tracking-widest">STR</span>
                Your Strengths
              </h4>
              <div className="space-y-2">
                {goodHabits.map((habit, index) => (
                  <div
                    key={index}
                    className="bg-gray-900/50 rounded-lg p-3 border border-green-900/30"
                  >
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 rounded-full border border-green-500/40 bg-green-500/10 flex items-center justify-center text-xs font-semibold uppercase text-green-300">
                        {String(index + 1).padStart(2, '0')}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-white">{habit.habit}</span>
                          <span className={`text-xs uppercase font-semibold ${strengthColor(habit.strength)}`}>
                            {habit.strength}
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary mt-1">{habit.description}</p>
                        <p className="text-xs text-gray-500 mt-1 italic">{habit.details}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bad Habits */}
          {badHabits.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-2">
                <span className="text-xs font-semibold tracking-widest">ATTN</span>
                Areas to Improve
              </h4>
              <div className="space-y-2">
                {badHabits.map((habit, index) => (
                  <div
                    key={index}
                    className="bg-gray-900/50 rounded-lg p-3 border border-amber-900/30"
                  >
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 rounded-full border border-amber-400/40 bg-amber-400/10 flex items-center justify-center text-xs font-semibold uppercase text-amber-300">
                        {String(index + 1).padStart(2, '0')}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-white">{habit.habit}</span>
                          <span className={`text-xs uppercase font-semibold ${severityColor(habit.severity)}`}>
                            {habit.severity}
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary mt-1">{habit.description}</p>
                        <div className="mt-2 bg-gray-800/50 rounded p-2 border border-gray-700">
                          <p className="text-xs text-blue-300">
                            <span className="font-semibold uppercase">Tip:</span>
                            {habit.recommendation}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="text-center text-xs text-gray-500 pt-2 border-t border-gray-700">
            Based on {habitsData.matches_analyzed} matches analyzed
          </div>
        </div>
      )}
    </div>
  );
};

export default HabitsSection;
