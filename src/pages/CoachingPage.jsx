import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Send, Loader2, Sparkles, Bot, User } from 'lucide-react'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const EXAMPLE_QUESTIONS = [
  "Why am I stuck in my current rank?",
  "What should I focus on to improve?",
  "Analyze my recent performance",
  "Compare my stats to Diamond players",
  "Create a practice plan for me"
]

export default function CoachingPage() {
  const { region, gameName, tagLine } = useParams()
  const [loading, setLoading] = useState(false)
  const [playerData, setPlayerData] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [conversationHistory, setConversationHistory] = useState([])
  const messagesEndRef = useRef(null)

  useEffect(() => {
    loadPlayer()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadPlayer = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/player/lookup`, {
        game_name: decodeURIComponent(gameName),
        tag_line: decodeURIComponent(tagLine),
        region
      })
      setPlayerData(response.data)

      // Add welcome message
      setMessages([{
        type: 'agent',
        content: `Welcome, ${response.data.gameName}! I'm your AI coach powered by Amazon Bedrock. I can analyze your match history, identify patterns, and create personalized improvement plans. What would you like to know?`,
        tools: []
      }])
    } catch (err) {
      console.error('Error loading player:', err)
    }
  }

  const sendMessage = async (messageText = null) => {
    const message = messageText || inputMessage
    if (!message.trim() || loading) return

    // Add user message
    const userMessage = {
      type: 'user',
      content: message
    }
    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setLoading(true)

    try {
      const response = await axios.post(`${API_BASE_URL}/api/agent/chat`, {
        puuid: playerData.puuid,
        message: message,
        main_role: 'MIDDLE', // TODO: Get from player stats
        conversation_history: conversationHistory
      })

      // Add agent response
      const agentMessage = {
        type: 'agent',
        content: response.data.response,
        tools: response.data.tools_used || []
      }
      setMessages(prev => [...prev, agentMessage])
      setConversationHistory(response.data.conversation_history || [])
    } catch (err) {
      console.error('Error sending message:', err)
      const errorMessage = {
        type: 'agent',
        content: 'Sorry, I encountered an error. Please try again.',
        tools: []
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleQuickAnalysis = async () => {
    setLoading(true)
    setMessages(prev => [...prev, {
      type: 'user',
      content: 'Run a quick comprehensive analysis'
    }])

    try {
      const response = await axios.post(`${API_BASE_URL}/api/agent/quick-analysis`, {
        puuid: playerData.puuid,
        main_role: 'MIDDLE'
      })

      const agentMessage = {
        type: 'agent',
        content: response.data.response,
        tools: response.data.tools_used || []
      }
      setMessages(prev => [...prev, agentMessage])
    } catch (err) {
      console.error('Error in quick analysis:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <Link
            to={`/recap/${region}/${gameName}/${tagLine}`}
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Recap
          </Link>

          <div className="flex items-center gap-2 bg-blue-600/20 border border-blue-500/50 px-4 py-2 rounded-lg">
            <Bot className="w-5 h-5 text-blue-400" />
            <span className="font-semibold text-blue-400">AI Coach</span>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Sparkles className="w-10 h-10 text-yellow-400" />
            AI Coaching
          </h1>
          <p className="text-gray-400">
            Powered by Amazon Bedrock - Multi-step reasoning for personalized improvement
          </p>
        </motion.div>

        {/* Quick Analysis Button */}
        {!loading && messages.length === 1 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6"
          >
            <button
              onClick={handleQuickAnalysis}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-6 py-4 rounded-lg font-semibold transition-all transform hover:scale-105 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Run Comprehensive Analysis
            </button>
          </motion.div>
        )}

        {/* Chat Container */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 overflow-hidden">
          {/* Messages */}
          <div className="h-[500px] overflow-y-auto p-6 space-y-4">
            <AnimatePresence>
              {messages.map((message, index) => (
                <MessageBubble key={index} message={message} />
              ))}
            </AnimatePresence>

            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3 text-gray-400"
              >
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>AI Coach is analyzing...</span>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Example Questions */}
          {messages.length <= 2 && !loading && (
            <div className="px-6 py-4 border-t border-gray-700 bg-gray-800/30">
              <p className="text-sm text-gray-400 mb-3">Try asking:</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_QUESTIONS.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => sendMessage(question)}
                    className="text-sm bg-gray-700/50 hover:bg-gray-700 px-3 py-2 rounded-lg transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-6 border-t border-gray-700 bg-gray-800/30">
            <div className="flex gap-3">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ask your AI coach anything..."
                className="flex-1 px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                disabled={loading}
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !inputMessage.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message }) {
  const isUser = message.type === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
        isUser ? 'bg-blue-600' : 'bg-purple-600'
      }`}>
        {isUser ? <User className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
      </div>

      {/* Message Content */}
      <div className={`flex-1 ${isUser ? 'flex justify-end' : ''}`}>
        <div className={`max-w-[80%] ${
          isUser
            ? 'bg-blue-600/20 border-blue-500/50'
            : 'bg-gray-700/50 border-gray-600'
        } border rounded-2xl p-4`}>
          <p className="text-gray-100 whitespace-pre-wrap leading-relaxed">
            {message.content}
          </p>

          {/* Tool Usage */}
          {message.tools && message.tools.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-600">
              <p className="text-xs text-gray-400 mb-2">Tools used:</p>
              <div className="flex flex-wrap gap-2">
                {message.tools.map((tool, index) => (
                  <span
                    key={index}
                    className="text-xs bg-purple-600/20 border border-purple-500/50 px-2 py-1 rounded"
                  >
                    {tool.name.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
