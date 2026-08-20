const orb3 = require('./strategies/orb3');

const STRATEGY_MAP = {
  orb3
};

function runBacktest(candles, strategyId, params) {
  const strategy = STRATEGY_MAP[strategyId];
  if (!strategy) throw new Error(`Unknown strategy: ${strategyId}`);

  let state = strategy.init(params);
  let position = null; // { direction, entryPrice, stopLoss, target, shares, entryTime }
  const trades = [];
  let equity = 0;
  const equityCurve = [{ time: candles[0]?.timestamp, equity: 0 }];

  for (const candle of candles) {
    // Check if position should be closed (hit target or stop)
    if (position) {
      let closed = false;
      let exitPrice = candle.close;
      let exitReason = '';

      if (position.direction === 'long') {
        if (candle.low <= position.stopLoss) {
          exitPrice = position.stopLoss;
          exitReason = 'stop';
          closed = true;
        } else if (candle.high >= position.target) {
          exitPrice = position.target;
          exitReason = 'target';
          closed = true;
        }
      } else if (position.direction === 'short') {
        if (candle.high >= position.stopLoss) {
          exitPrice = position.stopLoss;
          exitReason = 'stop';
          closed = true;
        } else if (candle.low <= position.target) {
          exitPrice = position.target;
          exitReason = 'target';
          closed = true;
        }
      }

      if (closed) {
        const pnl = position.direction === 'long'
          ? (exitPrice - position.entryPrice) * position.shares
          : (position.entryPrice - exitPrice) * position.shares;
        const risk = position.direction === 'long'
          ? (position.entryPrice - position.stopLoss) * position.shares
          : (position.stopLoss - position.entryPrice) * position.shares;
        const rMultiple = risk > 0 ? pnl / risk : 0;

        equity += pnl;
        trades.push({
          date: candle.timestamp.split('T')[0],
          direction: position.direction,
          entryPrice: position.entryPrice,
          exitPrice,
          shares: position.shares,
          pnl: Math.round(pnl * 100) / 100,
          rMultiple: Math.round(rMultiple * 100) / 100,
          exitReason,
          entryTime: position.entryTime,
          exitTime: candle.timestamp
        });
        equityCurve.push({ time: candle.timestamp, equity: Math.round(equity * 100) / 100 });
        position = null;
      }
    }

    // Get signal from strategy
    const result = strategy.onCandle(candle, position, {}, state);
    state = result.state;

    if (!position && result.signal === 'buy') {
      position = {
        direction: 'long',
        entryPrice: result.entryPrice,
        stopLoss: result.stopLoss,
        target: result.target,
        shares: result.shares,
        entryTime: candle.timestamp
      };
    } else if (!position && result.signal === 'sell') {
      position = {
        direction: 'short',
        entryPrice: result.entryPrice,
        stopLoss: result.stopLoss,
        target: result.target,
        shares: result.shares,
        entryTime: candle.timestamp
      };
    }
  }

  // Close any open position at last candle
  if (position && candles.length > 0) {
    const lastCandle = candles[candles.length - 1];
    const exitPrice = lastCandle.close;
    const pnl = position.direction === 'long'
      ? (exitPrice - position.entryPrice) * position.shares
      : (position.entryPrice - exitPrice) * position.shares;
    const risk = position.direction === 'long'
      ? (position.entryPrice - position.stopLoss) * position.shares
      : (position.stopLoss - position.entryPrice) * position.shares;
    const rMultiple = risk > 0 ? pnl / risk : 0;
    equity += pnl;
    trades.push({
      date: lastCandle.timestamp.split('T')[0],
      direction: position.direction,
      entryPrice: position.entryPrice,
      exitPrice,
      shares: position.shares,
      pnl: Math.round(pnl * 100) / 100,
      rMultiple: Math.round(rMultiple * 100) / 100,
      exitReason: 'eod',
      entryTime: position.entryTime,
      exitTime: lastCandle.timestamp
    });
    equityCurve.push({ time: lastCandle.timestamp, equity: Math.round(equity * 100) / 100 });
  }

  // Calculate summary stats
  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl < 0);
  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const winRate = trades.length > 0 ? wins.length / trades.length : 0;
  const grossWin = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0;
  const avgWin = wins.length > 0 ? grossWin / wins.length : 0;
  const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;
  const avgR = trades.length > 0 ? trades.reduce((s, t) => s + t.rMultiple, 0) / trades.length : 0;

  // Max drawdown from equity curve
  let peak = 0;
  let maxDrawdown = 0;
  for (const point of equityCurve) {
    if (point.equity > peak) peak = point.equity;
    const dd = peak - point.equity;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  return {
    summary: {
      totalPnl: Math.round(totalPnl * 100) / 100,
      winRate: Math.round(winRate * 10000) / 100,
      profitFactor: Math.round(profitFactor * 100) / 100,
      maxDrawdown: Math.round(maxDrawdown * 100) / 100,
      totalTrades: trades.length,
      avgWin: Math.round(avgWin * 100) / 100,
      avgLoss: Math.round(avgLoss * 100) / 100,
      avgR: Math.round(avgR * 100) / 100
    },
    equityCurve,
    trades
  };
}

module.exports = { runBacktest };
