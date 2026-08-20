const express = require('express');
const cors = require('cors');
const { initDb } = require('./db');

const strategiesRouter = require('./routes/strategies');
const backtestRouter = require('./routes/backtest');
const resultsRouter = require('./routes/results');
const dataRouter = require('./routes/data');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/strategies', strategiesRouter);
app.use('/api/backtest', backtestRouter);
app.use('/api/results', resultsRouter);
app.use('/api/data', dataRouter);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 8080;

async function start() {
  await initDb();
  app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
}

start().catch(err => {
  console.error('Startup error:', err);
  process.exit(1);
});
