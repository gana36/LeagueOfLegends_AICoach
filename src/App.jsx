import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import RecapPage from './pages/RecapPage'
import AnalysisPage from './pages/AnalysisPage'
import CoachingPage from './pages/CoachingPage'
import DemoRecapPage from './pages/DemoRecapPage'
import DemoAnalysisPage from './pages/DemoAnalysisPage'

function App() {
  return (
    <Router>
      <div className="min-h-screen gradient-bg">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/recap/:region/:gameName/:tagLine" element={<RecapPage />} />
          <Route path="/analysis/:region/:gameName/:tagLine" element={<AnalysisPage />} />
          <Route path="/coaching/:region/:gameName/:tagLine" element={<CoachingPage />} />
          <Route path="/demo" element={<DemoRecapPage />} />
          <Route path="/demo/analysis" element={<DemoAnalysisPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
