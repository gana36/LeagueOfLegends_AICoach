import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sparkles, TrendingUp, Trophy, Users } from 'lucide-react'

export default function HomePage() {
  const [gameName, setGameName] = useState('')
  const [tagLine, setTagLine] = useState('')
  const [region, setRegion] = useState('americas')
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    if (gameName && tagLine) {
      navigate(`/recap/${region}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl w-full text-center"
      >
        <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          Rift Rewind
        </h1>
        <p className="text-xl text-gray-300 mb-8">
          Your personalized League of Legends year-end recap
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          <FeatureCard
            icon={<Sparkles className="w-8 h-8" />}
            title="AI-Powered Insights"
            description="Deep analysis using AWS Bedrock"
          />
          <FeatureCard
            icon={<TrendingUp className="w-8 h-8" />}
            title="Performance Trends"
            description="Track your growth over time"
          />
          <FeatureCard
            icon={<Trophy className="w-8 h-8" />}
            title="Highlight Moments"
            description="Celebrate your best games"
          />
          <FeatureCard
            icon={<Users className="w-8 h-8" />}
            title="Shareable Recaps"
            description="Show off your journey"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700"
        >
          <h2 className="text-2xl font-semibold mb-6">Enter Your Riot ID</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Game Name"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                className="px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
              <input
                type="text"
                placeholder="Tag Line (e.g., NA1)"
                value={tagLine}
                onChange={(e) => setTagLine(e.target.value)}
                className="px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>

            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="americas">Americas</option>
              <option value="europe">Europe</option>
              <option value="asia">Asia</option>
              <option value="sea">SEA</option>
            </select>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
            >
              Generate My Recap
            </button>
          </form>

          <p className="text-sm text-gray-400 mt-4">
            Powered by AWS Bedrock and Riot Games API
          </p>

          <div className="mt-6 pt-6 border-t border-gray-700">
            <p className="text-sm text-gray-400 mb-3">Or try our demo mode:</p>
            <button
              onClick={() => navigate('/demo')}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
            >
              View Demo Recap
            </button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}

function FeatureCard({ icon, title, description }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700 card-hover"
    >
      <div className="text-blue-400 mb-3 flex justify-center">{icon}</div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-gray-400">{description}</p>
    </motion.div>
  )
}
