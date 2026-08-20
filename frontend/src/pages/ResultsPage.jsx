import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import CandleChart from '../components/CandleChart.jsx'

const API = '/api'

export default function ResultsPage() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`${API}/results/${id}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [id])

  if (loading) return <div className="loading">Loading results...</div>
  if (error) return <div className="error">{error}</div>
  if (!data) return null

  const stats = data.summary_stats || {}
  const equityCurve = data.equity_curve || []
  const trades = data.trades || []
  const candles = data.candles || []
  const timeframe = stats.timeframe || (data.params && JSON.parse(typeof data.params === 'string' ? data.params : JSON.stringify(data.params)).timeframe) || '—'

  const pnlClass = stats.totalPnl >= 0 ? 'positive' : 'negative'

  const equityData = equityCurve.map(p => ({
    time: new Date(p.time).toLocaleDateString(),
    equity: p.equity
  }))

  return (
    <div>
      <div className="page-header" style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
        <div>
          <h1>{data.ticker} — {data.strategy?.toUpperCase()}</h1>
          <p>{data.start_date} to {data.end_date}</p>
        </div>
        <Link to="/" className="btn btn-primary" style={{textDecoration:'none'}}>New Backtest</Link>
      </div>

      {/* Summary Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total P&amp;L</div>
          <div className={`stat-value ${pnlClass}`}>${stats.totalPnl?.toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Win Rate</div>
          <div className={`stat-value ${stats.winRate >= 50 ? 'positive' : 'negative'}`}>{stats.winRate?.toFixed(1)}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Profit Factor</div>
          <div className={`stat-value ${stats.profitFactor >= 1 ? 'positive' : 'negative'}`}>{stats.profitFactor?.toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Max Drawdown</div>
          <div className="stat-value negative">${stats.maxDrawdown?.toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Trades</div>
          <div className="stat-value neutral">{stats.totalTrades}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Win</div>
          <div className="stat-value positive">${stats.avgWin?.toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Loss</div>
          <div className="stat-value negative">${stats.avgLoss?.toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg R</div>
          <div className={`stat-value ${stats.avgR >= 0 ? 'positive' : 'negative'}`}>{stats.avgR?.toFixed(2)}R</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Chart Timeframe</div>
          <div className="stat-value neutral">{timeframe}</div>
        </div>
      </div>

      {/* Equity Curve */}
      <div className="card">
        <h2>Equity Curve</h2>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={equityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3148" />
              <XAxis dataKey="time" tick={{fill:'#64748b', fontSize:11}} />
              <YAxis tick={{fill:'#64748b', fontSize:11}} tickFormatter={v => `$${v}`} />
              <Tooltip
                contentStyle={{background:'#1a1d29', border:'1px solid #2d3148', color:'#e2e8f0'}}
                formatter={v => [`$${v.toFixed(2)}`, 'Equity']}
              />
              <Line type="monotone" dataKey="equity" stroke="#7c3aed" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Candlestick Chart */}
      {candles.length > 0 && (
        <div className="card">
          <h2>Price Chart</h2>
          <CandleChart candles={candles} trades={trades} />
        </div>
      )}

      {/* Trade Log */}
      <div className="card">
        <h2>Trade Log ({trades.length} trades)</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Direction</th>
                <th>Entry</th>
                <th>Exit</th>
                <th>Shares</th>
                <th>P&amp;L</th>
                <th>R Multiple</th>
                <th>Exit Reason</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t, i) => (
                <tr key={i}>
                  <td>{t.date}</td>
                  <td><span className={`badge badge-${t.direction === 'long' ? 'long' : 'short'}`}>{t.direction?.toUpperCase()}</span></td>
                  <td>${t.entryPrice?.toFixed(2)}</td>
                  <td>${t.exitPrice?.toFixed(2)}</td>
                  <td>{t.shares}</td>
                  <td className={t.pnl >= 0 ? 'positive' : 'negative'}>${t.pnl?.toFixed(2)}</td>
                  <td className={t.rMultiple >= 0 ? 'positive' : 'negative'}>{t.rMultiple?.toFixed(2)}R</td>
                  <td style={{color:'#64748b'}}>{t.exitReason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
