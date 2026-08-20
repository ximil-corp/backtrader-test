// 3-Minute Opening Range Breakout Strategy
// State is maintained per-day

function init(params) {
  return {
    orbMinutes: params.orbMinutes || 3,
    rrRatio: params.rrRatio || 2,
    cutoffTime: params.cutoffTime || '10:30',
    positionSize: params.positionSize || 1000,
    // runtime state
    orbHigh: null,
    orbLow: null,
    orbComplete: false,
    tradedToday: false,
    currentDate: null,
    orbCandleCount: 0,
    firstCandleTime: null
  };
}

function parseTimeET(timestamp) {
  // timestamp is ISO string, convert to ET
  const date = new Date(timestamp);
  // ET offset: -5 (EST) or -4 (EDT). We'll use the date's actual offset.
  // Simple approach: convert to ET by formatting
  const etStr = date.toLocaleString('en-US', { timeZone: 'America/New_York' });
  const etDate = new Date(etStr);
  return {
    hours: etDate.getHours(),
    minutes: etDate.getMinutes(),
    dateStr: `${etDate.getFullYear()}-${String(etDate.getMonth()+1).padStart(2,'0')}-${String(etDate.getDate()).padStart(2,'0')}`
  };
}

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function onCandle(candle, position, context, state) {
  const { hours, minutes, dateStr } = parseTimeET(candle.timestamp);
  const timeInMinutes = hours * 60 + minutes;
  const marketOpenMinutes = 9 * 60 + 30; // 9:30 AM ET
  const cutoffMinutes = timeToMinutes(state.cutoffTime);

  // Reset on new day
  if (dateStr !== state.currentDate) {
    state.currentDate = dateStr;
    state.orbHigh = null;
    state.orbLow = null;
    state.orbComplete = false;
    state.tradedToday = false;
    state.orbCandleCount = 0;
    state.firstCandleTime = null;
  }

  // Only process during market hours
  if (timeInMinutes < marketOpenMinutes) return { signal: 'hold', state };

  // ORB accumulation phase
  if (!state.orbComplete) {
    if (state.firstCandleTime === null) {
      state.firstCandleTime = timeInMinutes;
    }
    const candlesSinceOpen = Math.floor((timeInMinutes - marketOpenMinutes) / 1); // assuming 1-min bars
    // Count candles in ORB period
    if (timeInMinutes < marketOpenMinutes + state.orbMinutes) {
      // Still in ORB window
      if (state.orbHigh === null || candle.high > state.orbHigh) state.orbHigh = candle.high;
      if (state.orbLow === null || candle.low < state.orbLow) state.orbLow = candle.low;
      return { signal: 'hold', state };
    } else {
      state.orbComplete = true;
    }
  }

  // After ORB is set, look for breakout
  if (!state.tradedToday && !position && timeInMinutes <= cutoffMinutes) {
    if (candle.close > state.orbHigh) {
      state.tradedToday = true;
      const stopLoss = state.orbLow;
      const risk = candle.close - stopLoss;
      const target = candle.close + risk * state.rrRatio;
      const shares = Math.floor(state.positionSize / candle.close);
      return {
        signal: 'buy',
        entryPrice: candle.close,
        stopLoss,
        target,
        shares,
        state
      };
    } else if (candle.close < state.orbLow) {
      state.tradedToday = true;
      const stopLoss = state.orbHigh;
      const risk = stopLoss - candle.close;
      const target = candle.close - risk * state.rrRatio;
      const shares = Math.floor(state.positionSize / candle.close);
      return {
        signal: 'sell',
        entryPrice: candle.close,
        stopLoss,
        target,
        shares,
        state
      };
    }
  }

  return { signal: 'hold', state };
}

module.exports = { init, onCandle };
