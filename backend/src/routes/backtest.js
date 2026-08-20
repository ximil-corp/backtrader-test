const router = require('express').Router();
const { pool } = require('../db');
const { getMarketData } = require('../market-data');
const { runBacktest } = require('../engine');
const { aggregateCandles } = require('../utils/aggregateCandles');

const VALID_TIMEFRAMES = ['1Min', '3Min', '5Min', '15Min', '30Min', '1Hour'];

router.post('/', async (req, res) => {
  try {
    const { ticker, startDate, endDate, strategy, params = {}, timeframe = '3Min' } = req.body;
    if (!ticker || !startDate || !endDate || !strategy) {
      return res.status(400).json({ error: 'Missing required fields: ticker, startDate, endDate, strategy' });
    }

    const resolvedTimeframe = VALID_TIMEFRAMES.includes(timeframe) ? timeframe : '3Min';

    // Always fetch 1-min data from DB
    const candles1Min = await getMarketData(ticker.toUpperCase(), startDate, endDate, '1Min');
    if (!candles1Min.length) {
      return res.status(404).json({ error: 'No market data found for the given ticker and date range' });
    }

    // Aggregate to requested timeframe
    const candles = resolvedTimeframe === '1Min'
      ? candles1Min
      : aggregateCandles(candles1Min, resolvedTimeframe);

    console.log(`[backtest] ${ticker} ${resolvedTimeframe}: ${candles1Min.length} 1-min bars → ${candles.length} ${resolvedTimeframe} bars`);

    // Run backtest
    const { summary, equityCurve, trades } = runBacktest(candles, strategy, params);

    // Save to DB (include timeframe in params for reference)
    const runResult = await pool.query(
      `INSERT INTO backtest_runs (ticker, strategy, params, start_date, end_date)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [ticker.toUpperCase(), strategy, JSON.stringify({ ...params, timeframe: resolvedTimeframe }), startDate, endDate]
    );
    const runId = runResult.rows[0].id;

    await pool.query(
      `INSERT INTO backtest_results (run_id, summary_stats, equity_curve, trades)
       VALUES ($1,$2,$3,$4)`,
      [runId, JSON.stringify({ ...summary, timeframe: resolvedTimeframe }), JSON.stringify(equityCurve), JSON.stringify(trades)]
    );

    res.json({ runId, summary: { ...summary, timeframe: resolvedTimeframe }, equityCurve, trades, candles });
  } catch (err) {
    console.error('Backtest error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
