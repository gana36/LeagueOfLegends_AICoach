import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const lookupPlayer = async (gameName, tagLine, region = 'americas') => {
  const response = await api.post('/api/player/lookup', {
    game_name: gameName,
    tag_line: tagLine,
    region,
  })
  return response.data
}

export const getMatchHistory = async (puuid, matchCount = 20) => {
  const response = await api.post('/api/matches/history', {
    puuid,
    match_count: matchCount,
  })
  return response.data
}

export const generateYearRecap = async (puuid, matchCount = 100) => {
  const response = await api.post('/api/analysis/year-recap', {
    puuid,
    match_count: matchCount,
  })
  return response.data
}

export const generateInsights = async (puuid, matchCount = 50) => {
  const response = await api.post('/api/analysis/insights', {
    puuid,
    match_count: matchCount,
  })
  return response.data
}

export const analyzeStrengthsWeaknesses = async (puuid, matchCount = 50) => {
  const response = await api.post('/api/analysis/strengths-weaknesses', {
    puuid,
    match_count: matchCount,
  })
  return response.data
}

export default api
