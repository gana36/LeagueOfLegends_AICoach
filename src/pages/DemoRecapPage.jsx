import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Download, Share2, Loader2 } from 'lucide-react'
import axios from 'axios'
import StatsCard from '../components/StatsCard'
import ChampionGrid from '../components/ChampionGrid'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function DemoRecapPage() {
  const [loading, setLoading] = useState(true)
  const [playerData, setPlayerData] = useState(null)
  const [recapData, setRecapData] = useState(null)

  useEffect(() => {
    loadDemoData()
  }, [])

  const loadDemoData = async () => {
    try {
      setLoading(true)

      const [playerRes, recapRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/demo/player`),
        axios.get(`${API_BASE_URL}/api/demo/year-recap`)
      ])

      setPlayerData(playerRes.data)
      setRecapData(recapRes.data)
    } catch (err) {
      console.error('Error loading demo data:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-xl text-gray-300">Loading demo...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <Link
            to="/"
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </Link>

          <div className="bg-yellow-500/20 border border-yellow-500/50 px-4 py-2 rounded-lg">
            <span className="text-yellow-400 font-semibold">DEMO MODE</span>
          </div>

          <div className="flex gap-3">
            <button className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors">
              <Share2 className="w-4 h-4" />
              Share
            </button>
            <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors">
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-2">
            {playerData?.gameName}
            <span className="text-gray-500">#{playerData?.tagLine}</span>
          </h1>
          <p className="text-gray-400">Your 2024 Rift Rewind</p>
        </motion.div>

        {recapData && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 backdrop-blur-sm rounded-2xl p-8 border border-gray-700 mb-8"
            >
              <h2 className="text-2xl font-semibold mb-4">Your Story</h2>
              <div className="prose prose-invert max-w-none">
                <p className="text-lg text-gray-200 leading-relaxed whitespace-pre-line">
                  {recapData.narrative}
                </p>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatsCard
                title="Games Played"
                value={recapData.stats.games_played}
                subtitle="Total matches"
              />
              <StatsCard
                title="Win Rate"
                value={`${recapData.stats.win_rate.toFixed(1)}%`}
                subtitle={`${recapData.stats.wins}W / ${recapData.stats.losses}L`}
              />
              <StatsCard
                title="Average KDA"
                value={recapData.stats.avg_kda.toFixed(2)}
                subtitle={`${recapData.stats.avg_kills.toFixed(1)} / ${recapData.stats.avg_deaths.toFixed(1)} / ${recapData.stats.avg_assists.toFixed(1)}`}
              />
              <StatsCard
                title="Total Kills"
                value={recapData.stats.total_kills}
                subtitle={`${recapData.stats.total_assists} assists`}
              />
            </div>

            {recapData.highlights && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700 mb-8"
              >
                <h2 className="text-2xl font-semibold mb-6">Highlights</h2>

                {recapData.highlights.best_game && (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-blue-400 mb-2">
                      Best Performance
                    </h3>
                    <p className="text-gray-300">
                      {recapData.highlights.best_game.champion} -{' '}
                      {recapData.highlights.best_game.kills} /{' '}
                      {recapData.highlights.best_game.deaths} /{' '}
                      {recapData.highlights.best_game.assists} (KDA:{' '}
                      {recapData.highlights.best_game.kda.toFixed(2)})
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Pentakills</p>
                    <p className="text-3xl font-bold text-yellow-400">
                      {recapData.highlights.pentakills || 0}
                    </p>
                  </div>
                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Highest Damage</p>
                    <p className="text-2xl font-bold text-red-400">
                      {(recapData.highlights.highest_damage / 1000).toFixed(1)}k
                    </p>
                  </div>
                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Main Role</p>
                    <p className="text-2xl font-bold text-green-400">
                      {recapData.stats.main_role}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700"
            >
              <h2 className="text-2xl font-semibold mb-6">Top Champions</h2>
              <ChampionGrid champions={recapData.stats.top_champions} />
            </motion.div>

            <div className="mt-8 text-center">
              <Link
                to="/demo/analysis"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-8 py-4 rounded-lg font-semibold transition-all transform hover:scale-105"
              >
                View Detailed Analysis
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
