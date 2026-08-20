const { pool } = require('../db');

async function fetchFromAlpaca(ticker, startDate, endDate, timeframe = '1Min') {
  const apiKey = process.env.ALPACA_API_KEY;
  const apiSecret = process.env.ALPACA_API_SECRET;
  if (!apiKey || !apiSecret) throw new Error('Alpaca API keys not configured');

  const { default: fetch } = await import('node-fetch');
  const url = `https://data.alpaca.markets/v2/stocks/${ticker}/bars?timeframe=${timeframe}&start=${startDate}&end=${endDate}&limit=10000&adjustment=raw&feed=iex`;
  
  const response = await fetch(url, {
    headers: {
      'APCA-API-KEY-ID': apiKey,
      'APCA-API-SECRET-KEY': apiSecret
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Alpaca error ${response.status}: ${body}`);
  }

  const data = await response.json();
  return (data.bars || []).map(bar => ({
    ticker,
    timeframe,
    timestamp: bar.t,
    open: bar.o,
    high: bar.h,
    low: bar.l,
    close: bar.c,
    volume: bar.v
  }));
}

async function getCachedData(ticker, timeframe, startDate, endDate) {
  const result = await pool.query(
    `SELECT * FROM market_data 
     WHERE ticker=$1 AND timeframe=$2 AND timestamp >= $3 AND timestamp <= $4
     ORDER BY timestamp ASC`,
    [ticker, timeframe, startDate, endDate]
  );
  return result.rows;
}

async function cacheData(bars) {
  if (!bars.length) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Batch insert: 500 rows per statement
    const BATCH = 500;
    for (let i = 0; i < bars.length; i += BATCH) {
      const chunk = bars.slice(i, i + BATCH);
      const values = [];
      const params = [];
      chunk.forEach((bar, idx) => {
        const off = idx * 8;
        values.push(`($${off+1},$${off+2},$${off+3},$${off+4},$${off+5},$${off+6},$${off+7},$${off+8})`);
        params.push(bar.ticker, bar.timeframe, bar.timestamp, bar.open, bar.high, bar.low, bar.close, bar.volume);
      });
      await client.query(
        `INSERT INTO market_data (ticker, timeframe, timestamp, open, high, low, close, volume)
         VALUES ${values.join(',')}
         ON CONFLICT (ticker, timeframe, timestamp) DO NOTHING`,
        params
      );
    }
    await client.query('COMMIT');
    console.log(`Cached ${bars.length} bars`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getMarketData(ticker, startDate, endDate, timeframe = '1Min') {
  const cached = await getCachedData(ticker, timeframe, startDate, endDate + 'T23:59:59Z');
  if (cached.length > 0) {
    console.log(`Using ${cached.length} cached bars for ${ticker}`);
    return cached.map(r => ({
      ticker: r.ticker,
      timeframe: r.timeframe,
      timestamp: r.timestamp instanceof Date ? r.timestamp.toISOString() : r.timestamp,
      open: parseFloat(r.open),
      high: parseFloat(r.high),
      low: parseFloat(r.low),
      close: parseFloat(r.close),
      volume: parseInt(r.volume)
    }));
  }

  console.log(`Fetching ${ticker} from Alpaca...`);
  const bars = await fetchFromAlpaca(ticker, startDate, endDate, timeframe);
  await cacheData(bars);
  return bars;
}

async function storeCSVData(ticker, timeframe, rows) {
  await cacheData(rows.map(r => ({ ...r, ticker, timeframe })));
}

module.exports = { getMarketData, storeCSVData };
