import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader2, TrendingUp, TrendingDown } from 'lucide-react'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function DemoAnalysisPage() {
  const [loading, setLoading] = useState(true)
  const [playerData, setPlayerData] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [insights, setInsights] = useState(null)

  useEffect(() => {
    loadDemoData()
  }, [])

  const loadDemoData = async () => {
    try {
      setLoading(true)

      const [playerRes, analysisRes, insightsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/demo/player`),
        axios.get(`${API_BASE_URL}/api/demo/strengths-weaknesses`),
        axios.get(`${API_BASE_URL}/api/demo/insights`)
      ])

      setPlayerData(playerRes.data)
      setAnalysis(analysisRes.data)
      setInsights(insightsRes.data)
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
          <p className="text-xl text-gray-300">Loading demo analysis...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <Link
            to="/demo"
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Recap
          </Link>

          <div className="bg-yellow-500/20 border border-yellow-500/50 px-4 py-2 rounded-lg">
            <span className="text-yellow-400 font-semibold">DEMO MODE</span>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-2">
            Performance Analysis
          </h1>
          <p className="text-gray-400">
            {playerData?.gameName}#{playerData?.tagLine}
          </p>
        </motion.div>

        {insights && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 backdrop-blur-sm rounded-2xl p-8 border border-gray-700 mb-8"
          >
            <h2 className="text-2xl font-semibold mb-4">Playstyle Analysis</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-lg text-gray-200 leading-relaxed whitespace-pre-line">
                {insights.playstyle_analysis}
              </p>
            </div>
          </motion.div>
        )}

        {analysis && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-green-900/20 backdrop-blur-sm rounded-2xl p-8 border border-green-700/50"
              >
                <div className="flex items-center gap-3 mb-6">
                  <TrendingUp className="w-8 h-8 text-green-400" />
                  <h2 className="text-2xl font-semibold">Strengths</h2>
                </div>
                <ul className="space-y-3">
                  {analysis.strengths.map((strength, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-3 text-gray-200"
                    >
                      <span className="text-green-400 mt-1">✓</span>
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-orange-900/20 backdrop-blur-sm rounded-2xl p-8 border border-orange-700/50"
              >
                <div className="flex items-center gap-3 mb-6">
                  <TrendingDown className="w-8 h-8 text-orange-400" />
                  <h2 className="text-2xl font-semibold">Areas to Improve</h2>
                </div>
                <ul className="space-y-3">
                  {analysis.weaknesses.map((weakness, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-3 text-gray-200"
                    >
                      <span className="text-orange-400 mt-1">→</span>
                      <span>{weakness}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700 mb-8"
            >
              <h2 className="text-2xl font-semibold mb-6">Improvement Tips</h2>
              <div className="space-y-4">
                {analysis.improvement_tips.map((tip, index) => (
                  <div
                    key={index}
                    className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      <p className="text-gray-200">{tip}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}

        {insights?.champion_stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700"
          >
            <h2 className="text-2xl font-semibold mb-6">Champion Performance</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">
                      Champion
                    </th>
                    <th className="text-center py-3 px-4 text-gray-400 font-medium">
                      Games
                    </th>
                    <th className="text-center py-3 px-4 text-gray-400 font-medium">
                      Win Rate
                    </th>
                    <th className="text-center py-3 px-4 text-gray-400 font-medium">
                      Avg KDA
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {insights.champion_stats.map((champ, index) => (
                    <tr
                      key={index}
                      className="border-b border-gray-700/50 hover:bg-gray-700/20 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium">{champ.champion}</td>
                      <td className="py-3 px-4 text-center text-gray-300">
                        {champ.games}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={
                            champ.win_rate >= 50
                              ? 'text-green-400'
                              : 'text-red-400'
                          }
                        >
                          {champ.win_rate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-gray-300">
                        {champ.avg_kda.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
