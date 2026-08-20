import { useState, useRef } from 'react'

const API = '/api'

export default function UploadPage() {
  const [ticker, setTicker] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const inputRef = useRef()

  async function handleUpload(e) {
    e.preventDefault()
    if (!file || !ticker) { setError('Please select a file and enter a ticker'); return }
    setLoading(true); setError(''); setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('ticker', ticker)
      const res = await fetch(`${API}/data/upload`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data.message)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Upload CSV Data</h1>
        <p>Import historical market data from a CSV file</p>
      </div>

      <div className="card">
        <h2>CSV Format</h2>
        <p style={{color:'#64748b', fontSize:'0.9rem', marginBottom:'0.5rem'}}>
          Your CSV should have these columns (header row required):
        </p>
        <code style={{background:'#0f1117', display:'block', padding:'0.8rem', borderRadius:'6px', fontSize:'0.85rem', color:'#a78bfa'}}>
          date,time,open,high,low,close,volume<br/>
          2024-01-02,09:30:00,474.20,474.85,474.10,474.60,1234567
        </code>
        <p style={{color:'#64748b', fontSize:'0.85rem', marginTop:'0.5rem'}}>
          Alternatively: use a single <code style={{color:'#a78bfa'}}>timestamp</code> column (ISO 8601).
          Times should be in ET (Eastern Time). Timeframe is auto-detected from your data.
        </p>
      </div>

      <div className="card">
        <h2>Upload File</h2>
        {error && <div className="error">{error}</div>}
        {result && <div className="success">✓ {result}</div>}

        <form onSubmit={handleUpload}>
          <div className="form-group" style={{marginBottom:'1rem', maxWidth:'300px'}}>
            <label>Ticker Symbol</label>
            <input value={ticker} onChange={e => setTicker(e.target.value)} placeholder="SPY" required />
          </div>

          <div className="upload-zone" onClick={() => inputRef.current.click()}>
            <input ref={inputRef} type="file" accept=".csv" onChange={e => setFile(e.target.files[0])} />
            <div style={{fontSize:'2rem', marginBottom:'0.5rem'}}>📂</div>
            <div style={{color:'#94a3b8'}}>{file ? file.name : 'Click to select CSV file'}</div>
            {file && <div style={{color:'#64748b', fontSize:'0.8rem', marginTop:'0.3rem'}}>{(file.size/1024).toFixed(1)} KB</div>}
          </div>

          <div className="mt-3">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Uploading...' : 'Upload & Import'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
