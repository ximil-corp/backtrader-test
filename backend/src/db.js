const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS backtest_runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticker TEXT NOT NULL,
        strategy TEXT NOT NULL,
        params JSONB,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS backtest_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        run_id UUID REFERENCES backtest_runs(id) ON DELETE CASCADE,
        summary_stats JSONB,
        equity_curve JSONB,
        trades JSONB
      );

      CREATE TABLE IF NOT EXISTS market_data (
        id BIGSERIAL PRIMARY KEY,
        ticker TEXT NOT NULL,
        timeframe TEXT NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL,
        open NUMERIC,
        high NUMERIC,
        low NUMERIC,
        close NUMERIC,
        volume BIGINT,
        UNIQUE(ticker, timeframe, timestamp)
      );
    `);
    console.log('Database initialized');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDb };
