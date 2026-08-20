import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const API = '/api'

const TIMEFRAME_OPTIONS = [
  { value: '1Min', label: '1 Min' },
  { value: '3Min', label: '3 Min' },
  { value: '5Min', label: '5 Min' },
  { value: '15Min', label: '15 Min' },
  { value: '30Min', label: '30 Min' },
  { value: '1Hour', label: '1 Hour' },
]

export default function ConfigPage() {
  const navigate = useNavigate()
  const [strategies, setStrategies] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    ticker: 'SPY',
    startDate: '2024-01-01',
    endDate: '2024-06-30',
    strategy: 'orb3',
    timeframe: '3Min',
    orbMinutes: 3,
    rrRatio: 2,
    cutoffTime: '10:30',
    positionSize: 1000
  })

  useEffect(() => {
    fetch(`${API}/strategies`)
      .then(r => r.json())
      .then(setStrategies)
      .catch(() => {})
  }, [])

  const selectedStrategy = strategies.find(s => s.id === form.strategy)

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (selectedStrategy) {
        for (const p of selectedStrategy.params) {
          params[p.key] = p.type === 'number' ? Number(form[p.key]) : form[p.key]
        }
      }

      const res = await fetch(`${API}/backtest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: form.ticker,
          startDate: form.startDate,
          endDate: form.endDate,
          strategy: form.strategy,
          timeframe: form.timeframe,
          params
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Backtest failed')
      navigate(`/results/${data.runId}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>New Backtest</h1>
        <p>Configure and run a strategy backtest</p>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="card">
        <h2>Market Data</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Ticker Symbol</label>
              <input name="ticker" value={form.ticker} onChange={handleChange} placeholder="SPY" required />
            </div>
            <div className="form-group">
              <label>Start Date</label>
              <input type="date" name="startDate" value={form.startDate} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input type="date" name="endDate" value={form.endDate} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Strategy</label>
              <select name="strategy" value={form.strategy} onChange={handleChange}>
                {strategies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Chart Timeframe</label>
              <select name="timeframe" value={form.timeframe} onChange={handleChange}>
                {TIMEFRAME_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {selectedStrategy && (
            <div className="mt-3">
              <div className="section-title">Strategy Parameters — {selectedStrategy.name}</div>
              <p style={{color:'#64748b', fontSize:'0.85rem', marginBottom:'1rem'}}>{selectedStrategy.description}</p>
              <div className="form-grid">
                {selectedStrategy.params.map(p => (
                  <div key={p.key} className="form-group">
                    <label>{p.label}</label>
                    <input
                      type={p.type}
                      name={p.key}
                      value={form[p.key] ?? p.default}
                      onChange={handleChange}
                      step={p.type === 'number' ? 'any' : undefined}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-3">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Running Backtest...' : 'Run Backtest'}
            </button>
          </div>
        </form>
      </div>

      <div className="card" style={{borderColor:'#2d3148', background:'#13151f'}}>
        <h2>💡 Quick Start</h2>
        <p style={{color:'#64748b', fontSize:'0.9rem', lineHeight:'1.6'}}>
          No Alpaca API key? <a href="/upload" style={{color:'#a78bfa'}}>Upload a CSV file</a> first with columns: 
          <code style={{background:'#0f1117', padding:'0.1rem 0.4rem', borderRadius:'4px', marginLeft:'0.3rem'}}>date, time, open, high, low, close, volume</code>
          <br/>Then come back here and run a backtest — the app will use your uploaded data.
        </p>
      </div>
    </div>
  )
}
