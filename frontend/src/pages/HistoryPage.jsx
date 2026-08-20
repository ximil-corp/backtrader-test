import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const API = '/api'

export default function HistoryPage() {
  const navigate = useNavigate()
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/results`)
      .then(r => r.json())
      .then(d => { setRuns(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading">Loading history...</div>

  return (
    <div>
      <div className="page-header">
        <h1>Backtest History</h1>
        <p>Click any run to view its results</p>
      </div>

      <div className="card" style={{padding: 0}}>
        {runs.length === 0 && (
          <div style={{padding:'2rem', textAlign:'center', color:'#64748b'}}>
            No backtest runs yet. <a href="/" style={{color:'#a78bfa'}}>Run your first backtest</a>.
          </div>
        )}
        {runs.map(run => {
          const stats = run.summary_stats || {}
          const pnl = stats.totalPnl ?? 0
          return (
            <div key={run.id} className="history-item" onClick={() => navigate(`/results/${run.id}`)}>
              <div>
                <div className="ticker">{run.ticker}</div>
                <div className="meta">
                  {run.strategy?.toUpperCase()} · {run.start_date} → {run.end_date} · {stats.totalTrades ?? 0} trades
                </div>
              </div>
              <div style={{textAlign:'right'}}>
                <div className={`stat-value ${pnl >= 0 ? 'positive' : 'negative'}`} style={{fontSize:'1.2rem'}}>
                  {pnl >= 0 ? '+' : ''}${pnl?.toFixed(2)}
                </div>
                <div className="meta">{stats.winRate?.toFixed(1)}% win rate</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
