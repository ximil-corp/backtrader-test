import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import ConfigPage from './pages/ConfigPage.jsx'
import ResultsPage from './pages/ResultsPage.jsx'
import HistoryPage from './pages/HistoryPage.jsx'
import UploadPage from './pages/UploadPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <nav className="navbar">
          <span className="brand">📈 Backtest</span>
          <div className="nav-links">
            <NavLink to="/" end className={({isActive}) => isActive ? 'active' : ''}>New Backtest</NavLink>
            <NavLink to="/history" className={({isActive}) => isActive ? 'active' : ''}>History</NavLink>
            <NavLink to="/upload" className={({isActive}) => isActive ? 'active' : ''}>Upload CSV</NavLink>
          </div>
        </nav>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<ConfigPage />} />
            <Route path="/results/:id" element={<ResultsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/upload" element={<UploadPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
