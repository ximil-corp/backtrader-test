const router = require('express').Router();
const { pool } = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.id, r.ticker, r.strategy, r.params,
              r.start_date::text as start_date, r.end_date::text as end_date,
              r.created_at,
              res.summary_stats
       FROM backtest_runs r
       LEFT JOIN backtest_results res ON res.run_id = r.id
       ORDER BY r.created_at DESC
       LIMIT 100`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.id, r.ticker, r.strategy, r.params,
              r.start_date::text as start_date, r.end_date::text as end_date,
              r.created_at,
              res.summary_stats, res.equity_curve, res.trades
       FROM backtest_runs r
       LEFT JOIN backtest_results res ON res.run_id = r.id
       WHERE r.id=$1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    
    const run = result.rows[0];
    const candleResult = await pool.query(
      `SELECT timestamp, open, high, low, close, volume FROM market_data
       WHERE ticker=$1 AND timeframe='1Min'
       AND timestamp >= $2 AND timestamp <= ($3::date + interval '1 day')
       ORDER BY timestamp ASC`,
      [run.ticker, run.start_date, run.end_date]
    );

    res.json({
      ...run,
      candles: candleResult.rows.map(r => ({
        timestamp: r.timestamp instanceof Date ? r.timestamp.toISOString() : r.timestamp,
        open: parseFloat(r.open),
        high: parseFloat(r.high),
        low: parseFloat(r.low),
        close: parseFloat(r.close),
        volume: parseInt(r.volume)
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
